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
import type { VehicleConfig, VehicleState, Vec2 } from "../shared/types.js";
import type { SurfaceGripResult } from "./SurfaceResponse.js";
/**
 * The subset of VehicleState fields that `integrate()` writes.
 * Returned as a new object — the caller is responsible for merging these
 * back into the authoritative VehicleState.
 *
 * Keeping it as a partial update (rather than mutating in place) allows the
 * physics step to be tested independently and makes rollback straightforward.
 */
export interface KartPhysicsUpdate {
    readonly position: Vec2;
    readonly velocity: Vec2;
    readonly rotation: number;
    readonly angularVelocity: number;
    readonly isDrifting: boolean;
    readonly engineTemperature: number;
}
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
export declare function integrate(state: Readonly<VehicleState>, config: Readonly<VehicleConfig>, surface: Readonly<SurfaceGripResult>, ambientTemperature: number, dt: number): KartPhysicsUpdate;
/**
 * Merge a KartPhysicsUpdate back into a mutable VehicleState in place.
 * All other VehicleState fields (race progress, surface, input) are untouched.
 *
 * Call order each tick:
 *   const update = integrate(state, config, surface, ambient, dt);
 *   // resolve collisions against update.position / update.velocity
 *   applyUpdate(state, update);          // or apply post-collision values
 */
export declare function applyUpdate(state: VehicleState, update: KartPhysicsUpdate): void;
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
export declare function createDefaultVehicleState(id: string, x: number, y: number, rotation: number, surface?: string, ambientTemp?: number): VehicleState;
/**
 * A balanced reference kart config used for unit tests and as a template
 * for building real per-car configurations.
 *
 * All values satisfy the tunnelling safety constraint:
 *   maxSpeed (25 m/s) ≤ VEHICLE_RADIUS (0.5 m) / PHYSICS_DT (1/60 s) ≈ 30 m/s  ✓
 */
export declare const DEFAULT_KART_CONFIG: Readonly<VehicleConfig>;
//# sourceMappingURL=KartPhysics.d.ts.map