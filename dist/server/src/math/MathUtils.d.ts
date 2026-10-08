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
export declare const TWO_PI: number;
export declare const HALF_PI: number;
export declare const DEG_TO_RAD: number;
export declare const RAD_TO_DEG: number;
/** Convert degrees to radians. */
export declare function degToRad(degrees: number): number;
/** Convert radians to degrees. */
export declare function radToDeg(radians: number): number;
/**
 * Clamp `value` to [min, max].
 * Returns min if value < min, max if value > max, otherwise value.
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Clamp `value` to [0, 1].
 * Convenience alias for clamp(value, 0, 1).
 */
export declare function clamp01(value: number): number;
/**
 * Return the sign of a number: -1, 0, or 1.
 * Unlike Math.sign, this is explicit for clarity in physics code.
 */
export declare function sign(value: number): -1 | 0 | 1;
/**
 * Return true if `value` is strictly between `min` and `max` (exclusive).
 */
export declare function inRange(value: number, min: number, max: number): boolean;
/**
 * Wrap a value into the range [0, range).
 * Useful for wrapping lap progress or compass bearings.
 */
export declare function wrapPositive(value: number, range: number): number;
/**
 * Linear interpolation between `a` and `b`.
 * @param t Blend factor. 0 = a, 1 = b. Not clamped.
 */
export declare function lerp(a: number, b: number, t: number): number;
/**
 * Clamped linear interpolation — t is clamped to [0, 1] before blending.
 */
export declare function lerpClamped(a: number, b: number, t: number): number;
/**
 * Inverse lerp — given a value within [a, b], returns t in [0, 1].
 * Returns 0 if a === b (avoids division by zero).
 */
export declare function inverseLerp(a: number, b: number, value: number): number;
/**
 * Remap `value` from the input range [inMin, inMax] to the output range
 * [outMin, outMax]. Does NOT clamp.
 */
export declare function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
/**
 * Smooth-step (Hermite) interpolation. Returns a value in [0, 1].
 * Slower at edges, faster in the middle — useful for smooth ease-in/ease-out.
 * @param t Must be in [0, 1]; not clamped internally.
 */
export declare function smoothStep(t: number): number;
/**
 * Smoother-step (Ken Perlin). More gradual than smoothStep at endpoints.
 * @param t Must be in [0, 1]; not clamped internally.
 */
export declare function smootherStep(t: number): number;
/**
 * Normalise an angle to the range [-π, π].
 * Ensures angle arithmetic never drifts to large magnitudes.
 */
export declare function normalizeAngle(angleRad: number): number;
/**
 * Shortest signed angular difference from `from` to `to` in radians.
 * Result is in [-π, π]: positive = CCW, negative = CW.
 */
export declare function angleDelta(from: number, to: number): number;
/**
 * Unsigned angle between two directions given as radians.
 * Result is in [0, π].
 */
export declare function angleBetween(angleA: number, angleB: number): number;
/**
 * Linearly interpolate between two angles via the shortest arc.
 * @param t Blend factor [0..1].
 */
export declare function lerpAngle(from: number, to: number, t: number): number;
/**
 * Approximately equal within an absolute epsilon.
 * Default epsilon is 1e-9 — appropriate for metre-scale physics.
 */
export declare function approxEqual(a: number, b: number, epsilon?: number): boolean;
/**
 * Approximately zero.
 */
export declare function approxZero(value: number, epsilon?: number): boolean;
/**
 * Return the square of a number. Avoids the verbosity of `x * x` inline.
 */
export declare function sq(x: number): number;
/**
 * Dead-zone a value: returns 0 if |value| < threshold, otherwise value.
 * Useful for filtering small joystick / tilt inputs.
 */
export declare function deadZone(value: number, threshold: number): number;
/**
 * Move `current` toward `target` by at most `maxStep` per call.
 * Will not overshoot. Works for both positive and negative values.
 */
export declare function moveToward(current: number, target: number, maxStep: number): number;
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
export declare function exponentialDecay(value: number, rate: number, dt: number, referenceDt?: number): number;
/**
 * Pseudo-random number in [min, max) using a seed.
 * Simple mulberry32 — deterministic, sufficient for seeded weather/AI.
 * Not cryptographically secure.
 */
export declare function seededRandom(seed: number): () => number;
/**
 * Random integer in [min, max] inclusive, using a provided random function.
 * @param rng A () => number function returning values in [0, 1).
 */
export declare function randomInt(rng: () => number, min: number, max: number): number;
//# sourceMappingURL=MathUtils.d.ts.map