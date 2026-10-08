"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAD_TO_DEG = exports.DEG_TO_RAD = exports.HALF_PI = exports.TWO_PI = void 0;
exports.degToRad = degToRad;
exports.radToDeg = radToDeg;
exports.clamp = clamp;
exports.clamp01 = clamp01;
exports.sign = sign;
exports.inRange = inRange;
exports.wrapPositive = wrapPositive;
exports.lerp = lerp;
exports.lerpClamped = lerpClamped;
exports.inverseLerp = inverseLerp;
exports.remap = remap;
exports.smoothStep = smoothStep;
exports.smootherStep = smootherStep;
exports.normalizeAngle = normalizeAngle;
exports.angleDelta = angleDelta;
exports.angleBetween = angleBetween;
exports.lerpAngle = lerpAngle;
exports.approxEqual = approxEqual;
exports.approxZero = approxZero;
exports.sq = sq;
exports.deadZone = deadZone;
exports.moveToward = moveToward;
exports.exponentialDecay = exponentialDecay;
exports.seededRandom = seededRandom;
exports.randomInt = randomInt;
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
exports.TWO_PI = Math.PI * 2;
exports.HALF_PI = Math.PI / 2;
exports.DEG_TO_RAD = Math.PI / 180;
exports.RAD_TO_DEG = 180 / Math.PI;
// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------
/** Convert degrees to radians. */
function degToRad(degrees) {
    return degrees * exports.DEG_TO_RAD;
}
/** Convert radians to degrees. */
function radToDeg(radians) {
    return radians * exports.RAD_TO_DEG;
}
// ---------------------------------------------------------------------------
// Clamping & range
// ---------------------------------------------------------------------------
/**
 * Clamp `value` to [min, max].
 * Returns min if value < min, max if value > max, otherwise value.
 */
function clamp(value, min, max) {
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}
/**
 * Clamp `value` to [0, 1].
 * Convenience alias for clamp(value, 0, 1).
 */
function clamp01(value) {
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return value;
}
/**
 * Return the sign of a number: -1, 0, or 1.
 * Unlike Math.sign, this is explicit for clarity in physics code.
 */
function sign(value) {
    if (value > 0)
        return 1;
    if (value < 0)
        return -1;
    return 0;
}
/**
 * Return true if `value` is strictly between `min` and `max` (exclusive).
 */
function inRange(value, min, max) {
    return value > min && value < max;
}
/**
 * Wrap a value into the range [0, range).
 * Useful for wrapping lap progress or compass bearings.
 */
function wrapPositive(value, range) {
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
function lerp(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Clamped linear interpolation — t is clamped to [0, 1] before blending.
 */
function lerpClamped(a, b, t) {
    return lerp(a, b, clamp01(t));
}
/**
 * Inverse lerp — given a value within [a, b], returns t in [0, 1].
 * Returns 0 if a === b (avoids division by zero).
 */
function inverseLerp(a, b, value) {
    const range = b - a;
    if (range === 0)
        return 0;
    return (value - a) / range;
}
/**
 * Remap `value` from the input range [inMin, inMax] to the output range
 * [outMin, outMax]. Does NOT clamp.
 */
function remap(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
/**
 * Smooth-step (Hermite) interpolation. Returns a value in [0, 1].
 * Slower at edges, faster in the middle — useful for smooth ease-in/ease-out.
 * @param t Must be in [0, 1]; not clamped internally.
 */
function smoothStep(t) {
    return t * t * (3 - 2 * t);
}
/**
 * Smoother-step (Ken Perlin). More gradual than smoothStep at endpoints.
 * @param t Must be in [0, 1]; not clamped internally.
 */
function smootherStep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}
// ---------------------------------------------------------------------------
// Angle utilities
// ---------------------------------------------------------------------------
/**
 * Normalise an angle to the range [-π, π].
 * Ensures angle arithmetic never drifts to large magnitudes.
 */
function normalizeAngle(angleRad) {
    let a = angleRad % exports.TWO_PI;
    if (a > Math.PI)
        a -= exports.TWO_PI;
    if (a < -Math.PI)
        a += exports.TWO_PI;
    return a;
}
/**
 * Shortest signed angular difference from `from` to `to` in radians.
 * Result is in [-π, π]: positive = CCW, negative = CW.
 */
function angleDelta(from, to) {
    return normalizeAngle(to - from);
}
/**
 * Unsigned angle between two directions given as radians.
 * Result is in [0, π].
 */
function angleBetween(angleA, angleB) {
    return Math.abs(normalizeAngle(angleB - angleA));
}
/**
 * Linearly interpolate between two angles via the shortest arc.
 * @param t Blend factor [0..1].
 */
function lerpAngle(from, to, t) {
    return from + angleDelta(from, to) * t;
}
// ---------------------------------------------------------------------------
// Numeric utilities
// ---------------------------------------------------------------------------
/**
 * Approximately equal within an absolute epsilon.
 * Default epsilon is 1e-9 — appropriate for metre-scale physics.
 */
function approxEqual(a, b, epsilon = 1e-9) {
    return Math.abs(a - b) <= epsilon;
}
/**
 * Approximately zero.
 */
function approxZero(value, epsilon = 1e-9) {
    return Math.abs(value) <= epsilon;
}
/**
 * Return the square of a number. Avoids the verbosity of `x * x` inline.
 */
function sq(x) {
    return x * x;
}
/**
 * Dead-zone a value: returns 0 if |value| < threshold, otherwise value.
 * Useful for filtering small joystick / tilt inputs.
 */
function deadZone(value, threshold) {
    return Math.abs(value) < threshold ? 0 : value;
}
/**
 * Move `current` toward `target` by at most `maxStep` per call.
 * Will not overshoot. Works for both positive and negative values.
 */
function moveToward(current, target, maxStep) {
    const diff = target - current;
    if (Math.abs(diff) <= maxStep)
        return target;
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
function exponentialDecay(value, rate, dt, referenceDt = 1 / 60) {
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
function seededRandom(seed) {
    let s = seed;
    return () => {
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
function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}
//# sourceMappingURL=MathUtils.js.map