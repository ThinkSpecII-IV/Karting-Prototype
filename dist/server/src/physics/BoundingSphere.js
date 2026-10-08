"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KART_RESTITUTION = exports.WALL_RESTITUTION = void 0;
exports.resolveWallCollision = resolveWallCollision;
exports.resolveWallCollisions = resolveWallCollisions;
exports.resolveSphereCollision = resolveSphereCollision;
exports.clampToWorldBounds = clampToWorldBounds;
const Vector2_js_1 = require("../math/Vector2.js");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * Coefficient of restitution for wall bounces.
 * 1.0 = perfectly elastic (no energy loss).
 * 0.6 = 40% speed loss on bounce — arcade-appropriate.
 */
exports.WALL_RESTITUTION = 0.6;
/**
 * Coefficient of restitution for kart-kart collisions.
 * Lower than wall bounce so cars nudge rather than ping off each other.
 */
exports.KART_RESTITUTION = 0.4;
/**
 * Small bias added to the push-out distance to prevent a car from resting
 * exactly on a wall surface and colliding again next tick (floating-point
 * precision guard).
 */
const SEPARATION_BIAS = 0.001; // metres
// ---------------------------------------------------------------------------
// nearestPointOnSegment (internal)
// ---------------------------------------------------------------------------
/**
 * Return the point on segment [a, b] nearest to point p.
 * Pure geometry — no side effects.
 */
function nearestPointOnSegment(p, a, b) {
    const ab = b.sub(a);
    const abLenSq = ab.lengthSq();
    // Degenerate segment (zero length) — treat b as point.
    if (abLenSq === 0)
        return { point: a, t: 0 };
    // Project p onto the line through a and b, clamp to [0, 1].
    const t = Math.max(0, Math.min(1, p.sub(a).dot(ab) / abLenSq));
    return { point: a.add(ab.scale(t)), t };
}
// ---------------------------------------------------------------------------
// resolveWallCollision
// ---------------------------------------------------------------------------
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
function resolveWallCollision(position, velocity, radius, wall, restitution = exports.WALL_RESTITUTION) {
    const pos = Vector2_js_1.Vector2.from(position);
    const vel = Vector2_js_1.Vector2.from(velocity);
    const a = new Vector2_js_1.Vector2(wall.x1, wall.y1);
    const b = new Vector2_js_1.Vector2(wall.x2, wall.y2);
    const { point: nearest } = nearestPointOnSegment(pos, a, b);
    const toCircle = pos.sub(nearest);
    const dist = toCircle.length();
    // No collision — return inputs unchanged.
    if (dist >= radius) {
        return {
            collided: false,
            position,
            velocity,
            normal: Vector2_js_1.Vector2.ZERO.toPlain(),
            penetration: 0,
        };
    }
    const penetration = radius - dist;
    // Compute outward normal: from wall contact point toward circle centre.
    // If dist ≈ 0 (centre exactly on the segment) use segment's left-hand normal.
    let normal;
    if (dist < 1e-9) {
        const ab = b.sub(a);
        // Left-hand perpendicular of AB (rotated 90° CCW).
        normal = new Vector2_js_1.Vector2(-ab.y, ab.x).normalize();
    }
    else {
        normal = toCircle.normalize();
    }
    // Push position out of the wall along the normal + bias.
    const correctedPos = pos.add(normal.scale(penetration + SEPARATION_BIAS));
    // Reflect velocity across the normal, apply restitution.
    // v_reflected = v - 2(v·n)n  then scale by restitution.
    const vDotN = vel.dot(normal);
    // Only reflect if car is moving into the wall (vDotN < 0).
    let correctedVel;
    if (vDotN < 0) {
        correctedVel = vel.sub(normal.scale(2 * vDotN)).scale(restitution);
    }
    else {
        // Car already moving away — don't reflect, just stop the penetrating component.
        correctedVel = vel;
    }
    return {
        collided: true,
        position: correctedPos.toPlain(),
        velocity: correctedVel.toPlain(),
        normal: normal.toPlain(),
        penetration,
    };
}
// ---------------------------------------------------------------------------
// resolveWallCollisions (batch)
// ---------------------------------------------------------------------------
/**
 * Run `resolveWallCollision` against every boundary in `walls` in order.
 * Each resolved position is fed into the next check so compound corners
 * (two walls meeting at an angle) are handled correctly.
 *
 * Returns the final corrected position and velocity after all wall tests.
 */
function resolveWallCollisions(position, velocity, radius, walls, restitution = exports.WALL_RESTITUTION) {
    let pos = position;
    let vel = velocity;
    let collisionCount = 0;
    for (const wall of walls) {
        const result = resolveWallCollision(pos, vel, radius, wall, restitution);
        if (result.collided) {
            pos = result.position;
            vel = result.velocity;
            collisionCount++;
        }
    }
    return { position: pos, velocity: vel, collisionCount };
}
// ---------------------------------------------------------------------------
// resolveSphereCollision
// ---------------------------------------------------------------------------
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
function resolveSphereCollision(posA, velA, radiusA, posB, velB, radiusB, restitution = exports.KART_RESTITUTION) {
    const pA = Vector2_js_1.Vector2.from(posA);
    const vA = Vector2_js_1.Vector2.from(velA);
    const pB = Vector2_js_1.Vector2.from(posB);
    const vB = Vector2_js_1.Vector2.from(velB);
    const axis = pA.sub(pB); // A relative to B
    const dist = axis.length();
    const minDist = radiusA + radiusB;
    if (dist >= minDist) {
        return {
            collided: false,
            positionA: posA,
            positionB: posB,
            velocityA: velA,
            velocityB: velB,
            penetration: 0,
        };
    }
    const penetration = minDist - dist;
    // Collision normal: unit vector from B toward A.
    // If centres are coincident, pick an arbitrary axis.
    const normal = dist < 1e-9
        ? Vector2_js_1.Vector2.RIGHT
        : axis.divideBy(dist);
    // Push each body out by half the penetration along the normal + bias.
    const halfPush = (penetration * 0.5) + SEPARATION_BIAS;
    const correctedPosA = pA.add(normal.scale(halfPush));
    const correctedPosB = pB.sub(normal.scale(halfPush));
    // Project velocities onto the collision axis.
    const vAn = vA.dot(normal); // scalar: A's speed toward B
    const vBn = vB.dot(normal); // scalar: B's speed toward A
    // Only apply impulse if they are moving toward each other.
    // (Prevents double-applying impulse when objects are separating.)
    if (vAn - vBn >= 0) {
        // Already separating — correct positions only.
        return {
            collided: true,
            positionA: correctedPosA.toPlain(),
            positionB: correctedPosB.toPlain(),
            velocityA: velA,
            velocityB: velB,
            penetration,
        };
    }
    // Elastic 1-D collision along normal axis (equal mass):
    // After: A gets B's normal component, B gets A's. Damped by restitution.
    const impulseAn = vBn * restitution;
    const impulseBn = vAn * restitution;
    // Replace each velocity's normal component with the post-collision value.
    const correctedVelA = vA
        .sub(normal.scale(vAn)) // remove old normal component
        .add(normal.scale(impulseAn)); // add new normal component
    const correctedVelB = vB
        .sub(normal.scale(vBn))
        .add(normal.scale(impulseBn));
    return {
        collided: true,
        positionA: correctedPosA.toPlain(),
        positionB: correctedPosB.toPlain(),
        velocityA: correctedVelA.toPlain(),
        velocityB: correctedVelB.toPlain(),
        penetration,
    };
}
// ---------------------------------------------------------------------------
// clampToWorldBounds
// ---------------------------------------------------------------------------
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
function clampToWorldBounds(position, velocity, radius, bounds) {
    let { x, y } = position;
    let { x: vx, y: vy } = velocity;
    if (x - radius < bounds.minX) {
        x = bounds.minX + radius;
        if (vx < 0)
            vx = 0;
    }
    if (x + radius > bounds.maxX) {
        x = bounds.maxX - radius;
        if (vx > 0)
            vx = 0;
    }
    if (y - radius < bounds.minY) {
        y = bounds.minY + radius;
        if (vy < 0)
            vy = 0;
    }
    if (y + radius > bounds.maxY) {
        y = bounds.maxY - radius;
        if (vy > 0)
            vy = 0;
    }
    return { position: { x, y }, velocity: { x: vx, y: vy } };
}
//# sourceMappingURL=BoundingSphere.js.map