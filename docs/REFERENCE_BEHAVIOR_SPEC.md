# Reference Behavior Specification

This file contains implementation-relevant conclusions only. Reference claims
are intentionally separated from repository facts. No direct F1 2002
observation or measurement was available for this specification pass, so all
reference target values and behaviors remain **unknown**. Do not turn the
project's broad arcade-racing goal into claims about the reference.

See [F1_2002_REFERENCE_ANALYSIS.md](./F1_2002_REFERENCE_ANALYSIS.md) for
forensics, observation protocol, unknowns, and the original test-track plan.
See [PHYSICS_TUNING_SPEC.md](./PHYSICS_TUNING_SPEC.md) for current code values
and provisional validation constraints.

## Verified implementation facts

- Simulation state is server authoritative; clients send control inputs and
  receive snapshots.
- Physics uses a nominal 60 Hz fixed timestep and caps accumulated work to
  three fixed steps per timer callback.
- Snapshot broadcasting is configured for 20 Hz.
- `KartPhysics.integrate` uses velocity projection onto forward/lateral axes,
  a configured yaw rate, throttle force, quadratic forward drag, rolling
  resistance, brake force, lateral-velocity decay, and a speed cap.
- Server `ServerLoop` applies `resolveWallCollisions` and
  `resolveSphereCollision`.
- Surface response supports definitions and wet-weather modifiers, but the
  live server currently supplies an empty surface list; asphalt fallback is
  used.
- `DEFAULT_TRACK` is an original oval with collision boundaries and eight
  spawn points. It has no checkpoint definitions or racing-line progress.
- The current client is Canvas 2D with a fixed-scale, player-centered view,
  local snapshot interpolation, keyboard/touch controls, and synthesized audio.
- Existing tests cover math, physics helper behavior, track spawn validity,
  server-loop wall collision, and basic socket/snapshot behavior. They do not
  verify reference matching or full race playability.

## Implementation consequences

1. Keep `Vector2`, `MathUtils`, shared serializable contracts, fixed-step
   integration, and collision helpers as the current foundation. Preserve
   behavior unless a test or observation demonstrates a problem.
2. Before tuning handling, build repeatable physics tests and a dedicated
   original reference test course. Log initial state, input trace, timestep,
   surface, measured output, tolerance, and confidence.
3. Treat all reference timing, force, speed, grip, steering, collision, AI,
   camera, HUD, and audio parameters as **TBD** until directly observed.
4. Establish vehicle movement, acceleration, braking, steering, grip, slip,
   collision, and surfaces before AI and presentation polish.
5. Connect actual track surface metadata before claiming off-road or wet
   handling. Do not scatter material-specific branches through physics.
6. Add reverse as an explicit control/dynamics behavior, not as an accidental
   consequence of brake sign handling.
7. Use one shared vehicle-physics path for human and AI inputs. AI must not
   directly teleport or mutate positions.
8. Implement ordered checkpoints, progress, standings, finish/results, and
   restart as authoritative race logic before advertising laps or position as
   functional.
9. Keep current Canvas rendering as the low-risk prototype path. The brief's
   desired 3D presentation conflicts with the existing 2D renderer; decide on a
   renderer only after the playable loop and a small visual prototype establish
   whether Canvas is insufficient.
10. Report unknowns honestly. Never claim a match from compilation, a passing
    unit test, or an unmeasured visual impression.

## Comparison protocol

For each future tuning change:

1. Capture the reference behavior and conditions; label evidence measured,
   estimated, observed, or inferred, and assign HIGH/MEDIUM/LOW confidence.
2. Run the same controlled scenario on the internal test course.
3. Compare named metrics (e.g. acceleration time, stopping distance, turn
   radius, slip angle, collision speed loss) with stated units and tolerances.
4. Change one parameter family at a time in the mandated tuning order.
5. Record results, regressions, and remaining uncertainty before proceeding.
