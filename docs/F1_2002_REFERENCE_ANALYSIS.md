# F1 2002 Reference Analysis

## Purpose and evidence limits

This document defines an observation framework for an independently implemented
arcade open-wheel racer. It must not be read as a claim that the reference has
already been measured. No F1 2002 gameplay recording, emulator session,
reference screenshots, telemetry, or other direct observation evidence was
available during this repository pass. Consequently, specific reference
values and mechanics below are **unknown**, not inferred facts.

The broad target ("early-2000s arcade F1 racing") comes from the project brief.
Reference-specific behavior must be observed before it is used as a tuning
target. Do not extract or reuse game code, data, tracks, artwork, sound, logos,
or other proprietary content. Observations may guide original implementations
only.

Confidence vocabulary:

- **HIGH** — repeated, directly observed and measured with a reproducible
  method.
- **MEDIUM** — directly observed more than once, but measurements or
  conditions are approximate.
- **LOW** — inferred, indirectly reported, or based on a single ambiguous
  observation.
- **UNKNOWN** — no adequate evidence yet. This is not a confidence rating for a
  conclusion; it means there is no conclusion.

The protocol for a useful observation is:

```text
reference situation -> controlled input -> observed response -> measurement
-> confidence/evidence -> implementation hypothesis -> independent test
-> comparison -> tune
```

Record conditions (vehicle, track section, speed range, surface, weather,
assists, input device, and recording method) with each measurement. Preserve
the raw notes and mark each number as measured, estimated, observed, or
inferred. Never present an estimate as an exact reference value.

## Repository forensics

### Stack and entry points

- TypeScript 5.5 and npm; Node.js 18 or newer is declared.
- The browser uses Canvas 2D and esbuild, not a 3D engine.
- Server source entry: `server/index.ts`; TypeScript output:
  `dist/server/server/index.js`.
- Browser entry: `src/client/client_main.ts`; output: `public/bundle.js`.
- Socket.IO connects the browser to the Node HTTP server.
- Useful commands: `npm run build`, `npm test`,
  `npm run typecheck:client`, `npm run typecheck:server`, and
  `npm run start:server`.

### Existing systems and assessment

| System | Current evidence | Classification |
|---|---|---|
| Vector math | Immutable `Vector2`; arithmetic, projection, rotation, distances, conversion to plain JSON vectors; unit tests exist. | **KEEP** as a foundation; profile before changing allocation behavior. |
| Scalar/angle math | `MathUtils.ts` includes interpolation, clamping, decay, and angular helpers; unit tests exist. | **KEEP**; test any new dynamics helpers independently. |
| Vehicle state/contracts | Shared `VehicleState`, `VehicleConfig`, `PlayerInput`, snapshots, weather, track, and race types are defined in `src/shared/types.ts`. | **KEEP** canonical contracts; extend only with explicit serialization compatibility. |
| Kart integration | `KartPhysics.integrate` decomposes forward/lateral velocity, applies throttle, drag, rolling resistance, brake, speed cap, yaw, and engine temperature. Existing tests cover baseline cases. | **REFACTOR** incrementally: reverse behavior is not represented; front/rear axle forces and a distinct longitudinal tire limit are absent; `downforceCoef` is declared but not used in the integration code inspected. Validate every behavioral change against measured targets. |
| Surface response | Data-based `SurfaceDef` lookup with asphalt fallback and wetness modifiers. | **KEEP/REFACTOR**: actual server call currently passes an empty surface list, so only fallback asphalt is used. Wire track surface data before treating off-road behavior as implemented. |
| Collision primitives | Segment-circle wall response, circle-circle resolution, bounds clamp, and tests. | **KEEP/REFACTOR**: wall and car collision are wired into `ServerLoop`; examine glancing impacts, repeated corner contact, tunneling, rotational response, and car stacking with integration tests. |
| Server timestep | 60 Hz interval plus fixed-step accumulator, capped at three physics steps per timer callback. | **KEEP/REFACTOR**: validate long stalls, dropped accumulated time, and tick timing under load; current interval scheduling is not itself proof of a stable 60 Hz simulation. |
| Snapshot transport | Server emits every three physics ticks (20 Hz); client buffers and interpolates positions/rotation. | **KEEP**; add delayed/lost/out-of-order snapshot tests if transport behavior changes. |
| Track | `defaultTrack.ts` defines an original sampled oval, inner/outer collision polylines, and eight spawn positions. | **KEEP** as the current small playable-course foundation; expand independently into a varied racing layout and add checkpoints/surface zones. |
| Race state | Types include phases, laps, checkpoints, standings, and results. The socket server currently starts a race when all current players are ready. | **REFACTOR**: state fields are not a complete race lifecycle. Countdown, progress, standings, finish, results, and restart are not wired into the active loop. |
| AI | No AI implementation found in `src/` or tests. | **BUILD** after the input contract and race progress are reliable. |
| Browser input | Keyboard rebinding and pointer/touch controls create `PlayerInput`; network uplink sends changed values. | **KEEP/TEST**; browser behavior should cover simultaneous controls, key release/focus loss, and mobile input. |
| Camera/rendering | Canvas 2D, fixed-scale world-to-screen transform, camera centered on local vehicle; Canvas-drawn car and HUD. | **KEEP** for first playable milestones; **REPLACE/EXTEND only by evidence** if the 3D target cannot be met within Canvas. A 3D renderer is a future architectural decision, not part of the existing system. |
| HUD/audio | Canvas HUD shows speed, local rank fallback, completed laps, time, engine temperature, tires; Web Audio synthesizes effects/music. | **KEEP** as original prototypes; extend after game-state data is correct. Do not claim the HUD is a functional race HUD while lap/position data is incomplete. |
| Test coverage | Vitest covers math, physics/collision helpers, default-track spawn geometry, one server-loop wall collision, and Socket.IO room/snapshot basics. | **KEEP/EXTEND** with race progression, stability, input, surface, collision integration, and browser acceptance tests. |

### Broken, incomplete, or potentially misleading behavior

- A rendered oval and boundary response exist, but track checkpoints and lap
  progression are not integrated; driving around it does not complete a scored
  lap.
- Server surface resolution receives `[]`, resulting in asphalt fallback. The
  track has no off-road surface zones.
- Race standings remain empty; no AI, finish/results lifecycle, or restart flow
  is integrated.
- `PlayerInput.brake` is a brake force, not a reverse command. No reverse gear
  or reverse-speed parameter exists.
- Steering uses a configured angular rate scaled from 15% at standstill toward
  full rate at configured maximum speed. It is not a measured reference model,
  and it does not establish high-speed steering reduction.
- `oversteerFactor` divides the selected lateral grip only when greater than
  one; values below one do not implement a symmetric understeer model.
- `downforceCoef` is in the vehicle config but was not consumed in the inspected
  `integrate` implementation.
- Car/wall response changes position and velocity but does not update yaw from
  an impact. Collision feel is not yet validated in the live browser.
- A start event moves the client into the race, but there is no in-game
  countdown sequence despite countdown-related shared contracts.
- The existing browser supports movement around the oval; no full lap was
  verified. Compilation and a moving car are not acceptance of a playable
  racing game.

## Reference behavior categories

All rows below are pending direct observation. The project brief describes
questions to investigate, not measured properties of F1 2002.

| Category | Evidence / current conclusion | Observation to collect | Confidence |
|---|---|---|---|
| Overall game character | Desired target is early-2000s arcade open-wheel racing; no direct session observed. | Run a repeatable short race and record pace, intensity, assistance, and race rhythm. | UNKNOWN |
| Vehicle behavior | No vehicle session directly observed; the implementation's current behavior is summarized under repository forensics, not attributed to the reference. | Track speed, heading, acceleration, lateral velocity, and response to controlled input through corner entry, apex, exit, and recovery. | UNKNOWN |
| Vehicle physics | No reference telemetry. Current game has a 2D point-mass-like force model. | Log vehicle speed, heading, acceleration, and position against time under fixed inputs. | UNKNOWN |
| Steering | No response curve measured. | Full/small steering, rapid reversal, steady-radius turns at low/medium/high speed. | UNKNOWN |
| Acceleration | No acceleration times measured. | 0–50/100/150/200/250/300 km/h where attainable; record gear/throttle and conditions. | UNKNOWN |
| Braking | No stopping data measured. | 300–200, 200–100, and 100–0 km/h times/distances; straight and combined braking/turning. | UNKNOWN |
| Grip | No threshold behavior observed. | Normal corner, late braking, excessive steering, throttle-on exit, and rapid steering corrections. | UNKNOWN |
| Slip / drift | No slip angles or recovery time observed. | Compare heading with velocity direction during entry, sustained cornering, slide, and recovery. | UNKNOWN |
| Oversteer | No controlled throttle/steer test observed. | Measure yaw and lateral path under progressively higher throttle/steering in a corner. | UNKNOWN |
| Understeer | No speed sweep observed. | Fixed-radius turn at increasing speed; record path widening and recovery after throttle release. | UNKNOWN |
| Collision | No reference impact observed. | Repeat car-wall, car-car, and obstacle hits at fixed approach speeds/angles; measure speed/yaw changes and recovery. | UNKNOWN |
| Off-road behavior | No surface comparison observed. | Matched road-to-grass/gravel/sand runs; compare acceleration, braking, grip, speed, and recovery. | UNKNOWN |
| Track surfaces | No surface response observed. | Identify visible/testable surfaces and compare matched maneuvers. Do not assume material coefficients. | UNKNOWN |
| Tracks | No track session inspected. | Observe racing rhythm, width, corner sequence, runoff, curb readability, and landmark spacing; design an original course. | UNKNOWN |
| AI | No AI behavior observed. | Record pace, braking points, lines, spacing, mistakes, collision recovery, and off-track recovery across several cars. | UNKNOWN |
| Overtaking | No pass behavior observed. | Observe approach, overlap, inside/outside choices, defensive moves, contact tolerance, and exit acceleration. | UNKNOWN |
| Slipstream | No controlled drafting comparison observed. | Compare speed/acceleration in matched aligned-following and offset/no-leader conditions. | UNKNOWN |
| Camera | No camera motion measured. | Capture vehicle size, follow distance, look-ahead, smoothing, rotation, and responses to speed/turn/impact. | UNKNOWN |
| Speed perception | No presentation comparison performed. | Relate measured speed to FOV/zoom, camera movement, scenery density, audio pitch, and roadside motion. | UNKNOWN |
| HUD | No reference UI inspection recorded. | Inventory persistent versus event-only information and relative visual priority; create original layout. | UNKNOWN |
| Minimap | No reference map inspection recorded. | Record orientation, scale, player/opponent markers, placement, and update/readability behavior. | UNKNOWN |
| Visual language | Only the user’s broad era description is available. | Describe geometry, palette, contrast, scenery density, materials, lighting, and effects without copying assets. | UNKNOWN |
| Audio behavior | No reference audio session observed. | Record engine pitch/throttle/gear relation, tire slip/brake, collision intensity, and environmental/UI cues. | UNKNOWN |
| Performance | No frame-time or load data observed. | Record frame pacing, input latency, physics/race load, and visible stalls on the selected reference setup. | UNKNOWN |

## Observation record template

Use one record per behavior rather than combining unrelated claims:

```text
## Observation: <behavior and test condition>

Reference:
F1 2002

Category:
<one category from the table above>

Situation:
<vehicle, section, speed range, surface, weather, assists and setup>

Input:
<device and reproducible control sequence>

Observed:
- <directly observed result, separated from interpretation>

Measurement:
<value/range, unit, method; or "not measured">

Evidence:
<direct gameplay observation, recording, measurement notes, or inference>

Confidence:
HIGH | MEDIUM | LOW

Interpretation:
<behavioral explanation, explicitly marked as interpretation>

Implementation hypothesis:
<independent, testable model; do not copy implementation>

Parameter candidates:
<centralized parameter names, if known>

Status:
To be tested | Tested | Superseded
```

Unknown is used in the category inventory until enough evidence exists to
assign a confidence level to an actual observation.

## Original reference test-track specification

This is a **proposed internal test environment**, not an F1 2002 track and not
the current `Copperfield Oval`. Its layout is a sequence of independent
measurement zones on a closed test course. Geometry and dimensions remain
`TBD` until the dynamics harness is available; do not copy a reference circuit.

1. **Start/measurement straight** — long enough for repeatable acceleration
   runs; mark timing gates at distances needed for 0–50 through 0–300 km/h
   tests, with unreachable targets recorded as such.
2. **Braking approach** — straight braking markers with run-off and distance
   gates to measure staged deceleration without contacting a wall.
3. **Hairpin** — low-speed tight-radius turn for steering lock, low-speed
   rotation, braking-to-turn transition, and exit traction.
4. **Medium-radius corner** — fixed-radius section for stable cornering speed,
   lateral acceleration, and understeer sweeps.
5. **High-speed corner** — broad-radius section with safe run-off for
   high-speed steering and stability tests.
6. **S-curve** — consecutive opposite turns for transient response,
   left-center-right steering, and yaw/slip recovery.
7. **Off-road sample and rejoin** — clearly bounded, short surface lane with
   controllable entry/exit and no forced high-speed impact; compare road and
   alternate-surface behavior.
8. **Collision lane** — replaceable wall segment and marked approach lanes for
   reproducible angle/speed collision runs; keep it physically separated from
   the main driving line.
9. **Return/finish straight** — reconnect all zones to the start without
   intersections that confuse lap detection.

Required metadata when implemented: units in metres/radians, centerline,
boundaries, surface zones, timing gates/checkpoints, spawn heading, and safety
run-off. Test scenarios must specify initial vehicle state, fixed timestep,
input trace, expected metric, tolerance, and seed if randomness is introduced.

## Reference questions and observation plan

No reference values should become tuning targets until evidence exists. When a
reference copy/emulator is available to the user, request or record:

- Version/platform, control device, assists/difficulty, selected car, track,
  weather, and capture method.
- Whether measurements can be repeated with the same setup.
- Acceleration and braking timing/distance markers and speed display accuracy.
- Steering response and grip loss on at least one low-, medium-, and
  high-speed corner.
- Wall/car impact response, off-road penalty and recovery.
- AI pace/racing line/overtake behavior and whether drafting is measurable.
- Camera/HUD/minimap/audio observations needed to separate simulation feel
  from visual or auditory speed cues.

Store each observation using the format in
[REFERENCE_BEHAVIOR_SPEC.md](./REFERENCE_BEHAVIOR_SPEC.md). If the reference
cannot be measured directly, keep the target explicitly unknown and build a
playable original game from a declared design target rather than inventing
reference facts.

## Roadmap and stop boundary

1. Complete controlled reference observations and fill unknown categories.
2. Build the data-driven reference test track and deterministic comparison
   harness.
3. Validate math, state, integration, acceleration, braking, steering, grip,
   slip, collisions, and surface transitions in that order.
4. Integrate track and race logic only after the physics metrics are stable.
5. Add AI that emits the same input contract as a human and uses the same
   physics path.
6. Tune camera, HUD, audio, and visual effects after simulation correctness.
7. Profile measured bottlenecks; optimize only after correctness/stability.

This file records analysis and proposed work only. Do not treat its roadmap as
authorization for a large rewrite; implement one measured, testable stage at a
time.
