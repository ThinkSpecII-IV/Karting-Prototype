"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomInt = exports.seededRandom = exports.exponentialDecay = exports.moveToward = exports.deadZone = exports.sq = exports.approxZero = exports.approxEqual = exports.lerpAngle = exports.angleBetween = exports.angleDelta = exports.normalizeAngle = exports.smootherStep = exports.smoothStep = exports.remap = exports.inverseLerp = exports.lerpClamped = exports.lerp = exports.wrapPositive = exports.inRange = exports.sign = exports.clamp01 = exports.clamp = exports.radToDeg = exports.degToRad = exports.RAD_TO_DEG = exports.DEG_TO_RAD = exports.HALF_PI = exports.TWO_PI = exports.Vector2 = void 0;
var Vector2_js_1 = require("./Vector2.js");
Object.defineProperty(exports, "Vector2", { enumerable: true, get: function () { return Vector2_js_1.Vector2; } });
var MathUtils_js_1 = require("./MathUtils.js");
// Constants
Object.defineProperty(exports, "TWO_PI", { enumerable: true, get: function () { return MathUtils_js_1.TWO_PI; } });
Object.defineProperty(exports, "HALF_PI", { enumerable: true, get: function () { return MathUtils_js_1.HALF_PI; } });
Object.defineProperty(exports, "DEG_TO_RAD", { enumerable: true, get: function () { return MathUtils_js_1.DEG_TO_RAD; } });
Object.defineProperty(exports, "RAD_TO_DEG", { enumerable: true, get: function () { return MathUtils_js_1.RAD_TO_DEG; } });
// Unit conversion
Object.defineProperty(exports, "degToRad", { enumerable: true, get: function () { return MathUtils_js_1.degToRad; } });
Object.defineProperty(exports, "radToDeg", { enumerable: true, get: function () { return MathUtils_js_1.radToDeg; } });
// Clamping & range
Object.defineProperty(exports, "clamp", { enumerable: true, get: function () { return MathUtils_js_1.clamp; } });
Object.defineProperty(exports, "clamp01", { enumerable: true, get: function () { return MathUtils_js_1.clamp01; } });
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return MathUtils_js_1.sign; } });
Object.defineProperty(exports, "inRange", { enumerable: true, get: function () { return MathUtils_js_1.inRange; } });
Object.defineProperty(exports, "wrapPositive", { enumerable: true, get: function () { return MathUtils_js_1.wrapPositive; } });
// Interpolation
Object.defineProperty(exports, "lerp", { enumerable: true, get: function () { return MathUtils_js_1.lerp; } });
Object.defineProperty(exports, "lerpClamped", { enumerable: true, get: function () { return MathUtils_js_1.lerpClamped; } });
Object.defineProperty(exports, "inverseLerp", { enumerable: true, get: function () { return MathUtils_js_1.inverseLerp; } });
Object.defineProperty(exports, "remap", { enumerable: true, get: function () { return MathUtils_js_1.remap; } });
Object.defineProperty(exports, "smoothStep", { enumerable: true, get: function () { return MathUtils_js_1.smoothStep; } });
Object.defineProperty(exports, "smootherStep", { enumerable: true, get: function () { return MathUtils_js_1.smootherStep; } });
// Angle utilities
Object.defineProperty(exports, "normalizeAngle", { enumerable: true, get: function () { return MathUtils_js_1.normalizeAngle; } });
Object.defineProperty(exports, "angleDelta", { enumerable: true, get: function () { return MathUtils_js_1.angleDelta; } });
Object.defineProperty(exports, "angleBetween", { enumerable: true, get: function () { return MathUtils_js_1.angleBetween; } });
Object.defineProperty(exports, "lerpAngle", { enumerable: true, get: function () { return MathUtils_js_1.lerpAngle; } });
// Numeric utilities
Object.defineProperty(exports, "approxEqual", { enumerable: true, get: function () { return MathUtils_js_1.approxEqual; } });
Object.defineProperty(exports, "approxZero", { enumerable: true, get: function () { return MathUtils_js_1.approxZero; } });
Object.defineProperty(exports, "sq", { enumerable: true, get: function () { return MathUtils_js_1.sq; } });
Object.defineProperty(exports, "deadZone", { enumerable: true, get: function () { return MathUtils_js_1.deadZone; } });
Object.defineProperty(exports, "moveToward", { enumerable: true, get: function () { return MathUtils_js_1.moveToward; } });
Object.defineProperty(exports, "exponentialDecay", { enumerable: true, get: function () { return MathUtils_js_1.exponentialDecay; } });
Object.defineProperty(exports, "seededRandom", { enumerable: true, get: function () { return MathUtils_js_1.seededRandom; } });
Object.defineProperty(exports, "randomInt", { enumerable: true, get: function () { return MathUtils_js_1.randomInt; } });
//# sourceMappingURL=index.js.map