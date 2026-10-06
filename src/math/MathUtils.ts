/**
 * src/math/MathUtils.ts
 *
 * Scalar math utilities used throughout the physics engine, race logic,
 * and rendering pipeline.
 *
 * RULES:
 * - All angle parameters and return values are in RADIANS (INV-12).
 * - No imports from outside src/math/ — this is the foundation layer.
 * - All functions are pure (no side effects, no state).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI / 2;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

/** Convert degrees to radians. */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/** Convert radians to degrees. */
export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

// ---------------------------------------------------------------------------
// Clamping & range
// ---------------------------------------------------------------------------

/**
 * Clamp `value` to [min, max].
 * Returns min if value < min, max if value > max, otherwise value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Clamp `value` to [0, 1].
 * Convenience alias for clamp(value, 0, 1).
 */
export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Return the sign of a number: -1, 0, or 1.
 * Unlike Math.sign, this is explicit for clarity in physics code.
 */
export function sign(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/**
 * Return true if `value` is strictly between `min` and `max` (exclusive).
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value > min && value < max;
}

/**
 * Wrap a value into the range [0, range).
 * Useful for wrapping lap progress or compass bearings.
 */
export function wrapPositive(value: number, range: number): number {
  const mod = value % range;
  return mod < 0 ? mod + range : mod;
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Linear interpolation between `a` and `b`.
 * @param t Blend factor. 0 = a, 1 = b. Not clamped.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamped linear interpolation — t is clamped to [0, 1] before blending.
 */
export function lerpClamped(a: number, b: number, t: number): number {
  return lerp(a, b, clamp01(t));
}

/**
 * Inverse lerp — given a value within [a, b], returns t in [0, 1].
 * Returns 0 if a === b (avoids division by zero).
 */
export function inverseLerp(a: number, b: number, value: number): number {
  const range = b - a;
  if (range === 0) return 0;
  return (value - a) / range;
}

/**
 * Remap `value` from the input range [inMin, inMax] to the output range
 * [outMin, outMax]. Does NOT clamp.
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Smooth-step (Hermite) interpolation. Returns a value in [0, 1].
 * Slower at edges, faster in the middle — useful for smooth ease-in/ease-out.
 * @param t Must be in [0, 1]; not clamped internally.
 */
export function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Smoother-step (Ken Perlin). More gradual than smoothStep at endpoints.
 * @param t Must be in [0, 1]; not clamped internally.
 */
export function smootherStep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ---------------------------------------------------------------------------
// Angle utilities
// ---------------------------------------------------------------------------

/**
 * Normalise an angle to the range [-π, π].
 * Ensures angle arithmetic never drifts to large magnitudes.
 */
export function normalizeAngle(angleRad: number): number {
  let a = angleRad % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  if (a < -Math.PI) a += TWO_PI;
  return a;
}

/**
 * Shortest signed angular difference from `from` to `to` in radians.
 * Result is in [-π, π]: positive = CCW, negative = CW.
 */
export function angleDelta(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * Unsigned angle between two directions given as radians.
 * Result is in [0, π].
 */
export function angleBetween(angleA: number, angleB: number): number {
  return Math.abs(normalizeAngle(angleB - angleA));
}

/**
 * Linearly interpolate between two angles via the shortest arc.
 * @param t Blend factor [0..1].
 */
export function lerpAngle(from: number, to: number, t: number): number {
  return from + angleDelta(from, to) * t;
}

// ---------------------------------------------------------------------------
// Numeric utilities
// ---------------------------------------------------------------------------

/**
 * Approximately equal within an absolute epsilon.
 * Default epsilon is 1e-9 — appropriate for metre-scale physics.
 */
export function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}

/**
 * Approximately zero.
 */
export function approxZero(value: number, epsilon = 1e-9): boolean {
  return Math.abs(value) <= epsilon;
}

/**
 * Return the square of a number. Avoids the verbosity of `x * x` inline.
 */
export function sq(x: number): number {
  return x * x;
}

/**
 * Dead-zone a value: returns 0 if |value| < threshold, otherwise value.
 * Useful for filtering small joystick / tilt inputs.
 */
export function deadZone(value: number, threshold: number): number {
  return Math.abs(value) < threshold ? 0 : value;
}

/**
 * Move `current` toward `target` by at most `maxStep` per call.
 * Will not overshoot. Works for both positive and negative values.
 */
export function moveToward(current: number, target: number, maxStep: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) return target;
  return current + sign(diff) * maxStep;
}

/**
 * Decay a value exponentially toward zero each frame.
 * Formula: value * (1 - rate)^(dt / referenceDt)
 * More physically correct than a per-frame multiplier when dt varies.
 * Used for lateral grip application: v_lateral *= exponentialDecay(1, gripCoef, dt)
 *
 * @param value Current value to decay.
 * @param rate  Decay rate [0..1] per `referenceDt` second. 1.0 = instant zero.
 * @param dt    Elapsed time in seconds.
 * @param referenceDt Reference timestep the rate was tuned against (default 1/60 s).
 */
export function exponentialDecay(
  value: number,
  rate: number,
  dt: number,
  referenceDt = 1 / 60
): number {
  // Normalise rate to be dt-independent.
  // factor = (1 - rate) ^ (dt / referenceDt)
  const factor = Math.pow(1 - clamp01(rate), dt / referenceDt);
  return value * factor;
}

/**
 * Pseudo-random number in [min, max) using a seed.
 * Simple mulberry32 — deterministic, sufficient for seeded weather/AI.
 * Not cryptographically secure.
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random integer in [min, max] inclusive, using a provided random function.
 * @param rng A () => number function returning values in [0, 1).
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
