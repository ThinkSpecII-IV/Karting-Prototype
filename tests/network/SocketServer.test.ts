import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { SocketServer } from "../../src/server/network/SocketServer.js";
import { ClientEvents, ServerEvents, RoomCreatePayload, PlayerInput } from "../../src/shared/events.js";
import { DEFAULT_TRACK } from "../../src/track/defaultTrack.js";


describe("SocketServer", () => {
  let io: SocketServer;
  let clientSocket: ClientSocket;
  let httpServer: any;
  let port: number;

  beforeEach(async () => {
    httpServer = createServer();
    io = new SocketServer(httpServer);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = httpServer.address().port;
        clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on("connect", () => resolve());
      });
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    io.close();
    httpServer.close();
  });

  it("should handle ROOM_CREATE and return a join code", () => {
    return new Promise<void>((resolve) => {
      const payload: RoomCreatePayload = {
        playerName: "TestPlayer",
        settings: { trackId: "test_track", totalLaps: 3, maxPlayers: 4 },
        role: "player",
      };

      clientSocket.emit(ClientEvents.ROOM_CREATE, payload);
      
      clientSocket.on(ServerEvents.ROOM_CREATED, (response) => {
        expect(response.joinCode).toBeDefined();
        expect(response.room.roomId).toBeDefined();
        expect(response.room.players.length).toBe(1);
        resolve();
      });
    });
  });

  it("should broadcast snapshots after race starts", () => {
    return new Promise<void>((resolve) => {
      const payload: RoomCreatePayload = {
        playerName: "TestPlayer",
        settings: { trackId: "test_track", totalLaps: 3, maxPlayers: 4 },
        role: "player",
      };

      clientSocket.emit(ClientEvents.ROOM_CREATE, payload);

      clientSocket.on(ServerEvents.ROOM_CREATED, () => {
        // Set ready to auto-start race
        clientSocket.emit(ClientEvents.PLAYER_READY, { ready: true });
      });

      clientSocket.on(ServerEvents.RACE_STARTED, () => {
        // Send some input
        const input: PlayerInput = {
          steering: 1.0,
          throttle: 1.0,
          brake: 0,
          drift: false,
          carModel: "McLaren MP4-17",
          timestamp: Date.now(),
        };
        clientSocket.emit(ClientEvents.PLAYER_INPUT, input);
      });

      clientSocket.on(ServerEvents.RACE_STATE, (snapshot) => {
        expect(snapshot).toBeDefined();
        expect(snapshot.vehicles).toBeDefined();
        expect(snapshot.vehicles.length).toBe(1);
        expect(snapshot.vehicles[0]?.carModel).toBe("McLaren MP4-17");
        const spawn = DEFAULT_TRACK.spawnPoints[0]!.position;
        const position = snapshot.vehicles[0]!.position;
        expect(Math.hypot(position.x - spawn.x, position.y - spawn.y)).toBeLessThan(1);
        resolve();
      });
    });
  });
});
