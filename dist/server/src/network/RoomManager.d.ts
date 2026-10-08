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
import type { RoomInfo, PlayerInfo, RoomSettings, RacePhase } from "../shared/types.js";
export type RoomCreateResult = {
    ok: true;
    room: RoomInfo;
} | {
    ok: false;
    reason: string;
};
export type RoomJoinResult = {
    ok: true;
    room: RoomInfo;
} | {
    ok: false;
    code: "INVALID_CODE" | "ROOM_FULL" | "WRONG_PASSWORD" | "RACE_IN_PROGRESS" | "ROOM_NOT_FOUND" | "RATE_LIMITED";
    message: string;
};
export declare class RoomManager {
    /** roomId → RoomInfo */
    private readonly rooms;
    /** joinCode (PIN string) → roomId */
    private readonly codeIndex;
    /** socketId → roomId (for fast disconnect lookup) */
    private readonly socketRooms;
    /** IP address → rate-limit bucket */
    private readonly rateLimits;
    /**
     * Generate a unique 6-digit PIN string that is not currently in use.
     * Retries up to 20 times on collision (astronomically rare in practice).
     */
    generatePin(): string;
    /**
     * Create a new room with the given host and settings.
     * Returns the newly created RoomInfo on success.
     */
    createRoom(hostSocketId: string, hostName: string, settings: RoomSettings, role?: "player" | "display"): RoomCreateResult;
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
    joinRoom(socketId: string, playerName: string, joinCode: string, role: "player" | "display", ipAddress: string, password?: string): RoomJoinResult;
    /**
     * Remove a player from their current room.
     * If the departing player was the host, promote the first remaining player.
     * If the room becomes empty, destroy it.
     *
     * @returns The updated RoomInfo (or null if the room was destroyed).
     */
    leaveRoom(socketId: string): {
        room: RoomInfo | null;
        wasHost: boolean;
    };
    setReady(socketId: string, ready: boolean): {
        room: RoomInfo | null;
        player: PlayerInfo | null;
    };
    setRoomPhase(roomId: string, phase: RacePhase): void;
    getRoom(roomId: string): RoomInfo | undefined;
    getRoomBySocket(socketId: string): RoomInfo | undefined;
    getRoomByCode(joinCode: string): RoomInfo | undefined;
    getRoomIdBySocket(socketId: string): string | undefined;
    allRoomIds(): string[];
    roomCount(): number;
    private destroyRoom;
    private isRateLimited;
    private recordJoinAttempt;
}
//# sourceMappingURL=RoomManager.d.ts.map