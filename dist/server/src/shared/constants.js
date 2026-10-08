"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULTS_DELAY_MS = exports.MIN_PLAYERS_TO_START = exports.COUNTDOWN_DURATION_S = exports.WORLD_COORD_SYSTEM = exports.DRIFT_VFX_THRESHOLD_RAD = exports.DEFAULT_PROXY_MODE = exports.ENGINE_OVERHEAT_SPEED_FACTOR = exports.ENGINE_CRITICAL_THRESHOLD = exports.ENGINE_OVERHEAT_THRESHOLD = exports.SLIPSTREAM_DRAG_K = exports.SLIPSTREAM_HALF_ANGLE_DEG = exports.SLIPSTREAM_DISTANCE = exports.WETNESS_DECAY_RATE = exports.WET_FRICTION_REDUCTION = exports.VEHICLE_RADIUS = exports.MAX_SPEED_MS = exports.JOIN_RATE_LIMIT = exports.MAX_PLAYERS = exports.PIN_MAX = exports.PIN_MIN = exports.PIN_LENGTH = exports.SERVER_PORT = exports.INTERPOLATION_DELAY_MS = exports.TICKS_PER_SNAPSHOT = exports.NETWORK_SNAP_HZ = exports.MAX_PHYSICS_STEPS = exports.PHYSICS_DT = exports.PHYSICS_TICK_HZ = void 0;
// ---------------------------------------------------------------------------
// Physics simulation
// ---------------------------------------------------------------------------
/**
 * SERVER_ONLY — Physics tick rate in Hz.
 * The server's GameLoop calls PhysicsWorld.integrate() at this rate.
 * dt = 1 / PHYSICS_TICK_HZ = 0.016667 s
 */
exports.PHYSICS_TICK_HZ = 60;
/** Fixed physics timestep in seconds. Computed from PHYSICS_TICK_HZ. */
exports.PHYSICS_DT = 1 / exports.PHYSICS_TICK_HZ; // 0.016667 s
/**
 * SERVER_ONLY — Maximum number of physics ticks processed per real-time
 * game-loop iteration. Prevents spiral-of-death on CPU spikes.
 * If real elapsed time > MAX_PHYSICS_STEPS * PHYSICS_DT, excess time is dropped.
 */
exports.MAX_PHYSICS_STEPS = 3;
// ---------------------------------------------------------------------------
// Networking
// ---------------------------------------------------------------------------
/**
 * SERVER_ONLY — Snapshot broadcast rate in Hz.
 * One snapshot is emitted every (PHYSICS_TICK_HZ / NETWORK_SNAP_HZ) = 3 ticks.
 * Spec note: "15–20 Hz" mentioned; we use 20 Hz (consistent with "every 3 ticks").
 */
exports.NETWORK_SNAP_HZ = 20;
/**
 * Derived — how many physics ticks elapse between each snapshot broadcast.
 * Must be a whole number. Assert: PHYSICS_TICK_HZ % NETWORK_SNAP_HZ === 0.
 */
exports.TICKS_PER_SNAPSHOT = exports.PHYSICS_TICK_HZ / exports.NETWORK_SNAP_HZ; // 3
/**
 * CLIENT_ONLY — How far behind the latest received snapshot the client renders (ms).
 * Creates a buffer of snapshots to smooth over network jitter.
 * With 20 Hz snapshots (50 ms apart), 100 ms holds ~2 snapshots.
 */
exports.INTERPOLATION_DELAY_MS = 100;
/** Default server port. */
exports.SERVER_PORT = 3000;
// ---------------------------------------------------------------------------
// Room / PIN
// ---------------------------------------------------------------------------
/** Number of digits in a room join code. */
exports.PIN_LENGTH = 6;
/** Smallest valid PIN value (100000 for a 6-digit code with no leading zeros). */
exports.PIN_MIN = 100_000;
/** Largest valid PIN value (999999). */
exports.PIN_MAX = 999_999;
/** Default maximum number of human players per room. */
exports.MAX_PLAYERS = 8;
/**
 * Maximum join attempts per IP per minute before rate-limiting kicks in.
 * Prevents brute-force PIN attacks.
 */
exports.JOIN_RATE_LIMIT = 5;
// ---------------------------------------------------------------------------
// Vehicle physics defaults
// (Override in individual VehicleConfig objects)
// ---------------------------------------------------------------------------
/**
 * Maximum vehicle speed in m/s.
 * Derived constraint: must satisfy maxSpeed <= VEHICLE_RADIUS / PHYSICS_DT
 * to prevent tunnelling through walls in a single tick.
 * VEHICLE_RADIUS = 0.5 m → maxSpeed <= 0.5 / 0.01667 ≈ 30 m/s.
 * 30 m/s ≈ 108 km/h, reasonable for an arcade kart.
 */
exports.MAX_SPEED_MS = 30;
/** Default collision circle radius in metres. */
exports.VEHICLE_RADIUS = 0.5;
// ---------------------------------------------------------------------------
// Grip & handling
// ---------------------------------------------------------------------------
/**
 * Friction multiplier for a wet road at maximum rain intensity.
 * effectiveFriction = baseFriction * (1 - WET_FRICTION_REDUCTION * wetness)
 * At wetness=1, friction is halved.
 */
exports.WET_FRICTION_REDUCTION = 0.5;
/**
 * Rate at which road wetness decays after rain stops (wetness units / second).
 * At 0.01/s, a fully saturated road dries in 100 s.
 */
exports.WETNESS_DECAY_RATE = 0.01;
// ---------------------------------------------------------------------------
// Slipstream / Drafting
// ---------------------------------------------------------------------------
/** Maximum distance behind a leader at which drafting activates (metres). */
exports.SLIPSTREAM_DISTANCE = 10;
/**
 * Half-angle of the drafting cone in degrees.
 * Follower must be within ±SLIPSTREAM_HALF_ANGLE° of the leader's rear.
 */
exports.SLIPSTREAM_HALF_ANGLE_DEG = 15;
/**
 * Maximum drag reduction factor in the draft.
 * effectiveDrag = baseDrag * (1 - SLIPSTREAM_DRAG_K * slipFactor)
 * 0.2 = up to 20% drag reduction at closest following distance.
 */
exports.SLIPSTREAM_DRAG_K = 0.2;
// ---------------------------------------------------------------------------
// Engine temperature
// ---------------------------------------------------------------------------
/** Engine temperature at which power begins to degrade (°C). */
exports.ENGINE_OVERHEAT_THRESHOLD = 120;
/** Engine temperature at which the car is forced to slow to a crawl (°C). */
exports.ENGINE_CRITICAL_THRESHOLD = 150;
/** Speed multiplier applied when engine is critically overheated. */
exports.ENGINE_OVERHEAT_SPEED_FACTOR = 0.4;
// ---------------------------------------------------------------------------
// Debug / Proxy
// ---------------------------------------------------------------------------
/**
 * Default proxy mode state.
 * true  = use Canvas primitives (rectangles, lines) — no asset loading.
 * false = use real sprites.
 * Toggled by the [F1] key at runtime.
 */
exports.DEFAULT_PROXY_MODE = true;
/**
 * Minimum slip angle (radians of lateral vs forward velocity) before
 * tire-smoke VFX and skid-sound activate.
 */
exports.DRIFT_VFX_THRESHOLD_RAD = 0.2;
// ---------------------------------------------------------------------------
// Coordinate system — frozen, never change without updating INVARIANTS doc
// ---------------------------------------------------------------------------
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
exports.WORLD_COORD_SYSTEM = "X_RIGHT_Y_UP_RADIANS_CCW";
// ---------------------------------------------------------------------------
// Race
// ---------------------------------------------------------------------------
/** Duration of the countdown phase in seconds (3-2-1-GO). */
exports.COUNTDOWN_DURATION_S = 4;
/** Minimum number of players required to start a race. */
exports.MIN_PLAYERS_TO_START = 1;
/** Time after all players finish before the race results screen is shown (ms). */
exports.RESULTS_DELAY_MS = 3_000;
// ---------------------------------------------------------------------------
// Type-level assertions (evaluated at module load in tests)
// ---------------------------------------------------------------------------
// Ensure TICKS_PER_SNAPSHOT is a whole number
if (exports.PHYSICS_TICK_HZ % exports.NETWORK_SNAP_HZ !== 0) {
    throw new Error(`PHYSICS_TICK_HZ (${exports.PHYSICS_TICK_HZ}) must be evenly divisible by ` +
        `NETWORK_SNAP_HZ (${exports.NETWORK_SNAP_HZ}).`);
}
// Ensure MAX_SPEED_MS does not exceed tunnelling threshold
const _tunnelLimit = exports.VEHICLE_RADIUS / exports.PHYSICS_DT;
if (exports.MAX_SPEED_MS > _tunnelLimit) {
    throw new Error(`MAX_SPEED_MS (${exports.MAX_SPEED_MS} m/s) exceeds tunnelling safety limit ` +
        `(VEHICLE_RADIUS / PHYSICS_DT = ${_tunnelLimit.toFixed(2)} m/s). ` +
        `Reduce MAX_SPEED_MS or increase VEHICLE_RADIUS.`);
}
//# sourceMappingURL=constants.js.map