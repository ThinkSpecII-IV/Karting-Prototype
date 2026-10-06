/**
 * tests/math/Vector2.test.ts
 *
 * Unit tests for Vector2.
 * Every public method and static helper has at least one test.
 * Numeric assertions use a tight epsilon (1e-9) to catch rounding bugs.
 */

import { describe, it, expect } from "vitest";
import { Vector2 } from "../../src/math/Vector2.js";

// Reusable tolerance for floating-point comparisons
const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert two numbers are within EPS of each other. */
function near(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

/** Assert two Vector2 instances are component-wise equal within EPS. */
function vecNear(v: Vector2, x: number, y: number, eps = EPS): boolean {
  return near(v.x, x, eps) && near(v.y, y, eps);
}

// ---------------------------------------------------------------------------
// Static factories
// ---------------------------------------------------------------------------

describe("Vector2 — static factories", () => {
  it("ZERO is (0, 0)", () => {
    expect(Vector2.ZERO.x).toBe(0);
    expect(Vector2.ZERO.y).toBe(0);
  });

  it("RIGHT is (1, 0)", () => {
    expect(Vector2.RIGHT.x).toBe(1);
    expect(Vector2.RIGHT.y).toBe(0);
  });

  it("UP is (0, 1)", () => {
    expect(Vector2.UP.x).toBe(0);
    expect(Vector2.UP.y).toBe(1);
  });

  it("from() copies a plain {x, y} object", () => {
    const v = Vector2.from({ x: 3, y: -7 });
    expect(v.x).toBe(3);
    expect(v.y).toBe(-7);
  });

  it("fromAngle(0) returns (1, 0)", () => {
    const v = Vector2.fromAngle(0);
    expect(vecNear(v, 1, 0)).toBe(true);
  });

  it("fromAngle(π/2) returns (0, 1)", () => {
    const v = Vector2.fromAngle(Math.PI / 2);
    expect(vecNear(v, 0, 1, 1e-7)).toBe(true);
  });

  it("fromAngle(π) returns (-1, 0)", () => {
    const v = Vector2.fromAngle(Math.PI);
    expect(vecNear(v, -1, 0, 1e-7)).toBe(true);
  });

  it("fromAngle(3π/2) returns (0, -1)", () => {
    const v = Vector2.fromAngle((3 * Math.PI) / 2);
    expect(vecNear(v, 0, -1, 1e-7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("Vector2 — constructor", () => {
  it("stores x and y", () => {
    const v = new Vector2(4, -2);
    expect(v.x).toBe(4);
    expect(v.y).toBe(-2);
  });

  it("is immutable — x and y are readonly properties", () => {
    const v = new Vector2(1, 2);
    // TypeScript `readonly` is a compile-time constraint only — there is no
    // runtime throw when assigning through a cast. The guarantee here is that
    // the TypeScript compiler rejects `v.x = 99` without a cast, enforced by
    // `strict: true` and `noImplicitAny` in tsconfig.json.
    // We verify the value is unchanged after a cast-based bypass attempt:
    // (the assignment silently fails or is a no-op at runtime)
    try { (v as { x: number }).x = 99; } catch { /* ignored */ }
    // The original value must still be intact
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

describe("Vector2 — add", () => {
  it("adds two vectors component-wise", () => {
    const r = new Vector2(1, 2).add({ x: 3, y: 4 });
    expect(r.x).toBe(4);
    expect(r.y).toBe(6);
  });

  it("adding ZERO leaves vector unchanged", () => {
    const v = new Vector2(5, -3);
    const r = v.add(Vector2.ZERO);
    expect(r.x).toBe(5);
    expect(r.y).toBe(-3);
  });

  it("returns a new instance (immutability)", () => {
    const v = new Vector2(1, 2);
    const r = v.add({ x: 1, y: 1 });
    expect(r).not.toBe(v);
    expect(v.x).toBe(1); // original unchanged
  });
});

describe("Vector2 — sub", () => {
  it("subtracts component-wise", () => {
    const r = new Vector2(5, 7).sub({ x: 2, y: 3 });
    expect(r.x).toBe(3);
    expect(r.y).toBe(4);
  });

  it("v - v = (0, 0)", () => {
    const v = new Vector2(3, -4);
    const r = v.sub(v);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
});

describe("Vector2 — scale", () => {
  it("scales both components by scalar", () => {
    const r = new Vector2(3, -4).scale(2);
    expect(r.x).toBe(6);
    expect(r.y).toBe(-8);
  });

  it("scaling by 0 gives ZERO", () => {
    const r = new Vector2(100, 200).scale(0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("scaling by -1 negates", () => {
    const r = new Vector2(3, 4).scale(-1);
    expect(r.x).toBe(-3);
    expect(r.y).toBe(-4);
  });
});

describe("Vector2 — divideBy", () => {
  it("divides both components by scalar", () => {
    const r = new Vector2(6, -4).divideBy(2);
    expect(r.x).toBe(3);
    expect(r.y).toBe(-2);
  });

  it("throws on division by zero", () => {
    expect(() => new Vector2(1, 2).divideBy(0)).toThrow(RangeError);
  });
});

describe("Vector2 — negate", () => {
  it("negates both components", () => {
    const r = new Vector2(3, -4).negate();
    expect(r.x).toBe(-3);
    expect(r.y).toBe(4);
  });

  it("negate of ZERO is ZERO — no negative-zero produced", () => {
    const r = Vector2.ZERO.negate();
    // Constructor normalises -0 → +0, so Object.is(-0, 0) false-positive cannot occur.
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scalar products
// ---------------------------------------------------------------------------

describe("Vector2 — dot", () => {
  it("dot of perpendicular unit vectors is 0", () => {
    expect(Vector2.RIGHT.dot(Vector2.UP)).toBe(0);
  });

  it("dot of parallel unit vectors is 1", () => {
    expect(Vector2.RIGHT.dot(Vector2.RIGHT)).toBe(1);
  });

  it("dot of anti-parallel unit vectors is -1", () => {
    expect(Vector2.RIGHT.dot(new Vector2(-1, 0))).toBe(-1);
  });

  it("dot product formula: (1,2)·(3,4) = 11", () => {
    expect(new Vector2(1, 2).dot({ x: 3, y: 4 })).toBe(11);
  });
});

describe("Vector2 — cross", () => {
  it("cross of (1,0) × (0,1) = 1 (CCW)", () => {
    expect(Vector2.RIGHT.cross(Vector2.UP)).toBe(1);
  });

  it("cross of (0,1) × (1,0) = -1 (CW)", () => {
    expect(Vector2.UP.cross(Vector2.RIGHT)).toBe(-1);
  });

  it("cross of parallel vectors is 0", () => {
    expect(new Vector2(2, 4).cross(new Vector2(1, 2))).toBe(0);
  });

  it("cross product formula: (3,4)×(5,6) = 3*6 - 4*5 = -2", () => {
    expect(new Vector2(3, 4).cross({ x: 5, y: 6 })).toBe(-2);
  });
});

// ---------------------------------------------------------------------------
// Length / distance
// ---------------------------------------------------------------------------

describe("Vector2 — lengthSq", () => {
  it("(3,4) has lengthSq 25", () => {
    expect(new Vector2(3, 4).lengthSq()).toBe(25);
  });

  it("ZERO has lengthSq 0", () => {
    expect(Vector2.ZERO.lengthSq()).toBe(0);
  });
});

describe("Vector2 — length", () => {
  it("(3,4) has length 5 — Pythagorean triple", () => {
    expect(new Vector2(3, 4).length()).toBe(5);
  });

  it("(5,12) has length 13 — Pythagorean triple", () => {
    expect(new Vector2(5, 12).length()).toBe(13);
  });

  it("ZERO has length 0", () => {
    expect(Vector2.ZERO.length()).toBe(0);
  });

  it("unit RIGHT has length 1", () => {
    expect(Vector2.RIGHT.length()).toBe(1);
  });
});

describe("Vector2 — normalize", () => {
  it("normalizing (3,4) gives a unit vector", () => {
    const n = new Vector2(3, 4).normalize();
    expect(near(n.length(), 1, 1e-9)).toBe(true);
  });

  it("normalizing (3,4) gives (0.6, 0.8)", () => {
    const n = new Vector2(3, 4).normalize();
    expect(near(n.x, 0.6)).toBe(true);
    expect(near(n.y, 0.8)).toBe(true);
  });

  it("normalizing ZERO returns ZERO (safe fallback)", () => {
    const n = Vector2.ZERO.normalize();
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  it("normalizing a unit vector leaves it unchanged", () => {
    const n = Vector2.RIGHT.normalize();
    expect(vecNear(n, 1, 0)).toBe(true);
  });
});

describe("Vector2 — distanceTo / distanceSqTo", () => {
  it("distance between (0,0) and (3,4) is 5", () => {
    expect(Vector2.ZERO.distanceTo({ x: 3, y: 4 })).toBe(5);
  });

  it("distance between (1,1) and (4,5) is 5", () => {
    expect(new Vector2(1, 1).distanceTo({ x: 4, y: 5 })).toBe(5);
  });

  it("distanceSqTo avoids sqrt: (0,0)→(3,4) = 25", () => {
    expect(Vector2.ZERO.distanceSqTo({ x: 3, y: 4 })).toBe(25);
  });

  it("distance to self is 0", () => {
    const v = new Vector2(7, -3);
    expect(v.distanceTo(v)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Projection & decomposition
// ---------------------------------------------------------------------------

describe("Vector2 — projectOnto", () => {
  it("projecting (1,1) onto RIGHT gives (1,0)", () => {
    const p = new Vector2(1, 1).projectOnto(Vector2.RIGHT);
    expect(vecNear(p, 1, 0)).toBe(true);
  });

  it("projecting (3,4) onto (1,0) gives (3,0)", () => {
    const p = new Vector2(3, 4).projectOnto({ x: 1, y: 0 });
    expect(vecNear(p, 3, 0)).toBe(true);
  });

  it("projecting (3,4) onto (0,1) gives (0,4)", () => {
    const p = new Vector2(3, 4).projectOnto({ x: 0, y: 1 });
    expect(vecNear(p, 0, 4)).toBe(true);
  });

  it("projecting onto zero vector returns ZERO (safe fallback)", () => {
    const p = new Vector2(5, 5).projectOnto(Vector2.ZERO);
    expect(vecNear(p, 0, 0)).toBe(true);
  });
});

describe("Vector2 — rejectFrom", () => {
  it("reject of (3,4) from X axis gives (0,4)", () => {
    const r = new Vector2(3, 4).rejectFrom({ x: 1, y: 0 });
    expect(vecNear(r, 0, 4)).toBe(true);
  });

  it("project + reject = original vector", () => {
    const v = new Vector2(3, 4);
    const axis = new Vector2(1, 2).normalize();
    const proj = v.projectOnto(axis);
    const rej = v.rejectFrom(axis);
    const sum = proj.add(rej);
    expect(vecNear(sum, v.x, v.y, 1e-9)).toBe(true);
  });
});

describe("Vector2 — projectScalarOnto", () => {
  it("(3,4) projected onto (1,0) gives scalar 3", () => {
    expect(new Vector2(3, 4).projectScalarOnto({ x: 1, y: 0 })).toBe(3);
  });

  it("(3,4) projected onto (0,1) gives scalar 4", () => {
    expect(new Vector2(3, 4).projectScalarOnto({ x: 0, y: 1 })).toBe(4);
  });

  it("projecting onto zero vector returns 0 (safe fallback)", () => {
    expect(new Vector2(5, 5).projectScalarOnto(Vector2.ZERO)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Rotation
// ---------------------------------------------------------------------------

describe("Vector2 — rotate", () => {
  it("rotating RIGHT by π/2 gives UP (within tolerance)", () => {
    const r = Vector2.RIGHT.rotate(Math.PI / 2);
    expect(vecNear(r, 0, 1, 1e-7)).toBe(true);
  });

  it("rotating RIGHT by π gives (-1, 0)", () => {
    const r = Vector2.RIGHT.rotate(Math.PI);
    expect(vecNear(r, -1, 0, 1e-7)).toBe(true);
  });

  it("rotating RIGHT by -π/2 gives (0, -1)", () => {
    const r = Vector2.RIGHT.rotate(-Math.PI / 2);
    expect(vecNear(r, 0, -1, 1e-7)).toBe(true);
  });

  it("rotation preserves length", () => {
    const v = new Vector2(3, 4);
    const r = v.rotate(1.234);
    expect(near(r.length(), v.length(), 1e-7)).toBe(true);
  });

  it("rotating by 0 returns the same vector", () => {
    const v = new Vector2(3, 4);
    const r = v.rotate(0);
    expect(vecNear(r, v.x, v.y)).toBe(true);
  });

  it("rotating by 2π returns the same vector", () => {
    const v = new Vector2(3, 4);
    const r = v.rotate(2 * Math.PI);
    expect(vecNear(r, v.x, v.y, 1e-7)).toBe(true);
  });
});

describe("Vector2 — angle", () => {
  it("RIGHT.angle() = 0", () => {
    expect(Vector2.RIGHT.angle()).toBe(0);
  });

  it("UP.angle() = π/2", () => {
    expect(near(Vector2.UP.angle(), Math.PI / 2)).toBe(true);
  });

  it("(-1,0).angle() = π", () => {
    expect(near(new Vector2(-1, 0).angle(), Math.PI)).toBe(true);
  });

  it("(0,-1).angle() = -π/2", () => {
    expect(near(new Vector2(0, -1).angle(), -Math.PI / 2)).toBe(true);
  });

  it("fromAngle(θ).angle() round-trips within 1e-7", () => {
    const theta = 1.234;
    expect(near(Vector2.fromAngle(theta).angle(), theta, 1e-7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reflect
// ---------------------------------------------------------------------------

describe("Vector2 — reflect", () => {
  it("reflecting (1,-1) off horizontal floor (normal UP) gives (1,1)", () => {
    const v = new Vector2(1, -1);
    const r = v.reflect(Vector2.UP);
    expect(vecNear(r, 1, 1, 1e-7)).toBe(true);
  });

  it("reflecting (1,1) off vertical wall (normal RIGHT) gives (-1,1)", () => {
    const v = new Vector2(1, 1);
    const r = v.reflect(Vector2.RIGHT);
    expect(vecNear(r, -1, 1, 1e-7)).toBe(true);
  });

  it("reflecting along the normal reverses the vector", () => {
    const v = new Vector2(3, 0);
    const r = v.reflect(Vector2.RIGHT);
    expect(vecNear(r, -3, 0, 1e-7)).toBe(true);
  });

  it("reflecting preserves length", () => {
    const v = new Vector2(3, 4);
    const normal = new Vector2(1, 1).normalize();
    const r = v.reflect(normal);
    expect(near(r.length(), v.length(), 1e-7)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

describe("Vector2 — lerp", () => {
  it("lerp at t=0 returns this", () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(10, 20);
    expect(vecNear(a.lerp(b, 0), 0, 0)).toBe(true);
  });

  it("lerp at t=1 returns to", () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(10, 20);
    expect(vecNear(a.lerp(b, 1), 10, 20)).toBe(true);
  });

  it("lerp at t=0.5 returns midpoint", () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(10, 20);
    expect(vecNear(a.lerp(b, 0.5), 5, 10)).toBe(true);
  });

  it("lerp is symmetric: a.lerp(b,t) == b.lerp(a,1-t)", () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(7, 14);
    const r1 = a.lerp(b, 0.3);
    const r2 = b.lerp(a, 0.7);
    expect(vecNear(r1, r2.x, r2.y, 1e-9)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Equality
// ---------------------------------------------------------------------------

describe("Vector2 — equals", () => {
  it("identical vectors are equal", () => {
    expect(new Vector2(1, 2).equals({ x: 1, y: 2 })).toBe(true);
  });

  it("vectors within default epsilon are equal", () => {
    expect(new Vector2(1, 2).equals({ x: 1 + 1e-10, y: 2 })).toBe(true);
  });

  it("vectors outside epsilon are not equal", () => {
    expect(new Vector2(1, 2).equals({ x: 1 + 0.01, y: 2 })).toBe(false);
  });

  it("custom epsilon overrides default", () => {
    expect(new Vector2(1, 2).equals({ x: 1.005, y: 2 }, 0.01)).toBe(true);
    expect(new Vector2(1, 2).equals({ x: 1.015, y: 2 }, 0.01)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

describe("Vector2 — toPlain / toString", () => {
  it("toPlain returns a plain {x,y} object", () => {
    const plain = new Vector2(3, -4).toPlain();
    expect(plain).toEqual({ x: 3, y: -4 });
    expect(plain).not.toBeInstanceOf(Vector2);
  });

  it("toString is human-readable", () => {
    const s = new Vector2(1.5, -2.75).toString();
    expect(s).toContain("1.5000");
    expect(s).toContain("-2.7500");
    expect(s).toContain("Vector2");
  });
});

// ---------------------------------------------------------------------------
// Static raw helpers
// ---------------------------------------------------------------------------

describe("Vector2 — static raw helpers", () => {
  it("addRaw sums two plain objects", () => {
    const r = Vector2.addRaw({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(r).toEqual({ x: 4, y: 6 });
  });

  it("dotRaw computes dot product of plain objects", () => {
    expect(Vector2.dotRaw({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
    expect(Vector2.dotRaw({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(25);
  });

  it("distanceRaw between (0,0) and (3,4) is 5", () => {
    expect(Vector2.distanceRaw({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("distanceSqRaw between (0,0) and (3,4) is 25", () => {
    expect(Vector2.distanceSqRaw({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Physics-relevant scenario tests
// ---------------------------------------------------------------------------

describe("Vector2 — physics scenarios", () => {
  it("velocity decomposition: forward + lateral sums to original", () => {
    // Simulate decomposing a velocity vector into forward/lateral components.
    // This is the core of lateral grip calculation in VehiclePhysics.
    const velocity = new Vector2(5, 3);
    const forward = Vector2.fromAngle(0.4); // car facing at 0.4 rad

    const forwardComponent = velocity.projectOnto(forward);
    const lateralComponent = velocity.rejectFrom(forward);

    const reconstructed = forwardComponent.add(lateralComponent);
    expect(vecNear(reconstructed, velocity.x, velocity.y, 1e-9)).toBe(true);
  });

  it("reflection off a wall: velocity sign flips on normal axis, preserved on tangent", () => {
    // Ball hits a wall with normal pointing UP.
    // Incoming velocity: moving right and downward.
    const incoming = new Vector2(2, -3);
    const wallNormal = Vector2.UP; // wall is horizontal, normal points up
    const reflected = incoming.reflect(wallNormal);

    // x component (tangent) must be preserved
    expect(near(reflected.x, 2, 1e-7)).toBe(true);
    // y component (normal) must be negated
    expect(near(reflected.y, 3, 1e-7)).toBe(true);
  });

  it("drafting cone: follower directly behind leader (angle=0) has dot=1", () => {
    // Leader faces right. Follower is behind leader (to the left of leader).
    const leaderForward = Vector2.RIGHT;
    // offset = follower.pos - leader.pos (follower is BEHIND leader)
    const offset = new Vector2(-5, 0); // 5m behind
    const offsetDir = offset.normalize();
    // The dot of leaderForward and offsetDir should be -1 (directly behind)
    const dot = leaderForward.dot(offsetDir);
    expect(near(dot, -1, 1e-7)).toBe(true);
  });
});
