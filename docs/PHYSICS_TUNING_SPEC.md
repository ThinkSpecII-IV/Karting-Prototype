# Physics Tuning Specification

All values in the "current value" column describe the implementation inspected,
not the F1 2002 reference. No direct reference measurements were available;
therefore reference targets are `UNKNOWN`. Ranges marked "unestablished" must
be determined by reproducible tests and reference comparison, not guessed.

The "acceptable range" column distinguishes known code constraints from
unestablished tuning ranges. It is not permission to change the physics.

| Parameter | Meaning | Unit | Reference target | Current value | Acceptable range / constraint | Confidence | Test method |
|---|---|---|---|---:|---|---|---|
| `PHYSICS_TICK_HZ` | Nominal server simulation scheduling rate | Hz | UNKNOWN | 60 | Fixed `dt = 1/60 s`; runtime jitter still needs measurement | HIGH for code value; UNKNOWN vs reference | Profile tick interval and fixed-step count under idle/load/stall conditions |
| `PHYSICS_DT` | Physics integration timestep | s | UNKNOWN | 0.0166667 | Derived exactly as `1 / PHYSICS_TICK_HZ` | HIGH for code value; UNKNOWN vs reference | Assert all integrations receive fixed dt; long-run stability simulation |
| `MAX_PHYSICS_STEPS` | Maximum fixed physics steps processed per timer callback | steps/callback | UNKNOWN | 3 | Positive integer; excess elapsed time is dropped by current accumulator | HIGH for code value; UNKNOWN vs reference | Simulate timer stalls; count catch-up steps and lost simulation time |
| `NETWORK_SNAP_HZ` | Snapshot broadcast rate | Hz | UNKNOWN | 20 | Whole-number divisor of tick rate (currently 3 ticks/snapshot) | HIGH for code value; UNKNOWN vs reference | Timestamp snapshot interval distribution in server integration test |
| `mass` | Vehicle inertial mass | kg | UNKNOWN | 180 | Must be finite and greater than zero; tuned interval unestablished | HIGH for code value; UNKNOWN vs reference | Acceleration/braking tests at fixed input; verify inverse mass response |
| `enginePower` | Maximum longitudinal engine force | N | UNKNOWN | 2200 | Finite, non-negative; performance-safe interval unestablished | HIGH for code value; UNKNOWN vs reference | 0–50/100/... speed-time traces; terminal-speed test |
| `brakeForce` | Configured longitudinal brake force | N | UNKNOWN | 3500 | Finite, non-negative; reverse/near-zero behavior requires a dedicated test | HIGH for code value; UNKNOWN vs reference | 100–0, 200–100, corner-entry and stop-from-rest tests |
| `maxSpeed` | Per-vehicle speed ceiling before global cap | m/s | UNKNOWN | 25 (90 km/h) | Current global limiter is `MAX_SPEED_MS = 30 m/s`; effective ceiling also depends on surface/overheat | HIGH for code value; UNKNOWN vs reference | Sustained-throttle terminal-speed test; assert no overshoot |
| `MAX_SPEED_MS` | Global anti-tunneling speed cap | m/s | UNKNOWN | 30 (108 km/h) | Current comment derives it from `VEHICLE_RADIUS / PHYSICS_DT`; value is a project invariant candidate, not a reference target | HIGH for code value; UNKNOWN vs reference | High-speed cap plus wall-collision penetration test |
| `steeringRate` | Maximum configured yaw rate at full steering | rad/s | UNKNOWN | 2.8 | Finite and non-negative; acceptable handling interval unestablished | HIGH for code value; UNKNOWN vs reference | Constant steering at multiple speeds; measure yaw rate and path radius |
| `MIN_STEER_RATIO` | Minimum speed scale on yaw rate | dimensionless | UNKNOWN | 0.15 (local constant) | Current formula scales from 0.15 to 1.0 as speed approaches max; measure before redesign | HIGH for code value; UNKNOWN vs reference | From-rest steering and fixed-speed steering sweep |
| `lateralGrip` | Baseline lateral velocity decay/grip scalar | dimensionless | UNKNOWN | 0.82 | Input is clamped through surface resolution to `[0,1]` | HIGH for code value; UNKNOWN vs reference | Inject known lateral velocity; record decay over fixed ticks and dt variants |
| `driftGrip` | Lateral grip used when drift input is active | dimensionless | UNKNOWN | 0.25 | Current path uses same `[0,1]` clamp; whether a dedicated drift mode is desired is unknown | HIGH for code value; UNKNOWN vs reference | Matched steering/input traces with drift on/off; compare slip and recovery |
| `oversteerFactor` | Divisor reducing selected lateral grip when >1 | dimensionless | UNKNOWN | 1.0 | Code applies `baseGrip / max(value, 1)`; values below 1 have no effect; meaningful range unestablished | HIGH for code semantics; UNKNOWN vs reference | Same maneuver across factors; measure lateral velocity, slip angle, and recovery |
| `downforceCoef` | Declared intended speed-dependent grip addition | dimensionless (intended) | UNKNOWN | 0.08, **not consumed by inspected integrator** | No runtime range until wired and dimension/formula are specified | HIGH for declaration/non-use; UNKNOWN vs reference | Add a test only after deciding and implementing a physically coherent model |
| `dragCoef` | Coefficient in quadratic forward drag `C·v²` | N/(m/s)² | UNKNOWN | 1.1 | Finite, non-negative; calibrated interval unestablished | HIGH for code value; UNKNOWN vs reference | Throttle/coast speed curves and terminal-speed fit |
| `rollingResistance` | Constant opposing force while moving | N | UNKNOWN | 60 | Finite, non-negative; calibrated interval unestablished | HIGH for code value; UNKNOWN vs reference | Coast-down from several speeds; check stop/no-creep behavior |
| `collisionRadius` | Circle radius used for vehicle collision tests | m | UNKNOWN | 0.5 | Positive; current effective max-speed comment couples radius to timestep | HIGH for code value; UNKNOWN vs reference | Head-on, glancing, stationary overlap, and wall-edge cases |
| `WALL_RESTITUTION` | Normal-velocity retention on wall impact | dimensionless | UNKNOWN | 0.6 | Current default in `[0,1]`; validate repeated contacts and stable separation | HIGH for code value; UNKNOWN vs reference | Fixed-speed impacts at normal and oblique angles; measure post-impact speed |
| `KART_RESTITUTION` | Normal-velocity retention for car-car collision | dimensionless | UNKNOWN | 0.4 | Current default in `[0,1]`; equal-mass resolver assumption must be reviewed | HIGH for code value; UNKNOWN vs reference | Head-on/glancing/stationary-overlap tests; check momentum/energy and jitter |
| `WET_FRICTION_REDUCTION` | Maximum friction reduction from wetness | dimensionless | UNKNOWN | 0.5 | Current clamp keeps combined friction in `[0,1]`; surface behavior not wired in live race | HIGH for code value; UNKNOWN vs reference | Matched dry/wet acceleration, braking, and lateral-slip tests |
| `engineHeatRate` | Engine-temperature gain at full throttle | °C/s | UNKNOWN | 5.0 | Finite, non-negative; game relevance/reference basis unestablished | HIGH for code value; UNKNOWN vs reference | Sustained throttle/ambient-temperature tests |
| `coolingRate` | Proportional cooling coefficient | 1/s | UNKNOWN | 0.08 | Finite, non-negative; cooling model is explicit Euler per fixed dt | HIGH for code value; UNKNOWN vs reference | Compare cooling curves at multiple dt/ambient values and bounded temperature |
| `VEHICLE_RADIUS` | Shared radius referenced in global speed constraint | m | UNKNOWN | 0.5 | Current source comments expect `MAX_SPEED_MS <= radius / dt`; reconcile with actual per-config radii | HIGH for code value; UNKNOWN vs reference | Validate every config against collision/tunneling tests |
| Throttle input | Forward propulsion control | normalized | UNKNOWN | `[0,1]` after `clamp01` in integration | `[0,1]` | HIGH for code behavior; UNKNOWN vs reference | Step/ramp throttle input and record acceleration response |
| Brake input | Current brake force control (not reverse gear) | normalized | UNKNOWN | `[0,1]` after `clamp01` | `[0,1]`; low-speed sign behavior must be tested | HIGH for code behavior; UNKNOWN vs reference | Stop from rest, forward stop, reverse-state test, brake+throttle test |
| Steering input | Requested yaw direction/magnitude | normalized | UNKNOWN | `[-1,1]` payload contract | `[−1,1]` by contract; server validation should be verified | HIGH for contract; UNKNOWN vs reference | Full/partial input, rapid reversal, malformed network payload |
| Surface speed/acceleration multipliers | Surface-specific caps/force multipliers | dimensionless | UNKNOWN | Asphalt fallback `1.0`; no active track surface list | Non-negative finite; response clamps effective speed/acceleration to `[0,1]` | HIGH for current path; UNKNOWN vs reference | Road/off-road transitions once zones are passed into server |

## Status and cautions

- The default vehicle config is currently described in code as a balanced
  reference kart, but its `25 m/s` ceiling is kart-scale and is not evidence of
  an open-wheel F1-class target.
- `DEFAULT_KART_CONFIG` is passed to all vehicles; per-model configs are not
  implemented.
- The current integration computes `dragCoef * vForward²` and applies the sign
  based on forward/reverse motion; test low-speed deceleration carefully.
- `brake` does not define a reverse gear or reverse top speed. Do not infer
  reverse capability from signed force behavior.
- `downforceCoef` is declared but unused in the inspected integration path.
- All acceptable ranges beyond explicit clamps/code constraints are
  unestablished. Select them only after test-course baselines and observations.
- A row's high confidence in a code value means the source states that value;
  it does **not** increase confidence in its similarity to the reference.

## Required test harness outputs

For each test run record: parameter-set identifier, track section, initial
position/rotation/velocity, input trace, weather/surface, fixed timestep,
sample frequency, measured speed/acceleration/yaw/slip/collision outcomes,
expected bound, result, and seed if randomness is added. Assert all state
outputs are finite; reject NaN/infinity, impossible speed, unbounded position,
and nonrecovering collision overlap.
