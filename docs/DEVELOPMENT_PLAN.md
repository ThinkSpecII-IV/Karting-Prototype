# Development Plan

## Goal

Incrementally turn the existing prototype into a genuinely playable,
original arcade open-wheel racer. Preserve useful physics, network, and client
foundations; avoid a broad rewrite until specific evidence requires it.

## Completed first slice: circuit and track collision

- Added `Copperfield Oval` with sampled inner and outer boundaries and eight
  spawn points.
- Drew the grass field, oval road, edges, and centerline in the existing Canvas
  renderer.
- Spawned racers on the circuit and connected wall response to the server's
  authoritative vehicle update.
- Added tests for valid spawn locations and boundary response in the running
  server loop.
- Full Vitest suite (263 tests), client/server type checks, and both builds
  pass.

Port 3000 already had a listener, so the compiled server was extended to accept
`PORT` and tested in an isolated instance on port 3011. Quick Race startup and
keyboard throttle/steering were manually verified; a complete manual lap
remains unverified.

## Next milestone: lap and race progression

- Detect ordered checkpoint crossings in the correct direction.
- Update laps, fractional progress, standings, and finish state on the server.
- Expose lap/position/completion in snapshots and the HUD.
- Test valid and invalid checkpoint order, lap completion, standings, finish,
  and restart.

**Gate:** a player can finish a configured number of laps, see accurate
progress, and restart into a fresh race.

## Later milestones

### AI opponents

- Add a track-following controller that produces the same control contract as a
  human player.
- Run AI through the same authoritative integration and collision path.
- Test waypoint selection, cornering, and progress deterministically.

**Gate:** multiple cars complete the circuit, can be overtaken, and appear in
stable standings.

### Presentation

- Evaluate a chase-style camera in the existing renderer before considering a
  different rendering engine.
- Add original trackside scenery, minimap, compact race HUD, and clear
  start/finish/restart UI.
- Validate keyboard and touch layouts in a browser.

**Gate:** players can understand and complete the race flow without developer
tools.

### Tuning and expansion

- Tune acceleration, braking, reverse, steering, grip, and collisions against
  repeatable tests and observed browser behavior.
- Add polish and multiplayer refinements after driving and race progression are
  stable.

## Verification

- Run focused physics/network tests for server changes.
- Run client/server type checks and full Vitest suite before each milestone.
- Verify browser behavior, not compilation alone: control, circuit continuity,
  collisions, lap completion, AI, finish, and restart.
- Keep generated build outputs and runtime telemetry out of source changes
  unless explicitly required by the deliverable.
