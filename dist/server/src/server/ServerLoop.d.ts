import type { RaceState, PlayerInput, Snapshot } from "../shared/types.js";
export declare class ServerLoop {
    private activeRaces;
    private inputBuffers;
    private previousTimeMs;
    private accumulator;
    private intervalId;
    private broadcastCallback;
    constructor(broadcastCallback: (roomId: string, snapshot: Snapshot) => void);
    start(): void;
    stop(): void;
    addRace(roomId: string, state: RaceState): void;
    removeRace(roomId: string): void;
    queueInput(roomId: string, playerId: string, input: PlayerInput): void;
    private tick;
    private stepPhysics;
    private broadcastSnapshot;
}
//# sourceMappingURL=ServerLoop.d.ts.map