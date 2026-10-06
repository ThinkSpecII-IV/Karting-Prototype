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

export {
  // Constants
  TWO_PI,
  HALF_PI,
  DEG_TO_RAD,
  RAD_TO_DEG,

  // Unit conversion
  degToRad,
  radToDeg,

  // Clamping & range
  clamp,
  clamp01,
  sign,
  inRange,
  wrapPositive,

  // Interpolation
  lerp,
  lerpClamped,
  inverseLerp,
  remap,
  smoothStep,
  smootherStep,

  // Angle utilities
  normalizeAngle,
  angleDelta,
  angleBetween,
  lerpAngle,

  // Numeric utilities
  approxEqual,
  approxZero,
  sq,
  deadZone,
  moveToward,
  exponentialDecay,
  seededRandom,
  randomInt,
} from "./MathUtils.js";
