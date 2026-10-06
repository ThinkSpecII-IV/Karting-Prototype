/**
 * src/network/RoomManager.ts
 *
 * Manages the lifecycle of game rooms: creation, joining, leaving, and
 * PIN-to-room mapping. Also owns the per-IP rate-limit counters for join
 * attempts.
 *
 * DESIGN:
 *   - All state is held in plain Maps (no DB, no external store).
 *   - PIN generation retries on collision (collision probability is negligible
 *     below ~800 concurrent rooms but is handled correctly).
 *   - Rate-limit buckets reset on a 60-second rolling window.
 *   - RoomManager is a plain class — it has no Socket.IO dependency.
 *     SocketServer calls into it and handles all emit() calls.
 *
 * INVARIANT (INV-02/03): RoomManager never stores position/velocity data.
 *   Vehicle states live in ServerLoop and are keyed by roomId.
 */

import { randomUUID } from "node:crypto";
import type {
  RoomInfo,
  PlayerInfo,
  RoomSettings,
  RacePhase,
} from "../shared/types.js";
import {
  PIN_MIN,
  PIN_MAX,
  MAX_PLAYERS,
  JOIN_RATE_LIMIT,
} from "../shared/constants.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type RoomCreateResult =
  | { ok: true; room: RoomInfo }
  | { ok: false; reason: string };

export type RoomJoinResult =
  | { ok: true; room: RoomInfo }
  | {
      ok: false;
      code:
        | "INVALID_CODE"
        | "ROOM_FULL"
        | "WRONG_PASSWORD"
        | "RACE_IN_PROGRESS"
        | "ROOM_NOT_FOUND"
        | "RATE_LIMITED";
      message: string;
    };

// ---------------------------------------------------------------------------
// Rate-limit bucket
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number;
  windowStart: number; // ms since epoch
}

const RATE_WINDOW_MS = 60_000; // 1 minute rolling window

// ---------------------------------------------------------------------------
// RoomManager
// ---------------------------------------------------------------------------

export class RoomManager {
  /** roomId → RoomInfo */
  private readonly rooms = new Map<string, RoomInfo>();

  /** joinCode (PIN string) → roomId */
  private readonly codeIndex = new Map<string, string>();

  /** socketId → roomId (for fast disconnect lookup) */
  private readonly socketRooms = new Map<string, string>();

  /** IP address → rate-limit bucket */
  private readonly rateLimits = new Map<string, RateBucket>();

  // -------------------------------------------------------------------------
  // PIN generation
  // -------------------------------------------------------------------------

  /**
   * Generate a unique 6-digit PIN string that is not currently in use.
   * Retries up to 20 times on collision (astronomically rare in practice).
   */
  generatePin(): string {
    for (let attempt = 0; attempt < 20; attempt++) {
      const pin = String(
        Math.floor(Math.random() * (PIN_MAX - PIN_MIN + 1)) + PIN_MIN
      );
      if (!this.codeIndex.has(pin)) return pin;
    }
    // Last resort: UUID-derived 6-digit code (extremely unlikely to be reached)
    return String(
      (parseInt(randomUUID().replace(/-/g, "").slice(0, 8), 16) %
        (PIN_MAX - PIN_MIN + 1)) +
        PIN_MIN
    );
  }

  // -------------------------------------------------------------------------
  // Room creation
  // -------------------------------------------------------------------------

  /**
   * Create a new room with the given host and settings.
   * Returns the newly created RoomInfo on success.
   */
  createRoom(
    hostSocketId: string,
    hostName: string,
    settings: RoomSettings,
    role: "player" | "display" = "player"
  ): RoomCreateResult {
    const roomId = randomUUID();
    const joinCode = this.generatePin();

    const host: PlayerInfo = {
      id: hostSocketId,
      name: hostName,
      isReady: false,
      role,
    };

    const effectiveSettings: RoomSettings = {
      trackId: settings.trackId,
      totalLaps: settings.totalLaps,
      maxPlayers: Math.min(settings.maxPlayers ?? MAX_PLAYERS, MAX_PLAYERS),
      ...(settings.password !== undefined
        ? { password: settings.password }
        : {}),
    };

    const room: RoomInfo = {
      roomId,
      joinCode,
      hostId: hostSocketId,
      players: [host],
      phase: "LOBBY" as RacePhase,
      settings: effectiveSettings,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.codeIndex.set(joinCode, roomId);
    this.socketRooms.set(hostSocketId, roomId);

    return { ok: true, room };
  }

  // -------------------------------------------------------------------------
  // Room joining
  // -------------------------------------------------------------------------

  /**
   * Attempt to add a player to an existing room via its PIN code.
   *
   * Checks (in order):
   *   1. Rate limit for the joining IP.
   *   2. PIN exists → room found.
   *   3. Room is in LOBBY phase (not mid-race).
   *   4. Room is not full.
   *   5. Password matches (if set).
   */
  joinRoom(
    socketId: string,
    playerName: string,
    joinCode: string,
    role: "player" | "display",
    ipAddress: string,
    password?: string
  ): RoomJoinResult {
    // --- Rate limit check ---
    if (this.isRateLimited(ipAddress)) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: `Too many join attempts. Try again in a minute.`,
      };
    }
    this.recordJoinAttempt(ipAddress);

    // --- PIN lookup ---
    const roomId = this.codeIndex.get(joinCode);
    if (roomId === undefined) {
      return {
        ok: false,
        code: "INVALID_CODE",
        // PIN flows through logs — output as ASCII-safe numeric string, no truncation.
        message: `Room code "${joinCode}" not found.`,
      };
    }

    const room = this.rooms.get(roomId);
    if (room === undefined) {
      // Shouldn't happen (index/room sync) but handle defensively.
      this.codeIndex.delete(joinCode);
      return { ok: false, code: "ROOM_NOT_FOUND", message: "Room not found." };
    }

    // --- Phase check ---
    if (room.phase !== "LOBBY") {
      return {
        ok: false,
        code: "RACE_IN_PROGRESS",
        message: "A race is already in progress in this room.",
      };
    }

    // --- Capacity check ---
    const activePlayers = room.players.filter((p) => p.role === "player").length;
    if (role === "player" && activePlayers >= room.settings.maxPlayers) {
      return { ok: false, code: "ROOM_FULL", message: "Room is full." };
    }

    // --- Password check ---
    if (room.settings.password !== undefined && room.settings.password !== "") {
      if (password !== room.settings.password) {
        return {
          ok: false,
          code: "WRONG_PASSWORD",
          message: "Incorrect room password.",
        };
      }
    }

    // --- Admit player ---
    const player: PlayerInfo = { id: socketId, name: playerName, isReady: false, role };
    room.players.push(player);
    this.socketRooms.set(socketId, roomId);

    return { ok: true, room };
  }

  // -------------------------------------------------------------------------
  // Room leaving / disconnect
  // -------------------------------------------------------------------------

  /**
   * Remove a player from their current room.
   * If the departing player was the host, promote the first remaining player.
   * If the room becomes empty, destroy it.
   *
   * @returns The updated RoomInfo (or null if the room was destroyed).
   */
  leaveRoom(socketId: string): { room: RoomInfo | null; wasHost: boolean } {
    const roomId = this.socketRooms.get(socketId);
    if (roomId === undefined) return { room: null, wasHost: false };

    this.socketRooms.delete(socketId);

    const room = this.rooms.get(roomId);
    if (room === undefined) return { room: null, wasHost: false };

    const wasHost = room.hostId === socketId;
    room.players = room.players.filter((p) => p.id !== socketId);

    if (room.players.length === 0) {
      this.destroyRoom(roomId);
      return { room: null, wasHost };
    }

    // Promote a new host if the original host left.
    if (wasHost) {
      const newHost = room.players[0];
      if (newHost !== undefined) {
        // RoomInfo.hostId is readonly on the interface; cast to update.
        (room as { hostId: string }).hostId = newHost.id;
      }
    }

    return { room, wasHost };
  }

  // -------------------------------------------------------------------------
  // Ready toggle
  // -------------------------------------------------------------------------

  setReady(socketId: string, ready: boolean): { room: RoomInfo | null; player: PlayerInfo | null } {
    const roomId = this.socketRooms.get(socketId);
    if (roomId === undefined) return { room: null, player: null };

    const room = this.rooms.get(roomId);
    if (room === undefined) return { room: null, player: null };

    const player = room.players.find((p) => p.id === socketId);
    if (player === undefined) return { room, player: null };

    player.isReady = ready;
    return { room, player };
  }

  // -------------------------------------------------------------------------
  // Phase transition
  // -------------------------------------------------------------------------

  setRoomPhase(roomId: string, phase: RacePhase): void {
    const room = this.rooms.get(roomId);
    if (room !== undefined) room.phase = phase;
  }

  // -------------------------------------------------------------------------
  // Lookups
  // -------------------------------------------------------------------------

  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socketId: string): RoomInfo | undefined {
    const roomId = this.socketRooms.get(socketId);
    return roomId !== undefined ? this.rooms.get(roomId) : undefined;
  }

  getRoomByCode(joinCode: string): RoomInfo | undefined {
    const roomId = this.codeIndex.get(joinCode);
    return roomId !== undefined ? this.rooms.get(roomId) : undefined;
  }

  getRoomIdBySocket(socketId: string): string | undefined {
    return this.socketRooms.get(socketId);
  }

  allRoomIds(): string[] {
    return [...this.rooms.keys()];
  }

  roomCount(): number {
    return this.rooms.size;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room !== undefined) {
      this.codeIndex.delete(room.joinCode);
    }
    this.rooms.delete(roomId);
  }

  private isRateLimited(ip: string): boolean {
    const bucket = this.rateLimits.get(ip);
    if (bucket === undefined) return false;
    if (Date.now() - bucket.windowStart > RATE_WINDOW_MS) return false;
    return bucket.count >= JOIN_RATE_LIMIT;
  }

  private recordJoinAttempt(ip: string): void {
    const now = Date.now();
    const bucket = this.rateLimits.get(ip);
    if (bucket === undefined || now - bucket.windowStart > RATE_WINDOW_MS) {
      this.rateLimits.set(ip, { count: 1, windowStart: now });
    } else {
      bucket.count++;
    }
  }
}
