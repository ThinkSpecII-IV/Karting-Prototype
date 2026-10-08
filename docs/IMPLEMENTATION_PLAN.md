# Implementation Plan — Multiplayer Kart Racing Game

> Historical planning document. The original phase list predates the current
> implementation and describes several modules that have since been organized
> differently. For verified repository state and the next proposed work, see
> [PROJECT_STATE.md](./PROJECT_STATE.md), [ARCHITECTURE.md](./ARCHITECTURE.md),
> and [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

> Each phase is independently verifiable. Complete and test each phase before starting the next.
> Commit after every phase with a descriptive message.
> Use proxy/placeholder assets and headless simulation until Phase 10.

---

## Phase 1 — Project Scaffold & Math Library

**Purpose:** Establish the build system, shared type contracts, and the foundational math primitives that every other system depends on.

**Files / Modules:**
- `package.json`, `tsconfig.json`, `tsconfig.server.json`, `tsconfig.client.json`
- `src/shared/types.ts` — VehicleConfig, VehicleState, PlayerInput, RaceState, Snapshot, WeatherState, RoomInfo, TrackDef
- `src/shared/constants.ts` — physicsTickHz, networkSnapHz, interpolationDelay, slipstreamDistance, etc.
- `src/shared/events.ts` — all Socket.IO event names as typed constants
- `src/math/Vector2.ts` — add, sub, scale, dot, cross, length, lengthSq, normalize, rotate, lerp
- `src/math/MathUtils.ts` — lerp (scalar), clamp, angleBetween, degToRad, radToDeg, sign
- `src/math/index.ts`
- `tests/math/Vector2.test.ts`
- `tests/math/MathUtils.test.ts`

**Dependencies:** None (foundation layer).

**Tests Required:**
- `Vector2.add((1,2),(3,4)) === (4,6)`
- `Vector2.length((3,4)) === 5`
- `Vector2.normalize((3,4)).length === 1`
- `Vector2.dot((1,0),(0,1)) === 0`
- `lerp(0, 10, 0.5) === 5`
- `clamp(15, 0, 10) === 10`
- `angleBetween((1,0),(0,1)) ≈ 90°`

**Acceptance Criteria:**
- All math tests pass.
- TypeScript compiles with zero errors.
- `src/shared/types.ts` exports all canonical types used by both server and client.

**Risks:**
- Choosing floating-point representations that lose precision at large world coordinates. Mitigation: keep the world in a small coordinate space (hundreds of metres, not thousands).

---

## Phase 2 — Fixed-Timestep Game Loop

**Purpose:** Server-side heartbeat that drives all simulation. Everything else is called from here.

**Files / Modules:**
- `src/core/GameLoop.ts` — fixed-dt loop at 60 Hz using `setInterval` / `process.hrtime`
- `src/core/GameServer.ts` — stub: `update(dt)` logs tick count

**Dependencies:** Phase 1 (constants).

**Tests Required:**
- Run loop for 1 simulated second (mock `setInterval`); assert `update` called exactly 60 times.
- Assert `dt` passed to `update` is within ±1 ms of `1/60` s.
- Assert loop does not drift more than 5 ms over 100 ticks.

**Acceptance Criteria:**
- Loop ticks at stable 60 Hz without drift on a development machine.
- `update(dt)` receives a consistent, bounded `dt`.

**Risks:**
- `setInterval` on Node.js is not perfectly precise. Mitigation: use `process.hrtime` for elapsed measurement and clamp `dt` to a max of 3× the target (prevents spiral-of-death on tab/process pause).

---

## Phase 3 — Single-Kart Physics: Engine, Drag, Braking

**Purpose:** A single vehicle can accelerate, coast, and brake realistically.

**Files / Modules:**
- `src/vehicle/VehicleConfig.ts`
- `src/vehicle/VehicleState.ts`
- `src/physics/VehiclePhysics.ts` — `integrateLinear(state, config, input, dt)`
- `src/physics/PhysicsWorld.ts` — owns array of states; calls `VehiclePhysics` per vehicle

**Dependencies:** Phases 1–2.

**Tests Required:**
- Engine only (no drag): `v = enginePower/mass * dt` after one tick.
- Drag: at terminal velocity `F_engine == F_drag`; speed stabilises.
- Braking from 10 m/s with `brake=1`; speed reaches 0 within expected time.
- Rolling resistance: with throttle=0 and brake=0, car decelerates slowly.

**Acceptance Criteria:**
- `VehiclePhysics.integrateLinear` passes all unit tests.
- A headless script: create one car, apply `throttle=1` for 1 s, log final speed — matches `F=ma` formula within 5%.

**Risks:**
- Using the wrong sign convention for drag (must oppose velocity direction, not always negative-X).

---

## Phase 4 — Steering, Lateral Velocity & Grip

**Purpose:** Vehicle turns, and lateral slip decays according to grip. This enables the fundamental "car feel."

**Files / Modules:**
- `src/physics/VehiclePhysics.ts` — extend: `integrateSteering`, `applyLateralFriction`
- `src/vehicle/VehicleController.ts` — maps `PlayerInput` → force/torque calls

**Dependencies:** Phase 3.

**Tests Required:**
- At speed, applying `steering=1` increases `angularVelocity`.
- `angularVelocity` is proportional to speed and steering input (bounded by `steeringAngle`).
- A lateral impulse decays toward zero across N ticks at the rate implied by `lateralGrip`.
- At `lateralGrip=1.0`, lateral velocity is eliminated in one tick (perfect grip).
- At `lateralGrip=0.0`, lateral velocity is fully preserved (frictionless).

**Acceptance Criteria:**
- A car given initial lateral velocity eventually stops sliding sideways.
- Turning at speed produces a circular arc whose radius matches `v / angularVelocity`.

**Risks:**
- Mixing radians/degrees in rotation math. Enforce radians internally, convert only for display.

---

## Phase 5 — Oversteer / Understeer

**Purpose:** Different cars feel different. `oversteerFactor` modulates rear grip.

**Files / Modules:**
- `src/physics/VehiclePhysics.ts` — apply `oversteerFactor` to effective `lateralGrip`
- `src/vehicle/VehicleConfig.ts` — add `oversteerFactor` field

**Dependencies:** Phase 4.

**Tests Required:**
- Two cars identical except `oversteerFactor=1.0` vs `2.0`; same turn at same speed.
- High-oversteer car accumulates more lateral velocity than neutral car.
- Low-oversteer (understeer) car resists turning: turning radius is wider.

**Acceptance Criteria:**
- Numeric difference in lateral velocity between the two configs is measurable and directionally correct.

**Risks:** Minimal — this is a single multiplier in an existing path.

---

## Phase 6 — Drift

**Purpose:** Player can intentionally induce slide by holding drift input.

**Files / Modules:**
- `src/physics/VehiclePhysics.ts` — when `input.drift === true`, use `driftGrip` instead of `lateralGrip`
- `src/vehicle/VehicleState.ts` — add `isDrifting: boolean`
- `src/shared/types.ts` — ensure `PlayerInput.drift` is present

**Dependencies:** Phase 5.

**Tests Required:**
- Same car, same turn: `drift=false` vs `drift=true` → drift mode accumulates more lateral velocity.
- `isDrifting` flag is set when `|v_lateral| > driftThreshold`.
- On releasing drift input, lateral grip restores and car straightens.

**Acceptance Criteria:**
- A simulated fast corner with drift enabled shows higher slip angle than without.

**Risks:** Abrupt grip restoration can cause snap-back. Mitigation: lerp grip coefficient back, not instant switch.

---

## Phase 7 — Track Geometry & Collision

**Purpose:** Cars are bounded by track walls and respond to collisions.

**Files / Modules:**
- `src/track/TrackLoader.ts` — load track JSON → `Track` object
- `src/track/Track.ts` — holds boundary line segments, checkpoint lines, surface zones, spawn points
- `src/track/SurfaceZone.ts`
- `src/track/Checkpoint.ts`
- `src/physics/CollisionSystem.ts` — `circleVsLine`, `circleVsCircle`, `resolveWall`, `resolveCarCar`
- `tests/track/sample_track.json` — a minimal test track (rectangle with 2 checkpoints)

**Dependencies:** Phases 1–6.

**Tests Required:**
- Circle at (0,0) r=1 vs wall from (-2,0) to (2,0): overlap detected, position corrected, velocity reflected.
- Velocity after wall bounce has correct sign and is damped by restitution coefficient.
- Two circles at distance < 2r: separated to touching distance after resolution.
- Car on `dirt` surface: effective friction matches `config.grip * surface.friction`.

**Acceptance Criteria:**
- Headless simulation: car moving toward a wall reverses direction and does not tunnel through.
- Two cars approaching each other deflect and separate.

**Risks:**
- Tunnelling at high speed (car moves more than its diameter per tick). Mitigation: clamp max velocity to `radius / dt` or add swept-circle check. Flag as known risk; implement sweep test in a later optimisation phase if needed.

---

## Phase 8 — Checkpoints, Laps & Race Ranking

**Purpose:** Race progress is tracked correctly; position standings are meaningful.

**Files / Modules:**
- `src/race/LapCounter.ts` — per-vehicle checkpoint crossing detection; enforces order
- `src/race/RaceManager.ts` — owns all vehicles and LapCounters; manages race lifecycle state machine
- `src/race/PositionSystem.ts` — computes `raceProgress` scalar; returns sorted standings
- `src/race/WeatherSystem.ts` — stub only at this phase

**Dependencies:** Phases 7.

**Tests Required:**
- Car crosses checkpoints in order → lap increments on crossing finish line.
- Car crosses checkpoints out of order → lap/checkpoint NOT incremented.
- Car reverses over finish line without crossing all checkpoints → no lap counted.
- `raceProgress` for a car on lap 2 checkpoint 3 > lap 1 checkpoint 5 (if total checkpoints = 6).
- Sort 3 cars at different progress values → correct ranking order.

**Acceptance Criteria:**
- A scripted headless run with a car driving the full test track loop awards exactly 1 lap per loop.
- Out-of-order crossing is silently ignored.

**Risks:**
- Checkpoint crossing detection using point-in-segment vs threshold. Use a signed-area crossing test (car crosses the line segment between last position and current position) rather than proximity alone. Document this choice — proximity-based detection is unreliable at high speed.

---

## Phase 9 — Multi-Kart Local Simulation

**Purpose:** Multiple cars coexist in the same simulation with collision and correct race ranking.

**Files / Modules:**
- `src/physics/PhysicsWorld.ts` — extend to handle N vehicles; run pairwise collision
- `src/core/GameServer.ts` — create 2–4 test vehicles, run the full loop

**Dependencies:** Phases 3–8.

**Tests Required:**
- Simulate 4 cars for 10 s headless; no crash, no NaN positions.
- Two cars on a collision course: after impact, both have non-NaN velocities and are separated.
- Race ranking updates correctly each tick.

**Acceptance Criteria:**
- Headless simulation runs 4 cars for 60 s without numerical instability.
- All acceptance tests from Phases 3–8 still pass (regression).

**Risks:**
- O(n²) pairwise collision is fine for 8 players; no spatial partitioning needed yet.

---

## Phase 10 — Debug / Proxy Framework

**Purpose:** Enable visual inspection of physics without requiring real art. Toggle-able at runtime.

**Files / Modules:**
- `src/client/ClientApp.ts` — browser entry point; canvas setup
- `src/client/Renderer.ts` — `requestAnimationFrame` loop; delegates draw calls
- `src/proxy/VisualProxy.ts` — draws cars as coloured rectangles, walls as lines
- `src/proxy/PhysicsProxy.ts` — draws velocity arrows, slip angle, collision normals
- `src/proxy/ProxyManager.ts` — global flag `PROXY_MODE`; switches render path
- `src/debug/DebugUI.ts` — on-screen text panel: FPS, speed, grip, slip, surface
- `src/debug/PhysicsOverlay.ts` — canvas overlay drawn on top of game canvas
- `src/debug/Telemetry.ts` — collects metrics; readable by DebugUI

**Dependencies:** Phases 1, 7.

**Tests Required:**
- Rendering test: with `PROXY_MODE=true`, two cars at known positions produce correct rectangles at those positions (pixel-coordinate assertion or snapshot test).
- `[F1]` key toggles debug overlay without throwing errors.
- Debug panel shows non-zero FPS and valid speed values.

**Acceptance Criteria:**
- Opening the browser shows two proxy cars moving according to Phase 9 physics.
- Debug overlay can be toggled on/off.
- No console errors in proxy mode.

**Risks:**
- Canvas coordinate system (Y-down) vs physics coordinate system. Define a `worldToScreen` transform early and use it consistently everywhere. Never scatter coordinate conversion throughout the codebase.

---

## Phase 11 — Local Multiplayer (Same Machine / Keyboard Split)

**Purpose:** Two players can control separate cars from the same browser, purely local (no network). Validates the full local pipeline before adding network complexity.

**Files / Modules:**
- `src/client/InputCapture.ts` — maps keyboard keys to `PlayerInput`; supports player-1 and player-2 key maps
- `src/client/ClientApp.ts` — create two `InputCapture` instances; feed directly to `GameServer` (same process, no socket)

**Dependencies:** Phases 9–10.

**Tests Required:**
- Player 1 keys affect only car 1's input; player 2 keys affect only car 2.
- Both cars rendered simultaneously at correct positions.

**Acceptance Criteria:**
- Two players can race a lap in the browser on the same machine.
- Debug overlay shows both cars' telemetry.

**Risks:** Minimal — network not involved here.

---

## Phase 12 — Server-Authoritative Networking (Socket.IO)

**Purpose:** Move simulation to a dedicated server process. Browser clients send inputs and receive snapshots. Implement client-side interpolation.

**Files / Modules:**
- `src/network/SocketManager.ts` — Socket.IO server; event routing
- `src/network/InputBuffer.ts` — stores latest `PlayerInput` per `playerId`
- `src/network/Snapshot.ts` — serialise `RaceState` to minimal JSON; deserialise on client
- `src/client/Interpolator.ts` — ring buffer of last N snapshots; exposes interpolated state at `now - interpolationDelay`
- `src/client/ClientApp.ts` — switch from local GameServer to socket connection
- Server entry point: `server/index.ts`

**Dependencies:** Phases 9–11.

**Tests Required:**
- Client sends `player:input`; server receives and stores it within one tick.
- Server emits `race:state` every 3 ticks (50 ms at 60 Hz); client receives snapshots.
- Interpolator with two snapshots 50 ms apart, queried at midpoint, returns lerped position.
- Interpolator with only one snapshot returns that snapshot's state.
- Simulate 500 ms of network; assert client's interpolated position matches server's authoritative position within 10% of travelled distance.

**Acceptance Criteria:**
- One car controlled from browser; server log shows inputs received; browser shows smooth motion.
- Simulated 100 ms additional latency does not cause visible stutter (buffered interpolation absorbs it).

**Risks:**
- `setInterval` drift on the server causing snapshot rate to vary. Mitigation: track elapsed time in `GameLoop` and emit snapshots based on accumulated time, not interval count.
- Snapshot size too large. Mitigation: send only fields that changed after initial full snapshot (delta compression). Defer this to the optimisation phase; document it here.

---

## Phase 13 — Online Rooms & 6-Digit PIN

**Purpose:** Multiple players can join the same game session from different browsers/machines.

**Files / Modules:**
- `src/network/RoomManager.ts` — create/destroy rooms; generate 6-digit PIN; map PIN → roomId
- `src/ui/LobbyScreen.ts` — displays PIN, player list, ready button
- `src/network/SocketManager.ts` — handle `room:create`, `room:join`, `room:leave`, `player:disconnect`

**Dependencies:** Phase 12.

**Tests Required:**
- `RoomManager.createRoom()` returns a unique 6-digit numeric code.
- Two sequential rooms never get the same code (for the life of the server process).
- `joinRoom('000000')` with an invalid code returns an error event, not a crash.
- 1000 join attempts on a non-existent code all return errors within 100 ms (rate-limit baseline).
- Player disconnect triggers `player:left` broadcast to room.
- Host closing room broadcasts `room:closed` to all members.

**Acceptance Criteria:**
- Two browser windows: one creates a room, other joins with the displayed PIN; both appear in the lobby player list.
- Race starts only when all players are ready.

**Risks:**
- 6-digit code space is 900,000 possible codes. With many concurrent rooms, collisions become probable. Mitigation: retry on collision; limit max concurrent rooms and log a warning if > 800 rooms are active.
- Brute-force JOIN attacks. Mitigation: rate-limit `room:join` to 5 attempts per IP per minute using a simple in-memory counter (upgrade to Redis later if needed).

---

## Phase 14 — LAN / QR Joining

**Purpose:** Players on the same network can join by scanning a QR code displayed on the host screen.

**Files / Modules:**
- Server: generate QR code image from `http://<LAN_IP>:<PORT>/join?code=<PIN>` using the `qrcode` npm package
- `src/ui/LobbyScreen.ts` — display QR code image alongside the numeric PIN
- `server/index.ts` — detect local IP via `os.networkInterfaces()`

**Dependencies:** Phase 13.

**Tests Required:**
- Server correctly identifies at least one non-loopback IPv4 address.
- Generated QR encodes the correct URL (decode and assert string).
- Joining via `/join?code=XXXXXX` URL behaves identically to typing the PIN manually.

**Acceptance Criteria:**
- Phone on the same Wi-Fi scans QR and joins the lobby.

**Risks:**
- Multiple network interfaces (VPN, virtual adapters). Mitigation: prefer the first non-loopback, non-virtual IPv4; display all candidates in a dropdown if there are multiple.
- HTTPS requirement on some mobile browsers for WebSocket. Mitigation: document that LAN mode requires HTTP (not HTTPS) and is served on port 3000; note this as a known limitation for iOS Safari.

---

## Phase 15 — Controller Interface (Phone as Gamepad)

**Purpose:** Players use their phone browser as a steering controller; a separate display browser shows the game.

**Files / Modules:**
- `client/controller/ControllerApp.ts` — lightweight phone UI: virtual steering wheel (touch/tilt), throttle/brake buttons
- `client/controller/GyroInput.ts` — optional: use `DeviceOrientation` API for tilt steering
- `src/client/InputCapture.ts` — extend to accept touch events and orientation data
- `src/ui/LobbyScreen.ts` — show controller QR on the display screen

**Dependencies:** Phase 14.

**Tests Required:**
- Touch left/right on controller page produces `steering` values in `[-1, 1]`.
- Throttle button held produces `throttle=1`; released produces `throttle=0`.
- Input events reach the server and update the correct player's `VehicleState`.

**Acceptance Criteria:**
- A phone connected as a controller can steer a car visible on a desktop browser display.

**Risks:**
- `DeviceOrientation` requires HTTPS on modern browsers. Mitigation: make gyro steering opt-in; fall back to touch joystick (always works over HTTP).
- Touch latency on phones adds ~50–80 ms. Mitigation: client-side prediction on the display (Phase 12 interpolation absorbs this).

---

## Phase 16 — Assets, Audio & VFX

**Purpose:** Replace proxy shapes with real sprites; add sound effects and particle effects.

**Files / Modules:**
- `src/assets/AssetManager.ts` — load/cache images and audio clips by key
- `src/assets/manifest.ts` — all asset paths; swapping paths here changes nothing in game logic
- `src/audio/AudioManager.ts` — play, stop, loop, set pitch/volume
- `src/audio/EngineAudio.ts` — RPM-based pitch cross-fade
- `src/audio/SfxCatalog.ts`
- `src/client/Renderer.ts` — switch from `VisualProxy` to sprite draw when `PROXY_MODE=false`
- VFX: particle system (tire smoke, dust, sparks, rain spray) as a lightweight canvas sprite emitter

**Dependencies:** Phase 10 (ProxyManager toggle).

**Tests Required:**
- `AssetManager.get('cars', 'carRed')` returns the correct URL string before and after load.
- With `PROXY_MODE=false`, Renderer draws sprites at vehicle positions (visual snapshot test).
- With `PROXY_MODE=true`, Renderer draws rectangles — no asset load errors.
- Audio: `AudioManager.play('collision_medium')` does not throw in a headless Node environment (mock the Web Audio API).

**Acceptance Criteria:**
- Swapping `manifest.ts` paths changes all visuals without touching any game logic file.
- Engine sound pitch changes with speed.
- Tire smoke particle emits when `isDrifting=true`.

**Risks:**
- Web Audio API unavailable in test environments. Mitigation: inject an `AudioContext` mock in tests; keep `AudioManager` behind an interface.

---

## Phase 17 — Weather

**Purpose:** Dynamic weather modifies physics in real time; server is authoritative on weather state.

**Files / Modules:**
- `src/race/WeatherSystem.ts` — full implementation: weather type, intensity, wetness decay, transitions
- `src/physics/SurfacePhysics.ts` — apply `weatherModifier` to effective grip
- `src/vehicle/VehicleState.ts` — add `engineTemperature`
- `src/physics/VehiclePhysics.ts` — heat generation/dissipation model
- Weather included in `Snapshot` and broadcast to clients for visual effects

**Dependencies:** Phases 8, 12.

**Tests Required:**
- `rainIntensity=1.0`: effective lateral grip is 50% of dry value.
- Wetness decays at `wetnessDecay` rate per second after rain stops.
- Engine temperature rises with sustained full throttle.
- At ambient temperature 40°C, engine temp rises faster than at 20°C.
- Engine temperature above `overheatThreshold` reduces `maxSpeed` by the specified factor.
- Weather state in snapshot matches server state on client.

**Acceptance Criteria:**
- Enable rain mid-race; observe cars sliding more immediately.
- Hold throttle for 30 s in heat; observe speed reduction kicking in.

**Risks:**
- Weather changes mid-race could cause sudden grip discontinuities. Mitigation: lerp `wetness` and `intensity` over several seconds, never instant-set.

---

## Phase 18 — Slipstream / Drafting

**Purpose:** Following closely behind another kart reduces drag — creates overtaking opportunities.

**Files / Modules:**
- `src/physics/VehiclePhysics.ts` — `computeSlipstream(vehicles[]): slipFactor per vehicle`
- `src/vehicle/VehicleState.ts` — add `inDraft: boolean` (for debug display and VFX)

**Dependencies:** Phase 9.

**Tests Required:**
- Follower directly behind leader at distance 8 m (< slipstreamDistance 10 m): `slipFactor > 0`.
- Follower beside leader at same distance: `slipFactor === 0` (outside cone).
- Follower behind leader at 15 m: `slipFactor === 0`.
- `effectiveDrag = baseDrag * (1 - K_draft * slipFactor)` matches formula.
- Follower reaches higher terminal speed than identical car without draft.

**Acceptance Criteria:**
- Two-car headless simulation: follower in draft zone achieves ≥ 5% higher terminal speed.

**Risks:** Minimal — additive modifier on an existing drag term.

---

## Phase 19 — AI Drivers

**Purpose:** CPU-controlled karts fill empty race slots and provide practice opposition.

**Files / Modules:**
- `src/ai/AIController.ts` — produces `PlayerInput` from current `VehicleState` + track data
- `src/ai/PathFollower.ts` — follows a pre-defined racing line (waypoints from track JSON)
- `src/ai/RacingLine.ts` — optional: simplified racing line generator from checkpoint centres
- `src/core/GameServer.ts` — register AI cars through same `VehicleController` pipeline as humans

**Dependencies:** Phases 8–9.

**Tests Required:**
- AI car drives the test track loop without going out of bounds for 10 laps (headless).
- AI uses same `VehicleController` interface as a human player — no special physics bypass.
- AI car respects collision resolution (does not tunnel through walls).

**Acceptance Criteria:**
- A race with 1 human + 3 AI karts completes without server errors.
- AI karts complete laps in a reasonable time (within 3× human lap time at equivalent config).

**Risks:**
- AI path following breaks on tight corners. Mitigation: start with a lookahead waypoint approach (steer toward a point N metres ahead on the racing line) and tune lookahead distance. Defer advanced AI to post-launch.

---

## Phase 20 — Optimisation & Final Testing

**Purpose:** Performance validation, hardening, and final integration testing.

**Files / Modules:**
- Snapshot delta compression (`Snapshot.ts`) — only changed fields after first full snapshot
- Spatial query cache for collision (if profiling reveals O(n²) is a bottleneck at 8 players — unlikely)
- `tests/integration/` — multi-bot race simulations; desync detection
- Load test: 8 simulated socket clients on a single server; measure tick duration histogram

**Tests Required:**
- 8 simulated clients race for 5 minutes; zero NaN positions, zero missed lap counts.
- Tick duration stays below 10 ms at 60 Hz (leaves 6.7 ms budget per tick) on reference hardware.
- Network snapshot payload ≤ 1 KB per update for 8 vehicles.
- All Phase 1–19 unit tests still pass.

**Acceptance Criteria:**
- Game is playable at 60 Hz server / 60 fps client on a mid-range laptop with 8 players.
- No memory leaks after a 10-minute headless run (heap size stable).

**Risks:**
- If Node.js single-threaded physics becomes the bottleneck, move physics to a Worker thread. Flag early; do not prematurely optimise.

---

## Dependency Graph (Phase Order)

```
1 (Math/Scaffold)
└── 2 (Game Loop)
    └── 3 (Engine/Drag)
        └── 4 (Steering/Grip)
            └── 5 (Oversteer)
                └── 6 (Drift)
                    └── 7 (Track/Collision)
                        └── 8 (Checkpoints/Laps)
                            ├── 9 (Multi-Kart Local)
                            │   ├── 10 (Debug/Proxy)
                            │   │   └── 11 (Local Multiplayer)
                            │   │       └── 12 (Server Networking)
                            │   │           └── 13 (Rooms/PIN)
                            │   │               └── 14 (LAN/QR)
                            │   │                   └── 15 (Controller)
                            │   │                       └── 16 (Assets/Audio)
                            │   ├── 17 (Weather) ──────────────────────────┘
                            │   ├── 18 (Slipstream)
                            │   └── 19 (AI)
                            └── 20 (Optimisation) ← depends on all above
```

Phases 16, 17, 18, 19 can be developed in parallel once Phase 9 is solid.

---

## Commit Message Convention

```
feat(phase-N): <what was added>
test(phase-N): <what was tested>
fix(phase-N): <what was corrected>
```

Example: `feat(phase-1): Vector2 math library and shared type contracts`
