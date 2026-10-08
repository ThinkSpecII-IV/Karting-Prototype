# Project State

## Snapshot

The repository is a TypeScript browser-based multiplayer kart prototype. It has
working math and vehicle-physics foundations, an HTTP/Socket.IO server, a
Canvas client, controls and HUD, plus a newly integrated original oval circuit.
It is not yet a complete race game.

## Stack and entry points

- TypeScript 5.5, npm, Node.js 18+.
- Server source: `server/index.ts`; compiled entry:
  `dist/server/server/index.js`.
- Browser source: `src/client/client_main.ts`; bundle: `public/bundle.js`.
- Renderer: Canvas 2D in `src/client/render/CanvasRenderer.ts`.
- Simulation: `src/server/ServerLoop.ts` at 60 Hz fixed steps; snapshots are
  broadcast at 20 Hz.

## Implemented

- Immutable vector math, scalar helpers, kart integration, surface response,
  engine temperature behavior, and collision primitives.
- Room creation/join/leave/readiness; keyboard/touch inputs; network snapshots.
- Open-wheel car sprites, basic race HUD, audio, and menu controls.
- `Copperfield Oval`, an original sampled oval track with inner/outer collision
  boundaries and eight grid spawns. The Canvas draws the road and the server
  loop resolves vehicle-to-track collisions authoritatively.
- Verification after the circuit slice: all 263 Vitest tests pass;
  `typecheck:client` and `typecheck:server` pass.

## Playability blockers

1. **No race progress:** shared checkpoint/lap fields are not updated by the
   server, so the player cannot complete a scored lap.
2. **No AI opponents:** races include only connected human room players.
3. **No competitive lifecycle:** standings are empty; there is no finish
   condition or restart flow.
4. **Minimal presentation:** the camera is a fixed-scale, player-centered
   top-down view, without chase perspective, trackside scenery, or minimap.
5. **No reverse gear:** brake slows the car but does not drive backward from
   rest.

## Physics assessment

`KartPhysics.integrate` is deterministic for a given state, config, input, and
fixed `dt`; unit tests cover acceleration, braking, grip, drift, and speed
limits. The server's fixed-step accumulator is in place. Track collision is
integrated into the server update and has an integration test.

The server currently passes an empty surface-definition list, so surface
response falls back to asphalt. Track progress and laps are not connected to
vehicle state. Unit tests do not establish that a complete race is playable.

## Verification caveat

Tests establish module behavior, spawn placement, server-loop wall response,
and basic Socket.IO snapshot delivery; they do not verify completing a lap,
finishing a race, AI competition, or restarting. In a separate local instance
on port 3011, Quick Race startup and keyboard throttle/steering were manually
verified; completing a full lap remains unverified.
