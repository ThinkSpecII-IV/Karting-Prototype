# Current Architecture

## Status

This document describes the architecture that exists in the repository today.
The project is a TypeScript arcade-racing prototype with a browser Canvas client
and a Node.js server. It is not yet a complete racing game. See
[PROJECT_STATE.md](./PROJECT_STATE.md) for verified gaps and
[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for the proposed incremental work.

## Runtime and build

- Package manager: npm (`package.json` and `package-lock.json`).
- Language: TypeScript 5.5, targeting Node.js 18 or newer.
- Server build: `tsc --project tsconfig.server.json`; entry point is
  `server/index.ts`, emitted as `dist/server/server/index.js`.
- `npm run start:server` runs that compiled entry point; `PORT` can override
  the default listening port for isolated local instances.
- Client build: esbuild bundles `src/client/client_main.ts` to
  `public/bundle.js`.
- The Node HTTP server in `server/index.ts` serves `public/` and hosts Socket.IO.
- No external rendering framework is used; rendering is Canvas 2D.

## Source layout

```text
server/
  index.ts                     HTTP and Socket.IO process entry point
src/
  client/
    client_main.ts             Menu, socket, keyboard/touch controls, audio
    audio/AudioEngine.ts       Procedural client audio
    render/
      CanvasRenderer.ts        Canvas drawing and HUD
        Interpolation.ts       Snapshot interpolation buffer
  track/
      defaultTrack.ts          Original oval geometry, spawns, and boundaries
  math/
    Vector2.ts                 Immutable 2D vector value type
    MathUtils.ts               Scalar and angular helpers
  network/
    RoomManager.ts             In-memory room and player membership
  physics/
    KartPhysics.ts             Per-vehicle fixed-step integration
    BoundingSphere.ts          Circle and segment collision helpers
    SurfaceResponse.ts         Surface grip and engine heat calculations
  server/
    ServerLoop.ts              Physics accumulator and snapshot broadcasting
    network/SocketServer.ts    Socket event handlers and race initialization
  shared/
    constants.ts               Shared simulation and network constants
    events.ts                  Socket event names and payload contracts
    types.ts                   Shared physics, race, vehicle, and track types
tests/
  math/                        Vector and utility unit tests
  physics/                     Physics, surface, and collision unit tests
  network/                     Socket server integration tests
  server/                      Authoritative loop integration tests
  track/                       Circuit geometry tests
```

## Runtime flow

1. `server/index.ts` creates the HTTP server and `SocketServer`.
2. `SocketServer` creates rooms, records player readiness, accepts input, and
   initializes a `RaceState` when all current players are ready.
3. `ServerLoop` runs at the configured 60 Hz interval, accumulates elapsed time,
   and invokes physics in fixed `PHYSICS_DT` steps, capped to prevent a spiral
   of death.
4. Each active vehicle consumes its most recent input and passes through
   `KartPhysics.integrate`; the loop resolves track-wall and car-to-car
   collisions.
5. A snapshot is emitted every `TICKS_PER_SNAPSHOT` ticks (20 Hz) to clients in
   the Socket.IO room.
6. `ClientMain` buffers snapshots, captures keyboard/touch input while racing,
   and emits changed inputs. `CanvasRenderer` interpolates and draws the view.

## Physics and data ownership

- The server owns runtime vehicle state and accepts control input rather than
  client-authored position or velocity.
- Physics uses plain shared `Vec2` values at the network boundary and immutable
  `Vector2` instances for calculations.
- The server loop uses a fixed physics step with an elapsed-time accumulator.
- `BoundingSphere.ts` implements wall and car collision primitives; the server
  applies sampled oval boundaries and car-to-car resolution.
- Shared contracts live in `src/shared/`; they include track and race-progress
  types even though there is not yet an integrated track/race-progress system.

## Current presentation

- The client has a main menu, room lobby, keyboard rebinding, touch controls,
  model selection, procedural audio, and a Canvas HUD.
- The Canvas camera tracks the local vehicle in a 2D plane at a fixed scale.
- The current scene includes a sampled oval road and grass field in a fixed
  scale top-down view; there is no chase perspective, trackside scenery, or
  minimap.
- Vehicle sprites are drawn from original Canvas primitives and team-inspired
  palettes. No external game assets are required.

## Constraints for future work

- Keep authoritative position, physics, and race progress on the server.
- Keep physics independent from DOM, rendering, and audio.
- Preserve fixed-step simulation and the 20 Hz snapshot contract unless a
  specific change is justified and tested.
- Use original game names, track geometry, art, and UI rather than proprietary
  game assets.
- Extend the existing systems incrementally; do not assume planned types or
  helpers are already wired into runtime behavior.
