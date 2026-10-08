"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerEvents = exports.ClientEvents = void 0;
// ---------------------------------------------------------------------------
// Event name constants
// ---------------------------------------------------------------------------
/**
 * Events emitted BY the CLIENT and received BY the server.
 */
exports.ClientEvents = {
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
};
/**
 * Events emitted BY the SERVER and received BY the client.
 */
exports.ServerEvents = {
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
};
//# sourceMappingURL=events.js.map