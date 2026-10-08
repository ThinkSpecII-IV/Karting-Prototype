/**
 * src/math/index.ts
 *
 * Barrel export for the math library.
 *
 * Import the whole library:
 *   import { Vector2, lerp, clamp, degToRad } from '@math/index';
 *
 * Or import directly from the module for tree-shaking in the client bundle:
 *   import { Vector2 } from '@math/Vector2';
 *   import { lerp } from '@math/MathUtils';
 */
export { Vector2 } from "./Vector2.js";
export type { IVector2 } from "./Vector2.js";
export { TWO_PI, HALF_PI, DEG_TO_RAD, RAD_TO_DEG, degToRad, radToDeg, clamp, clamp01, sign, inRange, wrapPositive, lerp, lerpClamped, inverseLerp, remap, smoothStep, smootherStep, normalizeAngle, angleDelta, angleBetween, lerpAngle, approxEqual, approxZero, sq, deadZone, moveToward, exponentialDecay, seededRandom, randomInt, } from "./MathUtils.js";
//# sourceMappingURL=index.d.ts.map