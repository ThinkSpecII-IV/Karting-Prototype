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

// ---------------------------------------------------------------------------
// Physics simulation
// ---------------------------------------------------------------------------

/**
 * SERVER_ONLY — Physics tick rate in Hz.
 * The server's GameLoop calls PhysicsWorld.integrate() at this rate.
 * dt = 1 / PHYSICS_TICK_HZ = 0.016667 s
 */
export const PHYSICS_TICK_HZ = 60 as const;

/** Fixed physics timestep in seconds. Computed from PHYSICS_TICK_HZ. */
export const PHYSICS_DT = 1 / PHYSICS_TICK_HZ; // 0.016667 s

/**
 * SERVER_ONLY — Maximum number of physics ticks processed per real-time
 * game-loop iteration. Prevents spiral-of-death on CPU spikes.
 * If real elapsed time > MAX_PHYSICS_STEPS * PHYSICS_DT, excess time is dropped.
 */
export const MAX_PHYSICS_STEPS = 3 as const;

// ---------------------------------------------------------------------------
// Networking
// ---------------------------------------------------------------------------

/**
 * SERVER_ONLY — Snapshot broadcast rate in Hz.
 * One snapshot is emitted every (PHYSICS_TICK_HZ / NETWORK_SNAP_HZ) = 3 ticks.
 * Spec note: "15–20 Hz" mentioned; we use 20 Hz (consistent with "every 3 ticks").
 */
export const NETWORK_SNAP_HZ = 20 as const;

/**
 * Derived — how many physics ticks elapse between each snapshot broadcast.
 * Must be a whole number. Assert: PHYSICS_TICK_HZ % NETWORK_SNAP_HZ === 0.
 */
export const TICKS_PER_SNAPSHOT = PHYSICS_TICK_HZ / NETWORK_SNAP_HZ; // 3

/**
 * CLIENT_ONLY — How far behind the latest received snapshot the client renders (ms).
 * Creates a buffer of snapshots to smooth over network jitter.
 * With 20 Hz snapshots (50 ms apart), 100 ms holds ~2 snapshots.
 */
export const INTERPOLATION_DELAY_MS = 100 as const;

/** Default server port. */
export const SERVER_PORT = 3000 as const;

// ---------------------------------------------------------------------------
// Room / PIN
// ---------------------------------------------------------------------------

/** Number of digits in a room join code. */
export const PIN_LENGTH = 6 as const;

/** Smallest valid PIN value (100000 for a 6-digit code with no leading zeros). */
export const PIN_MIN = 100_000 as const;

/** Largest valid PIN value (999999). */
export const PIN_MAX = 999_999 as const;

/** Default maximum number of human players per room. */
export const MAX_PLAYERS = 8 as const;

/**
 * Maximum join attempts per IP per minute before rate-limiting kicks in.
 * Prevents brute-force PIN attacks.
 */
export const JOIN_RATE_LIMIT = 5 as const;

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
export const MAX_SPEED_MS = 30 as const;

/** Default collision circle radius in metres. */
export const VEHICLE_RADIUS = 0.5 as const;

// ---------------------------------------------------------------------------
// Grip & handling
// ---------------------------------------------------------------------------

/**
 * Friction multiplier for a wet road at maximum rain intensity.
 * effectiveFriction = baseFriction * (1 - WET_FRICTION_REDUCTION * wetness)
 * At wetness=1, friction is halved.
 */
export const WET_FRICTION_REDUCTION = 0.5 as const;

/**
 * Rate at which road wetness decays after rain stops (wetness units / second).
 * At 0.01/s, a fully saturated road dries in 100 s.
 */
export const WETNESS_DECAY_RATE = 0.01 as const;

// ---------------------------------------------------------------------------
// Slipstream / Drafting
// ---------------------------------------------------------------------------

/** Maximum distance behind a leader at which drafting activates (metres). */
export const SLIPSTREAM_DISTANCE = 10 as const;

/**
 * Half-angle of the drafting cone in degrees.
 * Follower must be within ±SLIPSTREAM_HALF_ANGLE° of the leader's rear.
 */
export const SLIPSTREAM_HALF_ANGLE_DEG = 15 as const;

/**
 * Maximum drag reduction factor in the draft.
 * effectiveDrag = baseDrag * (1 - SLIPSTREAM_DRAG_K * slipFactor)
 * 0.2 = up to 20% drag reduction at closest following distance.
 */
export const SLIPSTREAM_DRAG_K = 0.2 as const;

// ---------------------------------------------------------------------------
// Engine temperature
// ---------------------------------------------------------------------------

/** Engine temperature at which power begins to degrade (°C). */
export const ENGINE_OVERHEAT_THRESHOLD = 120 as const;

/** Engine temperature at which the car is forced to slow to a crawl (°C). */
export const ENGINE_CRITICAL_THRESHOLD = 150 as const;

/** Speed multiplier applied when engine is critically overheated. */
export const ENGINE_OVERHEAT_SPEED_FACTOR = 0.4 as const;

// ---------------------------------------------------------------------------
// Debug / Proxy
// ---------------------------------------------------------------------------

/**
 * Default proxy mode state.
 * true  = use Canvas primitives (rectangles, lines) — no asset loading.
 * false = use real sprites.
 * Toggled by the [F1] key at runtime.
 */
export const DEFAULT_PROXY_MODE = true as const;

/**
 * Minimum slip angle (radians of lateral vs forward velocity) before
 * tire-smoke VFX and skid-sound activate.
 */
export const DRIFT_VFX_THRESHOLD_RAD = 0.2 as const;

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
export const WORLD_COORD_SYSTEM = "X_RIGHT_Y_UP_RADIANS_CCW" as const;

// ---------------------------------------------------------------------------
// Race
// ---------------------------------------------------------------------------

/** Duration of the countdown phase in seconds (3-2-1-GO). */
export const COUNTDOWN_DURATION_S = 4 as const;

/** Minimum number of players required to start a race. */
export const MIN_PLAYERS_TO_START = 1 as const;

/** Time after all players finish before the race results screen is shown (ms). */
export const RESULTS_DELAY_MS = 3_000 as const;

// ---------------------------------------------------------------------------
// Type-level assertions (evaluated at module load in tests)
// ---------------------------------------------------------------------------

// Ensure TICKS_PER_SNAPSHOT is a whole number
if (PHYSICS_TICK_HZ % NETWORK_SNAP_HZ !== 0) {
  throw new Error(
    `PHYSICS_TICK_HZ (${PHYSICS_TICK_HZ}) must be evenly divisible by ` +
      `NETWORK_SNAP_HZ (${NETWORK_SNAP_HZ}).`
  );
}

// Ensure MAX_SPEED_MS does not exceed tunnelling threshold
const _tunnelLimit = VEHICLE_RADIUS / PHYSICS_DT;
if (MAX_SPEED_MS > _tunnelLimit) {
  throw new Error(
    `MAX_SPEED_MS (${MAX_SPEED_MS} m/s) exceeds tunnelling safety limit ` +
      `(VEHICLE_RADIUS / PHYSICS_DT = ${_tunnelLimit.toFixed(2)} m/s). ` +
      `Reduce MAX_SPEED_MS or increase VEHICLE_RADIUS.`
  );
}
