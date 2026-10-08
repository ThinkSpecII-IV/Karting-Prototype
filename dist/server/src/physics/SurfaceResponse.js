"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASPHALT_SURFACE = exports.DEFAULT_SURFACE_ID = void 0;
exports.resolveSurfaceGrip = resolveSurfaceGrip;
exports.resolveOverheatPenalty = resolveOverheatPenalty;
exports.updateEngineTemperature = updateEngineTemperature;
const MathUtils_js_1 = require("../math/MathUtils.js");
const constants_js_1 = require("../shared/constants.js");
// ---------------------------------------------------------------------------
// Default surface
// ---------------------------------------------------------------------------
/** Surface ID used when a vehicle is not inside any defined SurfaceZone. */
exports.DEFAULT_SURFACE_ID = "asphalt";
/** Built-in asphalt fallback — full grip, no modifiers. */
exports.ASPHALT_SURFACE = {
    id: exports.DEFAULT_SURFACE_ID,
    friction: 1.0,
    speedMultiplier: 1.0,
    accelerationMultiplier: 1.0,
};
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
function resolveSurfaceGrip(surfaceId, surfaces, weather, baseLateralGrip) {
    const surface = surfaces.find((s) => s.id === surfaceId) ?? exports.ASPHALT_SURFACE;
    const wetReduction = constants_js_1.WET_FRICTION_REDUCTION * (0, MathUtils_js_1.clamp01)(weather.wetness);
    const combinedFriction = (0, MathUtils_js_1.clamp01)(surface.friction * (1 - wetReduction));
    const effectiveLateralGrip = (0, MathUtils_js_1.clamp01)(baseLateralGrip * combinedFriction);
    const accelerationMult = (0, MathUtils_js_1.clamp01)(surface.accelerationMultiplier * (1 - wetReduction * 0.5));
    const speedMult = (0, MathUtils_js_1.clamp01)(surface.speedMultiplier);
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
function resolveOverheatPenalty(engineTemp) {
    if (engineTemp <= constants_js_1.ENGINE_OVERHEAT_THRESHOLD)
        return 1.0;
    if (engineTemp >= constants_js_1.ENGINE_CRITICAL_THRESHOLD)
        return constants_js_1.ENGINE_OVERHEAT_SPEED_FACTOR;
    const t = (engineTemp - constants_js_1.ENGINE_OVERHEAT_THRESHOLD) /
        (constants_js_1.ENGINE_CRITICAL_THRESHOLD - constants_js_1.ENGINE_OVERHEAT_THRESHOLD);
    return 1.0 - t * (1.0 - constants_js_1.ENGINE_OVERHEAT_SPEED_FACTOR);
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
function updateEngineTemperature(currentTemp, throttle, engineHeatRate, coolingRate, ambientTemp, dt) {
    const generated = (0, MathUtils_js_1.clamp01)(throttle) * engineHeatRate * dt;
    const dissipated = Math.max(0, currentTemp - ambientTemp) * coolingRate * dt;
    const next = currentTemp + generated - dissipated;
    return Math.max(ambientTemp, Math.min(constants_js_1.ENGINE_CRITICAL_THRESHOLD + 50, next));
}
//# sourceMappingURL=SurfaceResponse.js.map