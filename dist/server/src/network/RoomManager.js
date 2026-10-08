"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const node_crypto_1 = require("node:crypto");
const constants_js_1 = require("../shared/constants.js");
const RATE_WINDOW_MS = 60_000; // 1 minute rolling window
// ---------------------------------------------------------------------------
// RoomManager
// ---------------------------------------------------------------------------
class RoomManager {
    /** roomId → RoomInfo */
    rooms = new Map();
    /** joinCode (PIN string) → roomId */
    codeIndex = new Map();
    /** socketId → roomId (for fast disconnect lookup) */
    socketRooms = new Map();
    /** IP address → rate-limit bucket */
    rateLimits = new Map();
    // -------------------------------------------------------------------------
    // PIN generation
    // -------------------------------------------------------------------------
    /**
     * Generate a unique 6-digit PIN string that is not currently in use.
     * Retries up to 20 times on collision (astronomically rare in practice).
     */
    generatePin() {
        for (let attempt = 0; attempt < 20; attempt++) {
            const pin = String(Math.floor(Math.random() * (constants_js_1.PIN_MAX - constants_js_1.PIN_MIN + 1)) + constants_js_1.PIN_MIN);
            if (!this.codeIndex.has(pin))
                return pin;
        }
        // Last resort: UUID-derived 6-digit code (extremely unlikely to be reached)
        return String((parseInt((0, node_crypto_1.randomUUID)().replace(/-/g, "").slice(0, 8), 16) %
            (constants_js_1.PIN_MAX - constants_js_1.PIN_MIN + 1)) +
            constants_js_1.PIN_MIN);
    }
    // -------------------------------------------------------------------------
    // Room creation
    // -------------------------------------------------------------------------
    /**
     * Create a new room with the given host and settings.
     * Returns the newly created RoomInfo on success.
     */
    createRoom(hostSocketId, hostName, settings, role = "player") {
        const roomId = (0, node_crypto_1.randomUUID)();
        const joinCode = this.generatePin();
        const host = {
            id: hostSocketId,
            name: hostName,
            isReady: false,
            role,
        };
        const effectiveSettings = {
            trackId: settings.trackId,
            totalLaps: settings.totalLaps,
            maxPlayers: Math.min(settings.maxPlayers ?? constants_js_1.MAX_PLAYERS, constants_js_1.MAX_PLAYERS),
            ...(settings.password !== undefined
                ? { password: settings.password }
                : {}),
        };
        const room = {
            roomId,
            joinCode,
            hostId: hostSocketId,
            players: [host],
            phase: "LOBBY",
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
    joinRoom(socketId, playerName, joinCode, role, ipAddress, password) {
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
        const player = { id: socketId, name: playerName, isReady: false, role };
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
    leaveRoom(socketId) {
        const roomId = this.socketRooms.get(socketId);
        if (roomId === undefined)
            return { room: null, wasHost: false };
        this.socketRooms.delete(socketId);
        const room = this.rooms.get(roomId);
        if (room === undefined)
            return { room: null, wasHost: false };
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
                room.hostId = newHost.id;
            }
        }
        return { room, wasHost };
    }
    // -------------------------------------------------------------------------
    // Ready toggle
    // -------------------------------------------------------------------------
    setReady(socketId, ready) {
        const roomId = this.socketRooms.get(socketId);
        if (roomId === undefined)
            return { room: null, player: null };
        const room = this.rooms.get(roomId);
        if (room === undefined)
            return { room: null, player: null };
        const player = room.players.find((p) => p.id === socketId);
        if (player === undefined)
            return { room, player: null };
        player.isReady = ready;
        return { room, player };
    }
    // -------------------------------------------------------------------------
    // Phase transition
    // -------------------------------------------------------------------------
    setRoomPhase(roomId, phase) {
        const room = this.rooms.get(roomId);
        if (room !== undefined)
            room.phase = phase;
    }
    // -------------------------------------------------------------------------
    // Lookups
    // -------------------------------------------------------------------------
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getRoomBySocket(socketId) {
        const roomId = this.socketRooms.get(socketId);
        return roomId !== undefined ? this.rooms.get(roomId) : undefined;
    }
    getRoomByCode(joinCode) {
        const roomId = this.codeIndex.get(joinCode);
        return roomId !== undefined ? this.rooms.get(roomId) : undefined;
    }
    getRoomIdBySocket(socketId) {
        return this.socketRooms.get(socketId);
    }
    allRoomIds() {
        return [...this.rooms.keys()];
    }
    roomCount() {
        return this.rooms.size;
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    destroyRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room !== undefined) {
            this.codeIndex.delete(room.joinCode);
        }
        this.rooms.delete(roomId);
    }
    isRateLimited(ip) {
        const bucket = this.rateLimits.get(ip);
        if (bucket === undefined)
            return false;
        if (Date.now() - bucket.windowStart > RATE_WINDOW_MS)
            return false;
        return bucket.count >= constants_js_1.JOIN_RATE_LIMIT;
    }
    recordJoinAttempt(ip) {
        const now = Date.now();
        const bucket = this.rateLimits.get(ip);
        if (bucket === undefined || now - bucket.windowStart > RATE_WINDOW_MS) {
            this.rateLimits.set(ip, { count: 1, windowStart: now });
        }
        else {
            bucket.count++;
        }
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=RoomManager.js.map