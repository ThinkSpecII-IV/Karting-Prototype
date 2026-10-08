"use strict";
/**
 * src/physics/index.ts
 *
 * Barrel export for the physics module.
 * Import the whole layer: import { integrate, resolveWallCollision } from '@physics/index';
 * Or import directly for tree-shaking: import { integrate } from '@physics/KartPhysics';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASPHALT_SURFACE = exports.DEFAULT_SURFACE_ID = exports.updateEngineTemperature = exports.resolveOverheatPenalty = exports.resolveSurfaceGrip = exports.KART_RESTITUTION = exports.WALL_RESTITUTION = exports.clampToWorldBounds = exports.resolveSphereCollision = exports.resolveWallCollisions = exports.resolveWallCollision = exports.DEFAULT_KART_CONFIG = exports.createDefaultVehicleState = exports.applyUpdate = exports.integrate = void 0;
var KartPhysics_js_1 = require("./KartPhysics.js");
Object.defineProperty(exports, "integrate", { enumerable: true, get: function () { return KartPhysics_js_1.integrate; } });
Object.defineProperty(exports, "applyUpdate", { enumerable: true, get: function () { return KartPhysics_js_1.applyUpdate; } });
Object.defineProperty(exports, "createDefaultVehicleState", { enumerable: true, get: function () { return KartPhysics_js_1.createDefaultVehicleState; } });
Object.defineProperty(exports, "DEFAULT_KART_CONFIG", { enumerable: true, get: function () { return KartPhysics_js_1.DEFAULT_KART_CONFIG; } });
var BoundingSphere_js_1 = require("./BoundingSphere.js");
Object.defineProperty(exports, "resolveWallCollision", { enumerable: true, get: function () { return BoundingSphere_js_1.resolveWallCollision; } });
Object.defineProperty(exports, "resolveWallCollisions", { enumerable: true, get: function () { return BoundingSphere_js_1.resolveWallCollisions; } });
Object.defineProperty(exports, "resolveSphereCollision", { enumerable: true, get: function () { return BoundingSphere_js_1.resolveSphereCollision; } });
Object.defineProperty(exports, "clampToWorldBounds", { enumerable: true, get: function () { return BoundingSphere_js_1.clampToWorldBounds; } });
Object.defineProperty(exports, "WALL_RESTITUTION", { enumerable: true, get: function () { return BoundingSphere_js_1.WALL_RESTITUTION; } });
Object.defineProperty(exports, "KART_RESTITUTION", { enumerable: true, get: function () { return BoundingSphere_js_1.KART_RESTITUTION; } });
var SurfaceResponse_js_1 = require("./SurfaceResponse.js");
Object.defineProperty(exports, "resolveSurfaceGrip", { enumerable: true, get: function () { return SurfaceResponse_js_1.resolveSurfaceGrip; } });
Object.defineProperty(exports, "resolveOverheatPenalty", { enumerable: true, get: function () { return SurfaceResponse_js_1.resolveOverheatPenalty; } });
Object.defineProperty(exports, "updateEngineTemperature", { enumerable: true, get: function () { return SurfaceResponse_js_1.updateEngineTemperature; } });
Object.defineProperty(exports, "DEFAULT_SURFACE_ID", { enumerable: true, get: function () { return SurfaceResponse_js_1.DEFAULT_SURFACE_ID; } });
Object.defineProperty(exports, "ASPHALT_SURFACE", { enumerable: true, get: function () { return SurfaceResponse_js_1.ASPHALT_SURFACE; } });
//# sourceMappingURL=index.js.map