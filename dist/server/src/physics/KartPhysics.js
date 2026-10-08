"use strict";
/**
 * src/physics/KartPhysics.ts
 *
 * Core per-tick vehicle physics integrator.
 *
 * `integrate()` advances a single VehicleState by one fixed timestep.
 * It is a pure function: given the same inputs it always produces the same
 * output. No I/O, no networking, no rendering.
 *
 * PHYSICS PIPELINE (per tick):
 *   1. Steering   — update rotation from angular velocity.
 *   2. Basis       — compute forward and right unit vectors from rotation.
 *   3. Lateral slip — decompose velocity into forward + lateral components;
 *                     apply lateral friction (normal) or drift grip (drift).
 *   4. Engine thrust — compute forward force from throttle + surface + overheat.
 *   5. Drag        — aerodynamic (v²) + rolling resistance.
 *   6. Braking     — oppose current velocity.
 *   7. Integration — v += F/m * dt; pos += v * dt.
 *   8. Speed cap   — clamp |v| to maxSpeed * surfaceMult * overheatPenalty.
 *   9. Drift flag  — update isDrifting from lateral speed.
 *  10. Engine temp — delegate to SurfaceResponse.updateEngineTemperature.
 *
 * INVARIANTS:
 *   INV-04: No imports from rendering, networking, or UI.
 *   INV-08: Physics uses a fixed timestep. Variable dt is NEVER passed here
 *           from real-time code; the caller always passes PHYSICS_DT.
 *   INV-05: AI and human vehicles use the same integrate() path.
 *
 * References: Spec §5 Vehicle Physics; ARCHITECTURE.md §7.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_KART_CONFIG = void 0;
exports.integrate = integrate;
exports.applyUpdate = applyUpdate;
exports.createDefaultVehicleState = createDefaultVehicleState;
const Vector2_js_1 = require("../math/Vector2.js");
const MathUtils_js_1 = require("../math/MathUtils.js");
const constants_js_1 = require("../shared/constants.js");
const SurfaceResponse_js_1 = require("./SurfaceResponse.js");
// ---------------------------------------------------------------------------
// integrate
// ---------------------------------------------------------------------------
/**
 * Advance one vehicle by one physics tick.
 *
 * @param state    Current VehicleState (read-only during integration).
 * @param config   Immutable VehicleConfig for this kart.
 * @param surface  Pre-resolved grip/speed result from SurfaceResponse.
 * @param ambientTemperature  WeatherState.temperature (°C) for heat dissipation.
 * @param dt       Fixed timestep in seconds — always pass PHYSICS_DT.
 *
 * @returns KartPhysicsUpdate with the new kinematic values.
 */
function integrate(state, config, surface, ambientTemperature, dt) {
    // -------------------------------------------------------------------------
    // 1. STEERING — angular velocity from steering input
    // -------------------------------------------------------------------------
    // Turn rate scales with speed so the car turns tightly at low speed and
    // has a wider radius at high speed (realistic car feel).
    // angularVelocity = steeringInput * steeringRate * speedRatio
    // where speedRatio = clamp(|v| / maxSpeed, 0, 1)
    const speed = Math.sqrt(state.velocity.x * state.velocity.x +
        state.velocity.y * state.velocity.y);
    const speedRatio = (0, MathUtils_js_1.clamp01)(speed / Math.max(config.maxSpeed, 0.001));
    // Minimum turn ratio so the car can steer from rest (0.15 = 15% of max rate).
    const MIN_STEER_RATIO = 0.15;
    const steerRatio = MIN_STEER_RATIO + (1 - MIN_STEER_RATIO) * speedRatio;
    const newAngularVelocity = state.steering * config.steeringRate * steerRatio;
    // Update rotation.
    const newRotation = state.rotation + newAngularVelocity * dt;
    // -------------------------------------------------------------------------
    // 2. BASIS VECTORS — from updated rotation
    // -------------------------------------------------------------------------
    // forward = (cos θ, sin θ)  — direction the car faces
    // right   = (sin θ, -cos θ) — 90° CW from forward (right side of car)
    const forward = Vector2_js_1.Vector2.fromAngle(newRotation);
    const right = new Vector2_js_1.Vector2(forward.y, -forward.x); // 90° CW
    // -------------------------------------------------------------------------
    // 3. LATERAL FRICTION & SLIP
    // -------------------------------------------------------------------------
    // Decompose world-velocity into forward and lateral scalars.
    const vel = Vector2_js_1.Vector2.from(state.velocity);
    const vForward = vel.dot(forward); // m/s along car's forward axis
    const vLateral = vel.dot(right); // m/s along car's right axis
    // Select lateral grip: drift grip when drift input is active.
    // Oversteer factor reduces effective rear grip (>1 = more oversteer).
    const baseGrip = state.isDriftInput
        ? config.driftGrip
        : surface.effectiveLateralGrip;
    // Oversteer modulation: reduces grip further for high-oversteer configs.
    // effectiveGrip = baseGrip / max(oversteerFactor, 1)
    // (oversteerFactor = 1 → no change; > 1 → less grip → more slide)
    const effectiveGrip = (0, MathUtils_js_1.clamp01)(baseGrip / Math.max(config.oversteerFactor, 1));
    // Exponential lateral decay — dt-independent.
    // v_lateral_new = v_lateral * (1 - effectiveGrip)^(dt / PHYSICS_DT)
    //
    // We use exponentialDecay() from MathUtils rather than a plain multiplier so
    // the grip coefficient is defined per-reference-timestep (1/60 s) and the
    // result is identical regardless of how many sub-steps are used.
    //
    // effectiveGrip = 1.0 → rate = 1.0 → instant zero (perfect grip)
    // effectiveGrip = 0.0 → rate = 0.0 → no decay (frictionless)
    const newVLateral = (0, MathUtils_js_1.exponentialDecay)(vLateral, effectiveGrip, dt);
    // -------------------------------------------------------------------------
    // 4. ENGINE THRUST
    // -------------------------------------------------------------------------
    const overheatPenalty = (0, SurfaceResponse_js_1.resolveOverheatPenalty)(state.engineTemperature);
    const effectiveAccMult = surface.accelerationMult * overheatPenalty;
    const engineForce = (0, MathUtils_js_1.clamp01)(state.throttle) * config.enginePower * effectiveAccMult;
    // -------------------------------------------------------------------------
    // 5. DRAG (aerodynamic + rolling resistance)
    // -------------------------------------------------------------------------
    // F_drag = dragCoef * v²  (always opposes forward direction, capped at
    //   max engine force to prevent drag from reversing the car at low speeds)
    const dragForce = Math.min(config.dragCoef * vForward * vForward, config.enginePower);
    // Rolling resistance: constant force opposing motion, only when moving.
    const rollingForce = speed > 0.01 ? config.rollingResistance : 0;
    // -------------------------------------------------------------------------
    // 6. BRAKING
    // -------------------------------------------------------------------------
    // Brake opposes current forward velocity. Capped so it cannot reverse the car.
    const brakeForce = (0, MathUtils_js_1.clamp01)(state.brake) * config.brakeForce;
    // -------------------------------------------------------------------------
    // 7. NET FORWARD FORCE → forward acceleration
    // -------------------------------------------------------------------------
    // Net force along forward axis:
    //   F_net = F_engine − F_drag − F_rolling − (F_brake if moving forward)
    // Sign note: drag and rolling always oppose motion; brake opposes vForward sign.
    const netForwardForce = engineForce -
        (vForward >= 0
            ? dragForce + rollingForce + brakeForce
            : -(dragForce + rollingForce + brakeForce));
    const forwardAccel = netForwardForce / config.mass;
    const newVForward = vForward + forwardAccel * dt;
    // -------------------------------------------------------------------------
    // 8. RECONSTRUCT WORLD-SPACE VELOCITY
    // -------------------------------------------------------------------------
    const newVelVec = forward.scale(newVForward).add(right.scale(newVLateral));
    // -------------------------------------------------------------------------
    // 9. SPEED CAP (anti-tunnelling + surface + overheat)
    // -------------------------------------------------------------------------
    const effectiveMaxSpeed = Math.min(config.maxSpeed, constants_js_1.MAX_SPEED_MS) *
        surface.speedMult *
        overheatPenalty;
    let newVelocity;
    const newSpeed = newVelVec.length();
    if (newSpeed > effectiveMaxSpeed) {
        const capped = newVelVec.scale(effectiveMaxSpeed / newSpeed);
        newVelocity = capped.toPlain();
    }
    else {
        newVelocity = newVelVec.toPlain();
    }
    // -------------------------------------------------------------------------
    // 10. POSITION INTEGRATION (Euler)
    // -------------------------------------------------------------------------
    const newPosition = {
        x: state.position.x + newVelocity.x * dt,
        y: state.position.y + newVelocity.y * dt,
    };
    // -------------------------------------------------------------------------
    // 11. DRIFT FLAG
    // -------------------------------------------------------------------------
    // isDrifting = |lateral velocity| exceeds the VFX threshold.
    const finalSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
    const lateralFraction = finalSpeed > 0.01 ? Math.abs(newVLateral) / finalSpeed : 0;
    const isDrifting = state.isDriftInput || lateralFraction > Math.sin(constants_js_1.DRIFT_VFX_THRESHOLD_RAD);
    // -------------------------------------------------------------------------
    // 12. ENGINE TEMPERATURE
    // -------------------------------------------------------------------------
    const newEngineTemperature = (0, SurfaceResponse_js_1.updateEngineTemperature)(state.engineTemperature, state.throttle, config.engineHeatRate, config.coolingRate, ambientTemperature, dt);
    return {
        position: newPosition,
        velocity: newVelocity,
        rotation: newRotation,
        angularVelocity: newAngularVelocity,
        isDrifting,
        engineTemperature: newEngineTemperature,
    };
}
// ---------------------------------------------------------------------------
// applyUpdate
// ---------------------------------------------------------------------------
/**
 * Merge a KartPhysicsUpdate back into a mutable VehicleState in place.
 * All other VehicleState fields (race progress, surface, input) are untouched.
 *
 * Call order each tick:
 *   const update = integrate(state, config, surface, ambient, dt);
 *   // resolve collisions against update.position / update.velocity
 *   applyUpdate(state, update);          // or apply post-collision values
 */
function applyUpdate(state, update) {
    state.position = update.position;
    state.velocity = update.velocity;
    state.rotation = update.rotation;
    state.angularVelocity = update.angularVelocity;
    state.isDrifting = update.isDrifting;
    state.engineTemperature = update.engineTemperature;
}
// ---------------------------------------------------------------------------
// createDefaultVehicleState
// ---------------------------------------------------------------------------
/**
 * Create a zeroed-out VehicleState for a given player ID and spawn point.
 * Used by GameServer when a new player joins or a race restarts.
 *
 * @param id        Player / socket ID.
 * @param x         Spawn world X position (metres).
 * @param y         Spawn world Y position (metres).
 * @param rotation  Spawn facing angle (radians).
 * @param surface   Initial surface ID (default "asphalt").
 * @param ambientTemp  Starting engine temperature = ambient (°C).
 */
function createDefaultVehicleState(id, x, y, rotation, surface = "asphalt", ambientTemp = 20) {
    return {
        id,
        carModel: "Ferrari F2002",
        position: { x, y },
        rotation,
        velocity: { x: 0, y: 0 },
        angularVelocity: 0,
        throttle: 0,
        brake: 0,
        steering: 0,
        isDriftInput: false,
        isDrifting: false,
        inDraft: false,
        currentSurface: surface,
        engineTemperature: ambientTemp,
        completedLaps: 0,
        currentCheckpointIndex: 0,
        checkpointProgress: 0,
        finished: false,
        finishTime: 0,
    };
}
// ---------------------------------------------------------------------------
// DEFAULT_KART_CONFIG
// ---------------------------------------------------------------------------
/**
 * A balanced reference kart config used for unit tests and as a template
 * for building real per-car configurations.
 *
 * All values satisfy the tunnelling safety constraint:
 *   maxSpeed (25 m/s) ≤ VEHICLE_RADIUS (0.5 m) / PHYSICS_DT (1/60 s) ≈ 30 m/s  ✓
 */
exports.DEFAULT_KART_CONFIG = {
    id: "kart_default",
    mass: 180, // kg  — realistic kart with driver
    maxSpeed: 25, // m/s ≈ 90 km/h
    enginePower: 2200, // N   — peak thrust at full throttle
    brakeForce: 3500, // N   — strong braking
    steeringRate: 2.8, // rad/s at full steering input
    lateralGrip: 0.82, // dry asphalt grip
    driftGrip: 0.25, // reduced grip in drift mode
    dragCoef: 1.1, // aerodynamic drag (F = dragCoef * v²)
    rollingResistance: 60, // N   — constant rolling resistance
    oversteerFactor: 1.0, // neutral handling
    downforceCoef: 0.08, // modest downforce
    collisionRadius: 0.5, // m
    engineHeatRate: 5.0, // °C/s at full throttle
    coolingRate: 0.08, // proportion of excess °C lost per second
};
//# sourceMappingURL=KartPhysics.js.map