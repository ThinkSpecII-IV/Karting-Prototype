# Architecture Map — Multiplayer Kart Racing Game

> Status: **Greenfield** — no existing source code. This document describes the target architecture derived from the specification.

---

## 1. Current Repository State

The workspace is empty. Nothing has been built yet. All systems described below are to be created.

---

## 2. High-Level Architecture

The system has two top-level processes:

```
┌──────────────────────────────────────────────────────┐
│  GAME SERVER  (Node.js process)                      │
│  Owns: simulation, physics, race rules, weather      │
│  Transport: Socket.IO over WebSocket (WS / polling)  │
└──────────────────────────────────────────────────────┘
           ▲  player:input          ▼  race:state snapshot
┌──────────────────────────────────────────────────────┐
│  BROWSER CLIENT  (each player / display)             │
│  Owns: rendering, input capture, interpolation, HUD  │
│  Transport: Socket.IO (same library, client bundle)  │
└──────────────────────────────────────────────────────┘
```

There is one server process per deployment. Rooms are logical containers within that process (not separate processes). LAN and online rooms share the same Room class — only the transport endpoint differs.

---

## 3. Module Map

```
src/
├── core/
│   ├── GameLoop.ts          Fixed-timestep loop (server-side)
│   ├── Entity.ts            Base class / interface for all game entities
│   └── GameServer.ts        Top-level orchestrator: owns RaceManager, ticks all systems
│
├── math/
│   ├── Vector2.ts           2D vector (add, sub, scale, dot, length, normalize, rotate)
│   ├── MathUtils.ts         lerp, clamp, angleBetween, degToRad, radToDeg
│   └── index.ts
│
├── physics/
│   ├── PhysicsWorld.ts      Applies forces, integrates velocity/position for all vehicles
│   ├── VehiclePhysics.ts    Per-vehicle: engine, drag, braking, steering, lateral slip
│   ├── CollisionSystem.ts   Circle-vs-line (car-wall) and circle-vs-circle (car-car)
│   └── SurfacePhysics.ts    Applies per-surface friction/speed multipliers
│
├── vehicle/
│   ├── VehicleConfig.ts     Immutable car characteristics (mass, grip, enginePower, …)
│   ├── VehicleState.ts      Mutable runtime state (position, velocity, laps, …)
│   └── VehicleController.ts Translates PlayerInput → force/torque calls into PhysicsWorld
│
├── track/
│   ├── TrackLoader.ts       Parses track JSON → in-memory Track object
│   ├── Track.ts             Holds geometry: boundaries, checkpoints, surfaces, spawns
│   ├── Checkpoint.ts        Ordered waypoint lines; crossing detection logic
│   └── SurfaceZone.ts       Polygon/zone with surface type and coefficients
│
├── race/
│   ├── RaceManager.ts       Owns race lifecycle (LOBBY → COUNTDOWN → RACING → FINISHED)
│   ├── LapCounter.ts        Per-vehicle lap/checkpoint tracking; prevents out-of-order
│   ├── PositionSystem.ts    Computes raceProgress scalar; maintains sorted standings
│   └── WeatherSystem.ts     Owns weather state; applies modifiers to surface/engine
│
├── network/
│   ├── SocketManager.ts     Socket.IO server setup, event routing
│   ├── RoomManager.ts       Creates/destroys rooms; maps 6-digit PIN → roomId
│   ├── Snapshot.ts          Serialises RaceState → minimal JSON for broadcast
│   └── InputBuffer.ts       Stores latest PlayerInput per playerId on the server
│
├── proxy/
│   ├── ProxyManager.ts      Toggles proxy vs real assets globally
│   ├── VisualProxy.ts       Renders cars as colored rectangles, walls as lines
│   └── PhysicsProxy.ts      Draws velocity/friction/collision vectors in debug mode
│
├── debug/
│   ├── DebugUI.ts           On-screen telemetry panel (speed, grip, ping, tick)
│   ├── Telemetry.ts         Collects perf/gameplay metrics; exposes them to DebugUI
│   └── PhysicsOverlay.ts    Canvas overlay: hitboxes, vectors, normals
│
├── ui/
│   ├── HUD.ts               Lap counter, position indicator, speed, minimap
│   ├── LobbyScreen.ts       Player list, ready toggles, join code display, QR
│   ├── Countdown.ts         3-2-1-GO animation
│   └── Results.ts           Post-race results table
│
├── audio/
│   ├── AudioManager.ts      Central SFX/music player; caching, pitch/volume control
│   ├── EngineAudio.ts       RPM-based pitch cross-fading
│   └── SfxCatalog.ts        Key → file path mapping
│
├── assets/
│   ├── AssetManager.ts      Loads and caches images/sounds by key
│   └── manifest.ts          URL map for all car sprites, track images, UI icons
│
├── client/
│   ├── ClientApp.ts         Browser entry point; owns canvas, input, interpolation
│   ├── InputCapture.ts      Keyboard / touch / gamepad → PlayerInput events
│   ├── Interpolator.ts      Snapshot ring buffer (~100ms); lerps between snapshots
│   └── Renderer.ts          Canvas 2D draw loop; delegates to ProxyManager or real sprites
│
└── shared/
    ├── types.ts             VehicleConfig, VehicleState, PlayerInput, RaceState,
    │                        WeatherState, RoomInfo, Snapshot — ALL canonical definitions
    └── constants.ts         physicsTickHz, networkSnapHz, interpolationDelay, …
```

---

## 4. Client / Server Separation

| Concern | Owner |
|---|---|
| Physics simulation | **Server** |
| Collision detection | **Server** |
| Race rules (laps, checkpoints) | **Server** |
| Weather state | **Server** |
| Position authority | **Server** |
| Room/PIN management | **Server** |
| Player input collection | **Client** → emits to server |
| Rendering | **Client** |
| Snapshot interpolation | **Client** |
| HUD / UI | **Client** |
| Audio | **Client** |
| Asset loading | **Client** |
| Debug overlays | **Client** (reads server telemetry) |

---

## 5. Data Flow

```
[Client] KeyDown / Touch
    → InputCapture.ts
    → socket.emit('player:input', PlayerInput)
    → [Server] InputBuffer.set(playerId, input)

[Server] GameLoop.tick(dt) @ 60 Hz
    → VehicleController.applyInput(input) → forces
    → PhysicsWorld.integrate(dt)
    → CollisionSystem.resolve()
    → LapCounter.evaluate()
    → WeatherSystem.tick(dt)
    → every 3rd tick (≈20 Hz):
        Snapshot.build(raceState)
        socket.to(roomId).emit('race:state', snapshot)

[Client] socket.on('race:state', snapshot)
    → Interpolator.push(snapshot)
    → Renderer.drawFrame() reads interpolated state
    → HUD.update()
```

---

## 6. Game Loop

- Server runs a **fixed-timestep loop** at **60 Hz** (`physicsTickHz = 60`).
- Network snapshots broadcast at **20 Hz** (`networkSnapHz = 20`); i.e., every 3 physics ticks.
- Client runs its own `requestAnimationFrame` draw loop (unconstrained Hz) but reads from a **snapshot ring buffer** delayed by ~100 ms to smooth jitter.
- The client draw loop **never** writes physics state back to the server.

---

## 7. Physics Ownership

- All physics live in `src/physics/` and `src/vehicle/`.
- `PhysicsWorld` integrates forces; `VehiclePhysics` owns per-car force computation.
- Physics modules have **no imports from rendering, networking, or UI**.
- Both AI-controlled and human-controlled karts pass through the same `VehicleController` / `PhysicsWorld` pipeline.
- Physics uses SI units internally (metres, seconds, Newtons) and a fixed `dt`.

---

## 8. Networking Ownership

- `src/network/` owns the Socket.IO server, rooms, PIN generation, and snapshot broadcasting.
- `src/shared/types.ts` owns all serialised data shapes. Both server and client import from there — never duplicate.
- Events are typed: a single `events.ts` (or section of `types.ts`) lists every event name + payload to prevent drift.

---

## 9. Rendering Ownership

- `src/client/Renderer.ts` owns the canvas draw loop.
- It calls `ProxyManager` (debug shapes) or `AssetManager` (real sprites) — never both simultaneously.
- Renderer reads from `Interpolator`'s output, not directly from server physics state.
- Rendering code has **no game logic** (no collision, no lap counting, no physics).

---

## 10. Shared Data Structures (canonical location: `src/shared/types.ts`)

| Type | Description |
|---|---|
| `VehicleConfig` | Immutable car parameters |
| `VehicleState` | Per-car mutable runtime state |
| `PlayerInput` | `{ steering, throttle, brake, drift, timestamp }` |
| `RaceState` | Full snapshot: vehicles[], race positions, weather |
| `Snapshot` | `{ tick, timestamp, vehicles[], race, weather }` |
| `WeatherState` | `{ type, intensity, temperature, wetness, … }` |
| `RoomInfo` | `{ roomId, joinCode, hostId, players[], state, settings }` |
| `TrackDef` | Track JSON schema: checkpoints, boundaries, surfaces, spawns |
| `SurfaceDef` | `{ id, friction, accelerationMultiplier }` |

---

## 11. Missing Systems (relative to spec) — All to be built

| System | Notes |
|---|---|
| Math library (Vector2, lerp, clamp) | No existing code |
| Fixed-timestep game loop | No existing code |
| Vehicle physics (engine, drag, grip, slip) | No existing code |
| Steering, oversteer, drift | No existing code |
| Collision detection (car-wall, car-car) | No existing code |
| Track loader + checkpoint logic | No existing code |
| Lap counting + race ranking | No existing code |
| Snapshot serialisation + broadcast | No existing code |
| Socket.IO server + room management | No existing code |
| 6-digit PIN system | No existing code |
| Client interpolator (ring buffer) | No existing code |
| Canvas renderer (proxy shapes) | No existing code |
| Debug / telemetry overlay | No existing code |
| Weather system | No existing code |
| Slipstream/drafting | No existing code |
| Engine temperature | No existing code |
| Asset manager + audio manager | No existing code |
| Lobby / HUD / results UI | No existing code |
| QR code / LAN join | No existing code |
| AI drivers | No existing code |

---

## 12. External Dependencies (planned)

| Package | Role |
|---|---|
| `socket.io` | Server WebSocket transport |
| `socket.io-client` | Client WebSocket transport |
| `typescript` | Type safety across shared contracts |
| `esbuild` or `webpack` | Client bundle |
| `tsx` or `ts-node` | Run server TypeScript |
| `vitest` or `jest` | Unit / integration tests |
| `qrcode` (npm) | Generate LAN join QR code server-side |

No physics engine (e.g. Box2D, Matter.js) — custom physics as specified.
No game framework (e.g. Phaser) — plain Canvas 2D.
