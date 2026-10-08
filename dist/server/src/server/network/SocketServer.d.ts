import { Server as IOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { RoomManager } from "../../network/RoomManager.js";
import { ServerLoop } from "../ServerLoop.js";
export declare class SocketServer {
    private io;
    private roomManager;
    private serverLoop;
    constructor(httpServer: HttpServer);
    getIO(): IOServer;
    getRoomManager(): RoomManager;
    getServerLoop(): ServerLoop;
    close(): void;
    private registerHandlers;
    private handleLeave;
    private startRace;
}
//# sourceMappingURL=SocketServer.d.ts.map