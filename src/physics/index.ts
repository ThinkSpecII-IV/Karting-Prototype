/**
 * src/physics/index.ts
 *
 * Barrel export for the physics module.
 * Import the whole layer: import { integrate, resolveWallCollision } from '@physics/index';
 * Or import directly for tree-shaking: import { integrate } from '@physics/KartPhysics';
 */

export {
  integrate,
  applyUpdate,
  createDefaultVehicleState,
  DEFAULT_KART_CONFIG,
} from "./KartPhysics.js";
export type { KartPhysicsUpdate } from "./KartPhysics.js";

export {
  resolveWallCollision,
  resolveWallCollisions,
  resolveSphereCollision,
  clampToWorldBounds,
  WALL_RESTITUTION,
  KART_RESTITUTION,
} from "./BoundingSphere.js";
export type {
  WallCollisionResult,
  SphereCollisionResult,
} from "./BoundingSphere.js";

export {
  resolveSurfaceGrip,
  resolveOverheatPenalty,
  updateEngineTemperature,
  DEFAULT_SURFACE_ID,
  ASPHALT_SURFACE,
} from "./SurfaceResponse.js";
export type { SurfaceGripResult } from "./SurfaceResponse.js";
