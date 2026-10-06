/**
 * src/shared/events.ts
 *
 * Canonical Socket.IO event name constants and their payload types.
 *
 * INVARIANT (INV-07): Event names are defined here ONLY.
 * Both server (SocketManager.ts) and client (ClientApp.ts) import from here.
 * Never use raw string literals for event names in any other file.
 *
 * Usage:
 *   import { ClientEvents, ServerEvents } from '@shared/events';
 *   socket.emit(ClientEvents.PLAYER_INPUT, input);
 *   socket.on(ServerEvents.RACE_STATE, handler);
 */

import type {
  PlayerInput,
  RoomSettings,
  Snapshot,
  RaceResults,
  RoomInfo,
  PlayerInfo,
} from "./types.js";

// ---------------------------------------------------------------------------
// Event name constants
// ---------------------------------------------------------------------------

/**
 * Events emitted BY the CLIENT and received BY the server.
 */
export const ClientEvents = {
  // Room management
  /** Create a new room. */
  ROOM_CREATE: "room:create",
  /** Join an existing room by PIN. */
  ROOM_JOIN: "room:join",
  /** Leave the current room voluntarily. */
  ROOM_LEAVE: "room:leave",

  // Lobby
  /** Toggle ready state in the lobby. */
  PLAYER_READY: "player:ready",

  // Race
  /** Continuous input stream during a race. */
  PLAYER_INPUT: "player:input",
} as const;

/**
 * Events emitted BY the SERVER and received BY the client.
 */
export const ServerEvents = {
  // Room lifecycle
  /** Confirms room creation; includes joinCode and full RoomInfo. */
  ROOM_CREATED: "room:created",
  /** Confirms successful join; includes full RoomInfo. */
  ROOM_JOINED: "room:joined",
  /** An error response (join failure, invalid code, etc.). */
  ROOM_ERROR: "room:error",
  /** Broadcast to all room members when a player joins. */
  PLAYER_JOINED: "player:joined",
  /** Broadcast to all room members when a player leaves or disconnects. */
  PLAYER_LEFT: "player:left",
  /** Broadcast when a player toggles ready state. */
  PLAYER_READY_CHANGED: "player:readyChanged",
  /** Room was closed (host disconnected). */
  ROOM_CLOSED: "room:closed",

  // Race lifecycle
  /** Countdown has started; clients show countdown UI. */
  RACE_COUNTDOWN: "race:countdown",
  /** Race has started. */
  RACE_STARTED: "race:started",
  /** Periodic physics snapshot broadcast. */
  RACE_STATE: "race:state",
  /** A vehicle crossed the finish line. */
  RACE_VEHICLE_FINISHED: "race:vehicleFinished",
  /** Race is over; full results included. */
  RACE_ENDED: "race:ended",
} as const;

// Derive union types for type-safe switch statements
export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];

// ---------------------------------------------------------------------------
// Payload types per event
// (Used to type socket.emit() and socket.on() calls)
// ---------------------------------------------------------------------------

// --- Client → Server payloads ---

export interface RoomCreatePayload {
  readonly playerName: string;
  readonly settings: RoomSettings;
  /** "player" for active racer, "display" for spectator screen. */
  readonly role: "player" | "display";
}

export interface RoomJoinPayload {
  /** 6-digit numeric PIN string, e.g. "739214". */
  readonly joinCode: string;
  readonly playerName: string;
  readonly role: "player" | "display";
  /** Optional password if the room is protected. */
  readonly password?: string | undefined;
}

export interface RoomLeavePayload {
  readonly roomId: string;
}

export interface PlayerReadyPayload {
  /** New ready state the player is toggling to. */
  readonly ready: boolean;
}

// PlayerInput is re-exported for convenience — import once.
export type { PlayerInput };

// --- Server → Client payloads ---

export interface RoomCreatedPayload {
  readonly joinCode: string;
  readonly room: RoomInfo;
  /**
   * Base64 PNG data-URL of the QR code encoding the LAN join URL.
   * e.g. "http://192.168.1.24:3000/join?code=739214"
   * null if the server could not determine a LAN IP.
   */
  readonly qrCodeDataUrl: string | null;
}

export interface RoomJoinedPayload {
  readonly room: RoomInfo;
}

export interface RoomErrorPayload {
  readonly code:
    | "INVALID_CODE"
    | "ROOM_FULL"
    | "WRONG_PASSWORD"
    | "RACE_IN_PROGRESS"
    | "ROOM_NOT_FOUND"
    | "RATE_LIMITED";
  readonly message: string;
}

export interface PlayerJoinedPayload {
  readonly player: PlayerInfo;
  readonly roomId: string;
}

export interface PlayerLeftPayload {
  readonly playerId: string;
  readonly roomId: string;
  readonly reason: "voluntary" | "disconnect";
}

export interface PlayerReadyChangedPayload {
  readonly playerId: string;
  readonly ready: boolean;
}

export interface RoomClosedPayload {
  readonly roomId: string;
  readonly reason: "host_left" | "server_shutdown";
}

export interface RaceCountdownPayload {
  /** Countdown value: 3, 2, 1, 0 (0 = GO!). */
  readonly value: number;
}

export interface RaceStartedPayload {
  readonly roomId: string;
  /** Server timestamp (ms) when the race officially started (value = 0 of countdown). */
  readonly startedAt: number;
}

/** Re-export Snapshot as the payload for RACE_STATE events. */
export type { Snapshot };

export interface RaceVehicleFinishedPayload {
  readonly vehicleId: string;
  readonly rank: number;
  readonly totalTimeMs: number;
}

export interface RaceEndedPayload {
  readonly results: RaceResults;
}

// ---------------------------------------------------------------------------
// Typed event map helpers
// Allows IDEs and TypeScript to infer the payload type from the event name.
// ---------------------------------------------------------------------------

/**
 * Map of client-to-server event names → payload types.
 * Use with Socket.IO typed events feature if desired.
 */
export interface ClientToServerEvents {
  [ClientEvents.ROOM_CREATE]: (payload: RoomCreatePayload) => void;
  [ClientEvents.ROOM_JOIN]: (payload: RoomJoinPayload) => void;
  [ClientEvents.ROOM_LEAVE]: (payload: RoomLeavePayload) => void;
  [ClientEvents.PLAYER_READY]: (payload: PlayerReadyPayload) => void;
  [ClientEvents.PLAYER_INPUT]: (payload: PlayerInput) => void;
}

/**
 * Map of server-to-client event names → payload types.
 */
export interface ServerToClientEvents {
  [ServerEvents.ROOM_CREATED]: (payload: RoomCreatedPayload) => void;
  [ServerEvents.ROOM_JOINED]: (payload: RoomJoinedPayload) => void;
  [ServerEvents.ROOM_ERROR]: (payload: RoomErrorPayload) => void;
  [ServerEvents.PLAYER_JOINED]: (payload: PlayerJoinedPayload) => void;
  [ServerEvents.PLAYER_LEFT]: (payload: PlayerLeftPayload) => void;
  [ServerEvents.PLAYER_READY_CHANGED]: (payload: PlayerReadyChangedPayload) => void;
  [ServerEvents.ROOM_CLOSED]: (payload: RoomClosedPayload) => void;
  [ServerEvents.RACE_COUNTDOWN]: (payload: RaceCountdownPayload) => void;
  [ServerEvents.RACE_STARTED]: (payload: RaceStartedPayload) => void;
  [ServerEvents.RACE_STATE]: (payload: Snapshot) => void;
  [ServerEvents.RACE_VEHICLE_FINISHED]: (payload: RaceVehicleFinishedPayload) => void;
  [ServerEvents.RACE_ENDED]: (payload: RaceEndedPayload) => void;
}
