/**
 * src/physics/SurfaceResponse.ts
 *
 * Resolves effective grip, speed, and acceleration multipliers for a vehicle
 * given its current surface and ambient weather. Also owns the engine
 * temperature model.
 *
 * INVARIANT (INV-04): No imports from rendering, networking, UI, or audio.
 * INVARIANT (INV-09): All weather-driven gameplay modifiers are computed
 *   here (server-side). Clients receive WeatherState for visuals only.
 */

import type { SurfaceDef, WeatherState } from "../shared/types.js";
import { clamp01 } from "../math/MathUtils.js";
import {
  WET_FRICTION_REDUCTION,
  ENGINE_OVERHEAT_THRESHOLD,
  ENGINE_CRITICAL_THRESHOLD,
  ENGINE_OVERHEAT_SPEED_FACTOR,
} from "../shared/constants.js";

// ---------------------------------------------------------------------------
// Default surface
// ---------------------------------------------------------------------------

/** Surface ID used when a vehicle is not inside any defined SurfaceZone. */
export const DEFAULT_SURFACE_ID = "asphalt" as const;

/** Built-in asphalt fallback — full grip, no modifiers. */
export const ASPHALT_SURFACE: Readonly<SurfaceDef> = {
  id: DEFAULT_SURFACE_ID,
  friction: 1.0,
  speedMultiplier: 1.0,
  accelerationMultiplier: 1.0,
} as const;

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

/**
 * Pre-resolved grip values for a single physics tick.
 * Computed once per vehicle per tick by `resolveSurfaceGrip()` and passed
 * directly into `KartPhysics.integrate()`.
 */
export interface SurfaceGripResult {
  /**
   * Effective lateral friction coefficient [0..1].
   * Applied as: v_lateral *= (1 - effectiveLateralGrip)
   * 1.0 = perfect grip, 0.0 = frictionless.
   */
  readonly effectiveLateralGrip: number;

  /**
   * Effective engine thrust multiplier [0..1].
   * F_engine_effective = F_engine * accelerationMult
   */
  readonly accelerationMult: number;

  /**
   * Effective maximum-speed multiplier [0..1].
   * Integrator caps speed at config.maxSpeed * speedMult * overheatPenalty.
   */
  readonly speedMult: number;

  /** Combined surface + weather friction value — exposed for telemetry. */
  readonly combinedFriction: number;
}

// ---------------------------------------------------------------------------
// resolveSurfaceGrip
// ---------------------------------------------------------------------------

/**
 * Compute effective grip values for one vehicle on one tick.
 *
 * Friction pipeline:
 *   1. Look up SurfaceDef for `surfaceId`; fall back to ASPHALT_SURFACE.
 *   2. Apply weather wetness:
 *        combinedFriction = surface.friction * (1 - WET_FRICTION_REDUCTION * wetness)
 *   3. Scale lateral grip: effectiveLateralGrip = baseLateralGrip * combinedFriction
 *   4. Scale acceleration: accelerationMult = surface.accelerationMultiplier * (1 - wetReduction*0.5)
 *   5. Pass surface.speedMultiplier through directly.
 *
 * @param surfaceId       VehicleState.currentSurface.
 * @param surfaces        TrackDef.surfaces array.
 * @param weather         Current WeatherState.
 * @param baseLateralGrip VehicleConfig.lateralGrip (before any modifier).
 */
export function resolveSurfaceGrip(
  surfaceId: string,
  surfaces: readonly SurfaceDef[],
  weather: WeatherState,
  baseLateralGrip: number
): SurfaceGripResult {
  const surface = surfaces.find((s) => s.id === surfaceId) ?? ASPHALT_SURFACE;

  const wetReduction = WET_FRICTION_REDUCTION * clamp01(weather.wetness);
  const combinedFriction = clamp01(surface.friction * (1 - wetReduction));
  const effectiveLateralGrip = clamp01(baseLateralGrip * combinedFriction);
  const accelerationMult = clamp01(
    surface.accelerationMultiplier * (1 - wetReduction * 0.5)
  );
  const speedMult = clamp01(surface.speedMultiplier);

  return { effectiveLateralGrip, accelerationMult, speedMult, combinedFriction };
}

// ---------------------------------------------------------------------------
// resolveOverheatPenalty
// ---------------------------------------------------------------------------

/**
 * Speed penalty factor [0..1] derived from engine temperature.
 *
 * - Below ENGINE_OVERHEAT_THRESHOLD : 1.0 (full power)
 * - Between threshold and critical  : linear ramp down to ENGINE_OVERHEAT_SPEED_FACTOR
 * - At or above ENGINE_CRITICAL_THRESHOLD : ENGINE_OVERHEAT_SPEED_FACTOR (minimum power)
 *
 * @param engineTemp VehicleState.engineTemperature in °C.
 */
export function resolveOverheatPenalty(engineTemp: number): number {
  if (engineTemp <= ENGINE_OVERHEAT_THRESHOLD) return 1.0;
  if (engineTemp >= ENGINE_CRITICAL_THRESHOLD) return ENGINE_OVERHEAT_SPEED_FACTOR;
  const t =
    (engineTemp - ENGINE_OVERHEAT_THRESHOLD) /
    (ENGINE_CRITICAL_THRESHOLD - ENGINE_OVERHEAT_THRESHOLD);
  return 1.0 - t * (1.0 - ENGINE_OVERHEAT_SPEED_FACTOR);
}

// ---------------------------------------------------------------------------
// updateEngineTemperature
// ---------------------------------------------------------------------------

/**
 * Advance engine temperature by one physics tick.
 *
 * Heat model (per tick, dt = PHYSICS_DT):
 *   generated  = throttle * engineHeatRate * dt
 *   dissipated = max(0, engineTemp - ambientTemp) * coolingRate * dt
 *   next       = engineTemp + generated − dissipated
 *
 * Clamped to [ambientTemp, ENGINE_CRITICAL_THRESHOLD + 50] to prevent
 * sub-ambient overcooling or unbounded growth.
 *
 * @param currentTemp    VehicleState.engineTemperature (°C).
 * @param throttle       Current throttle input [0..1].
 * @param engineHeatRate VehicleConfig.engineHeatRate (°C/s at full throttle).
 * @param coolingRate    VehicleConfig.coolingRate (proportion of excess heat lost/s).
 * @param ambientTemp    WeatherState.temperature (°C).
 * @param dt             Fixed physics timestep in seconds.
 */
export function updateEngineTemperature(
  currentTemp: number,
  throttle: number,
  engineHeatRate: number,
  coolingRate: number,
  ambientTemp: number,
  dt: number
): number {
  const generated = clamp01(throttle) * engineHeatRate * dt;
  const dissipated = Math.max(0, currentTemp - ambientTemp) * coolingRate * dt;
  const next = currentTemp + generated - dissipated;
  return Math.max(ambientTemp, Math.min(ENGINE_CRITICAL_THRESHOLD + 50, next));
}
