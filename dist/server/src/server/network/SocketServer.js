"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketServer = void 0;
const socket_io_1 = require("socket.io");
const RoomManager_js_1 = require("../../network/RoomManager.js");
const ServerLoop_js_1 = require("../ServerLoop.js");
const events_js_1 = require("../../shared/events.js");
const KartPhysics_js_1 = require("../../physics/KartPhysics.js");
class SocketServer {
    io;
    roomManager = new RoomManager_js_1.RoomManager();
    serverLoop;
    constructor(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: { origin: "*" },
        });
        this.serverLoop = new ServerLoop_js_1.ServerLoop((roomId, snapshot) => {
            this.io.to(roomId).emit(events_js_1.ServerEvents.RACE_STATE, snapshot);
        });
        this.serverLoop.start();
        this.io.on("connection", (socket) => {
            this.registerHandlers(socket);
        });
    }
    getIO() {
        return this.io;
    }
    getRoomManager() {
        return this.roomManager;
    }
    getServerLoop() {
        return this.serverLoop;
    }
    close() {
        this.serverLoop.stop();
        this.io.close();
    }
    registerHandlers(socket) {
        socket.on(events_js_1.ClientEvents.ROOM_CREATE, (payload) => {
            const result = this.roomManager.createRoom(socket.id, payload.playerName, payload.settings, payload.role);
            if (result.ok) {
                socket.join(result.room.roomId);
                socket.emit(events_js_1.ServerEvents.ROOM_CREATED, {
                    joinCode: result.room.joinCode,
                    room: result.room,
                    qrCodeDataUrl: null,
                });
            }
            else {
                socket.emit(events_js_1.ServerEvents.ROOM_ERROR, { code: "INVALID_CODE", message: result.reason });
            }
        });
        socket.on(events_js_1.ClientEvents.ROOM_JOIN, (payload) => {
            const ip = socket.handshake.address;
            const result = this.roomManager.joinRoom(socket.id, payload.playerName, payload.joinCode, payload.role, ip, payload.password);
            if (result.ok) {
                socket.join(result.room.roomId);
                socket.emit(events_js_1.ServerEvents.ROOM_JOINED, { room: result.room });
                const playerJoinedPayload = {
                    player: result.room.players[result.room.players.length - 1],
                    roomId: result.room.roomId
                };
                socket.to(result.room.roomId).emit(events_js_1.ServerEvents.PLAYER_JOINED, playerJoinedPayload);
            }
            else {
                socket.emit(events_js_1.ServerEvents.ROOM_ERROR, { code: result.code, message: result.message });
            }
        });
        socket.on(events_js_1.ClientEvents.ROOM_LEAVE, () => {
            this.handleLeave(socket);
        });
        socket.on("disconnect", () => {
            this.handleLeave(socket);
        });
        socket.on(events_js_1.ClientEvents.PLAYER_READY, (payload) => {
            const result = this.roomManager.setReady(socket.id, payload.ready);
            if (result.room && result.player) {
                this.io.to(result.room.roomId).emit(events_js_1.ServerEvents.PLAYER_READY_CHANGED, {
                    playerId: socket.id,
                    ready: payload.ready,
                });
                // Auto-start race logic for tests
                if (result.room.players.length > 0 && result.room.players.every(p => p.isReady)) {
                    this.startRace(result.room.roomId);
                }
            }
        });
        socket.on(events_js_1.ClientEvents.PLAYER_INPUT, (input) => {
            const roomId = this.roomManager.getRoomIdBySocket(socket.id);
            if (roomId) {
                this.serverLoop.queueInput(roomId, socket.id, input);
            }
        });
    }
    handleLeave(socket) {
        const roomId = this.roomManager.getRoomIdBySocket(socket.id);
        if (!roomId)
            return;
        const { room } = this.roomManager.leaveRoom(socket.id);
        socket.leave(roomId);
        if (room) {
            this.io.to(roomId).emit(events_js_1.ServerEvents.PLAYER_LEFT, {
                playerId: socket.id,
                roomId,
                reason: "disconnect"
            });
        }
        else {
            this.serverLoop.removeRace(roomId);
        }
    }
    startRace(roomId) {
        const room = this.roomManager.getRoom(roomId);
        if (!room)
            return;
        this.roomManager.setRoomPhase(roomId, "RACING");
        const vehicles = room.players.map((p, index) => (0, KartPhysics_js_1.createDefaultVehicleState)(p.id, index * 2, 0, 0));
        const raceState = {
            tick: 0,
            timestamp: Date.now(),
            phase: "RACING",
            vehicles,
            standings: [],
            weather: {
                type: "clear",
                intensity: 0,
                temperature: 20,
                windDirection: 0,
                windStrength: 0,
                wetness: 0,
            },
            countdown: 0,
        };
        this.serverLoop.addRace(roomId, raceState);
        this.io.to(roomId).emit(events_js_1.ServerEvents.RACE_STARTED, { roomId, startedAt: Date.now() });
    }
}
exports.SocketServer = SocketServer;
//# sourceMappingURL=SocketServer.js.map