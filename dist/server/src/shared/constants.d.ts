/**
 * src/shared/constants.ts
 *
 * All tunable game parameters in one place.
 *
 * RULES:
 * - Import this file; never hardcode these values in game logic.
 * - Both server and client import from here.
 * - Parameters marked SERVER_ONLY must not affect client rendering logic.
 * - Parameters marked CLIENT_ONLY must not affect server physics logic.
 *
 * Ref: Implementation Plan Phase 1 / spec Section 12 "Key Parameters".
 */
/**
 * SERVER_ONLY — Physics tick rate in Hz.
 * The server's GameLoop calls PhysicsWorld.integrate() at this rate.
 * dt = 1 / PHYSICS_TICK_HZ = 0.016667 s
 */
export declare const PHYSICS_TICK_HZ: 60;
/** Fixed physics timestep in seconds. Computed from PHYSICS_TICK_HZ. */
export declare const PHYSICS_DT: number;
/**
 * SERVER_ONLY — Maximum number of physics ticks processed per real-time
 * game-loop iteration. Prevents spiral-of-death on CPU spikes.
 * If real elapsed time > MAX_PHYSICS_STEPS * PHYSICS_DT, excess time is dropped.
 */
export declare const MAX_PHYSICS_STEPS: 3;
/**
 * SERVER_ONLY — Snapshot broadcast rate in Hz.
 * One snapshot is emitted every (PHYSICS_TICK_HZ / NETWORK_SNAP_HZ) = 3 ticks.
 * Spec note: "15–20 Hz" mentioned; we use 20 Hz (consistent with "every 3 ticks").
 */
export declare const NETWORK_SNAP_HZ: 20;
/**
 * Derived — how many physics ticks elapse between each snapshot broadcast.
 * Must be a whole number. Assert: PHYSICS_TICK_HZ % NETWORK_SNAP_HZ === 0.
 */
export declare const TICKS_PER_SNAPSHOT: number;
/**
 * CLIENT_ONLY — How far behind the latest received snapshot the client renders (ms).
 * Creates a buffer of snapshots to smooth over network jitter.
 * With 20 Hz snapshots (50 ms apart), 100 ms holds ~2 snapshots.
 */
export declare const INTERPOLATION_DELAY_MS: 100;
/** Default server port. */
export declare const SERVER_PORT: 3000;
/** Number of digits in a room join code. */
export declare const PIN_LENGTH: 6;
/** Smallest valid PIN value (100000 for a 6-digit code with no leading zeros). */
export declare const PIN_MIN: 100000;
/** Largest valid PIN value (999999). */
export declare const PIN_MAX: 999999;
/** Default maximum number of human players per room. */
export declare const MAX_PLAYERS: 8;
/**
 * Maximum join attempts per IP per minute before rate-limiting kicks in.
 * Prevents brute-force PIN attacks.
 */
export declare const JOIN_RATE_LIMIT: 5;
/**
 * Maximum vehicle speed in m/s.
 * Derived constraint: must satisfy maxSpeed <= VEHICLE_RADIUS / PHYSICS_DT
 * to prevent tunnelling through walls in a single tick.
 * VEHICLE_RADIUS = 0.5 m → maxSpeed <= 0.5 / 0.01667 ≈ 30 m/s.
 * 30 m/s ≈ 108 km/h, reasonable for an arcade kart.
 */
export declare const MAX_SPEED_MS: 30;
/** Default collision circle radius in metres. */
export declare const VEHICLE_RADIUS: 0.5;
/**
 * Friction multiplier for a wet road at maximum rain intensity.
 * effectiveFriction = baseFriction * (1 - WET_FRICTION_REDUCTION * wetness)
 * At wetness=1, friction is halved.
 */
export declare const WET_FRICTION_REDUCTION: 0.5;
/**
 * Rate at which road wetness decays after rain stops (wetness units / second).
 * At 0.01/s, a fully saturated road dries in 100 s.
 */
export declare const WETNESS_DECAY_RATE: 0.01;
/** Maximum distance behind a leader at which drafting activates (metres). */
export declare const SLIPSTREAM_DISTANCE: 10;
/**
 * Half-angle of the drafting cone in degrees.
 * Follower must be within ±SLIPSTREAM_HALF_ANGLE° of the leader's rear.
 */
export declare const SLIPSTREAM_HALF_ANGLE_DEG: 15;
/**
 * Maximum drag reduction factor in the draft.
 * effectiveDrag = baseDrag * (1 - SLIPSTREAM_DRAG_K * slipFactor)
 * 0.2 = up to 20% drag reduction at closest following distance.
 */
export declare const SLIPSTREAM_DRAG_K: 0.2;
/** Engine temperature at which power begins to degrade (°C). */
export declare const ENGINE_OVERHEAT_THRESHOLD: 120;
/** Engine temperature at which the car is forced to slow to a crawl (°C). */
export declare const ENGINE_CRITICAL_THRESHOLD: 150;
/** Speed multiplier applied when engine is critically overheated. */
export declare const ENGINE_OVERHEAT_SPEED_FACTOR: 0.4;
/**
 * Default proxy mode state.
 * true  = use Canvas primitives (rectangles, lines) — no asset loading.
 * false = use real sprites.
 * Toggled by the [F1] key at runtime.
 */
export declare const DEFAULT_PROXY_MODE: true;
/**
 * Minimum slip angle (radians of lateral vs forward velocity) before
 * tire-smoke VFX and skid-sound activate.
 */
export declare const DRIFT_VFX_THRESHOLD_RAD: 0.2;
/**
 * World coordinate system contract (INV-12):
 *   X = right
 *   Y = up / forward
 *   Angles in radians, counter-clockwise positive
 *   Units: metres
 *
 * Canvas coordinate system (Y-down) is handled exclusively in Renderer.ts
 * via worldToScreen(). Nothing else performs coordinate conversion.
 */
export declare const WORLD_COORD_SYSTEM: "X_RIGHT_Y_UP_RADIANS_CCW";
/** Duration of the countdown phase in seconds (3-2-1-GO). */
export declare const COUNTDOWN_DURATION_S: 4;
/** Minimum number of players required to start a race. */
export declare const MIN_PLAYERS_TO_START: 1;
/** Time after all players finish before the race results screen is shown (ms). */
export declare const RESULTS_DELAY_MS: 3000;
//# sourceMappingURL=constants.d.ts.map