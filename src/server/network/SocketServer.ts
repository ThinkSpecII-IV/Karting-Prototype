import { Server as IOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { RoomManager } from "../../network/RoomManager.js";
import { ServerLoop } from "../ServerLoop.js";
import { ClientEvents, ServerEvents, RoomCreatePayload, RoomJoinPayload, PlayerReadyPayload, PlayerInput } from "../../shared/events.js";
import type { RaceState, VehicleState } from "../../shared/types.js";
import { createDefaultVehicleState } from "../../physics/KartPhysics.js";

export class SocketServer {
  private io: IOServer;
  private roomManager = new RoomManager();
  private serverLoop: ServerLoop;

  constructor(httpServer: HttpServer) {
    this.io = new IOServer(httpServer, {
      cors: { origin: "*" },
    });

    this.serverLoop = new ServerLoop((roomId, snapshot) => {
      this.io.to(roomId).emit(ServerEvents.RACE_STATE, snapshot);
    });

    this.serverLoop.start();

    this.io.on("connection", (socket: Socket) => {
      this.registerHandlers(socket);
    });
  }

  public getIO(): IOServer {
    return this.io;
  }

  public getRoomManager(): RoomManager {
    return this.roomManager;
  }

  public getServerLoop(): ServerLoop {
    return this.serverLoop;
  }

  public close() {
    this.serverLoop.stop();
    this.io.close();
  }

  private registerHandlers(socket: Socket) {
    socket.on(ClientEvents.ROOM_CREATE, (payload: RoomCreatePayload) => {
      const result = this.roomManager.createRoom(socket.id, payload.playerName, payload.settings, payload.role);
      if (result.ok) {
        socket.join(result.room.roomId);
        socket.emit(ServerEvents.ROOM_CREATED, {
          joinCode: result.room.joinCode,
          room: result.room,
          qrCodeDataUrl: null,
        });
      } else {
        socket.emit(ServerEvents.ROOM_ERROR, { code: "INVALID_CODE", message: result.reason });
      }
    });

    socket.on(ClientEvents.ROOM_JOIN, (payload: RoomJoinPayload) => {
      const ip = socket.handshake.address;
      const result = this.roomManager.joinRoom(socket.id, payload.playerName, payload.joinCode, payload.role, ip, payload.password);
      
      if (result.ok) {
        socket.join(result.room.roomId);
        socket.emit(ServerEvents.ROOM_JOINED, { room: result.room });
        
        const playerJoinedPayload = {
          player: result.room.players[result.room.players.length - 1],
          roomId: result.room.roomId
        };
        socket.to(result.room.roomId).emit(ServerEvents.PLAYER_JOINED, playerJoinedPayload);
      } else {
        socket.emit(ServerEvents.ROOM_ERROR, { code: result.code, message: result.message });
      }
    });

    socket.on(ClientEvents.ROOM_LEAVE, () => {
      this.handleLeave(socket);
    });

    socket.on("disconnect", () => {
      this.handleLeave(socket);
    });

    socket.on(ClientEvents.PLAYER_READY, (payload: PlayerReadyPayload) => {
      const result = this.roomManager.setReady(socket.id, payload.ready);
      if (result.room && result.player) {
        this.io.to(result.room.roomId).emit(ServerEvents.PLAYER_READY_CHANGED, {
          playerId: socket.id,
          ready: payload.ready,
        });

        // Auto-start race logic for tests
        if (result.room.players.length > 0 && result.room.players.every(p => p.isReady)) {
          this.startRace(result.room.roomId);
        }
      }
    });

    socket.on(ClientEvents.PLAYER_INPUT, (input: PlayerInput) => {
      const roomId = this.roomManager.getRoomIdBySocket(socket.id);
      if (roomId) {
        this.serverLoop.queueInput(roomId, socket.id, input);
      }
    });
  }

  private handleLeave(socket: Socket) {
    const roomId = this.roomManager.getRoomIdBySocket(socket.id);
    if (!roomId) return;

    const { room } = this.roomManager.leaveRoom(socket.id);
    socket.leave(roomId);

    if (room) {
      this.io.to(roomId).emit(ServerEvents.PLAYER_LEFT, {
        playerId: socket.id,
        roomId,
        reason: "disconnect"
      });
    } else {
      this.serverLoop.removeRace(roomId);
    }
  }

  private startRace(roomId: string) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;
    
    this.roomManager.setRoomPhase(roomId, "RACING");

    const vehicles: VehicleState[] = room.players.map((p, index) => 
      createDefaultVehicleState(p.id, index * 2, 0, 0)
    );

    const raceState: RaceState = {
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
    this.io.to(roomId).emit(ServerEvents.RACE_STARTED, { roomId, startedAt: Date.now() });
  }
}
