/**
 * src/physics/BoundingSphere.ts
 *
 * Lightweight bounding-circle collision primitives for kart physics.
 *
 * Responsibilities:
 *   - Circle-vs-line-segment overlap test (car hitting a wall boundary)
 *   - Circle-vs-circle overlap test (car-car collision)
 *   - Impulse resolution for both cases
 *   - Axis-aligned rectangular world-limit clamp (fallback hard border)
 *
 * DESIGN NOTES:
 *   All geometry stays in 2-D world space (metres). No rendering code here.
 *
 *   Wall collision uses the "nearest point on segment" method:
 *     1. Find the closest point P on the line segment to the circle centre C.
 *     2. If |C − P| < radius, penetration has occurred.
 *     3. Push C out along the segment normal by (radius − penetration).
 *     4. Reflect velocity across the segment normal and dampen by restitution.
 *
 *   Car-car collision is circle-circle:
 *     1. Compute overlap = r1 + r2 − dist(C1, C2).
 *     2. Push both centres apart by overlap/2 along the collision axis.
 *     3. Exchange velocity components along the axis (elastic, then dampen).
 *
 * INVARIANT (INV-04): No imports from rendering, networking, or UI layers.
 *
 * References: Spec §6 Collision System; ARCHITECTURE.md §7.
 */
import type { LineSegment, Vec2 } from "../shared/types.js";
/** Outcome of a single circle-vs-line collision check. */
export interface WallCollisionResult {
    /** True when the circle overlaps (or just touches) the segment. */
    readonly collided: boolean;
    /** Corrected position that places the circle flush against the wall. */
    readonly position: Vec2;
    /** Velocity after reflection and restitution. */
    readonly velocity: Vec2;
    /**
     * Outward unit normal of the wall at the contact point.
     * Points away from the wall toward the circle centre.
     * Zero vector when there was no collision.
     */
    readonly normal: Vec2;
    /** Penetration depth in metres (0 when no collision). */
    readonly penetration: number;
}
/** Outcome of a single circle-vs-circle collision check. */
export interface SphereCollisionResult {
    /** True when the circles overlap. */
    readonly collided: boolean;
    /** Corrected position for body A. */
    readonly positionA: Vec2;
    /** Corrected position for body B. */
    readonly positionB: Vec2;
    /** Velocity for body A after impulse exchange. */
    readonly velocityA: Vec2;
    /** Velocity for body B after impulse exchange. */
    readonly velocityB: Vec2;
    /** Penetration depth in metres (0 when no collision). */
    readonly penetration: number;
}
/**
 * Coefficient of restitution for wall bounces.
 * 1.0 = perfectly elastic (no energy loss).
 * 0.6 = 40% speed loss on bounce — arcade-appropriate.
 */
export declare const WALL_RESTITUTION: 0.6;
/**
 * Coefficient of restitution for kart-kart collisions.
 * Lower than wall bounce so cars nudge rather than ping off each other.
 */
export declare const KART_RESTITUTION: 0.4;
/**
 * Test a circle (position + radius) against a single wall line segment and,
 * if overlapping, compute the corrected position and reflected velocity.
 *
 * The outward normal always points from the wall toward the circle centre at
 * time of first contact, so reflection pushes the car back into free space.
 *
 * @param position   Current world-space centre of the circle (metres).
 * @param velocity   Current world-space velocity (m/s).
 * @param radius     Collision radius (metres).
 * @param wall       The wall boundary as a LineSegment.
 * @param restitution  Energy-retention factor [0..1]. Default WALL_RESTITUTION.
 */
export declare function resolveWallCollision(position: Vec2, velocity: Vec2, radius: number, wall: LineSegment, restitution?: number): WallCollisionResult;
/**
 * Run `resolveWallCollision` against every boundary in `walls` in order.
 * Each resolved position is fed into the next check so compound corners
 * (two walls meeting at an angle) are handled correctly.
 *
 * Returns the final corrected position and velocity after all wall tests.
 */
export declare function resolveWallCollisions(position: Vec2, velocity: Vec2, radius: number, walls: readonly LineSegment[], restitution?: number): {
    position: Vec2;
    velocity: Vec2;
    collisionCount: number;
};
/**
 * Test two circles (A and B) for overlap and, if overlapping, compute
 * corrected positions and post-impulse velocities.
 *
 * Uses a symmetric impulse exchange along the collision axis:
 *   - Equal mass assumed (same kart, same mass from VehicleConfig).
 *   - Each car is pushed apart by half the penetration depth.
 *   - Velocity components along the axis are swapped and damped.
 *
 * @param posA       Centre of circle A (metres).
 * @param velA       Velocity of body A (m/s).
 * @param radiusA    Collision radius of A (metres).
 * @param posB       Centre of circle B (metres).
 * @param velB       Velocity of body B (m/s).
 * @param radiusB    Collision radius of B (metres).
 * @param restitution  Energy-retention factor [0..1]. Default KART_RESTITUTION.
 */
export declare function resolveSphereCollision(posA: Vec2, velA: Vec2, radiusA: number, posB: Vec2, velB: Vec2, radiusB: number, restitution?: number): SphereCollisionResult;
/**
 * Hard-clamp a circle to remain inside an axis-aligned rectangular world.
 * This is a last-resort boundary — tracks should be fully walled.
 * Velocity components that point outside the boundary are zeroed.
 *
 * @param position  Circle centre (metres).
 * @param velocity  Current velocity (m/s).
 * @param radius    Collision radius (metres).
 * @param bounds    `{ minX, minY, maxX, maxY }` world limits in metres.
 */
export declare function clampToWorldBounds(position: Vec2, velocity: Vec2, radius: number, bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}): {
    position: Vec2;
    velocity: Vec2;
};
//# sourceMappingURL=BoundingSphere.d.ts.map