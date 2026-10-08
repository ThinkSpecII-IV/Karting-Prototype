/**
 * src/math/Vector2.ts
 *
 * Immutable 2-D vector math for the kart physics engine.
 *
 * DESIGN DECISIONS:
 * - All operations return NEW Vector2 instances (immutable style).
 *   This prevents accidental mutation of physics state.
 * - The class is a thin value-object. No methods are overloaded with
 *   in-place variants — if performance profiling ever demands it, add
 *   a separate MutableVector2 later and document the switch.
 * - Angles are always in RADIANS (see INV-12).
 *
 * COORDINATE SYSTEM (INV-12):
 *   X = right, Y = up/forward, angles CCW from +X axis.
 *   Canvas Y-inversion is handled exclusively in Renderer.ts.
 */
/** Read-only view of a Vector2 (also satisfies the Vec2 interface from types.ts). */
export interface IVector2 {
    readonly x: number;
    readonly y: number;
}
export declare class Vector2 implements IVector2 {
    readonly x: number;
    readonly y: number;
    constructor(x: number, y: number);
    /** Zero vector (0, 0). Returns the same cached instance every call. */
    static readonly ZERO: Vector2;
    /** Unit vector pointing right (+X). */
    static readonly RIGHT: Vector2;
    /** Unit vector pointing up (+Y). */
    static readonly UP: Vector2;
    /** Create a Vector2 from a plain {x, y} object (e.g. from a network snapshot). */
    static from(v: IVector2): Vector2;
    /**
     * Create a unit vector from an angle in radians (CCW from +X axis).
     * Equivalent to (cos θ, sin θ).
     */
    static fromAngle(angleRad: number): Vector2;
    /** Return this + v. */
    add(v: IVector2): Vector2;
    /** Return this - v. */
    sub(v: IVector2): Vector2;
    /** Return this * scalar. */
    scale(s: number): Vector2;
    /** Return this / scalar. Throws if scalar is zero. */
    divideBy(s: number): Vector2;
    /** Return component-wise negation: (-x, -y). */
    negate(): Vector2;
    /** Dot product: this · v = x₁x₂ + y₁y₂. */
    dot(v: IVector2): number;
    /**
     * 2-D cross product (scalar z-component of the 3-D cross product):
     * this × v = x₁y₂ − y₁x₂.
     * Positive when v is CCW from this; negative when CW.
     * Useful for determining which side of a line a point lies on.
     */
    cross(v: IVector2): number;
    /** Squared length (avoids sqrt — use when comparing distances). */
    lengthSq(): number;
    /** Euclidean length (magnitude). */
    length(): number;
    /**
     * Return a unit vector in the same direction.
     * Returns Vector2.ZERO if the vector is zero-length (safe fallback).
     */
    normalize(): Vector2;
    /** Euclidean distance from this to v. */
    distanceTo(v: IVector2): number;
    /** Squared distance from this to v (avoids sqrt). */
    distanceSqTo(v: IVector2): number;
    /**
     * Project this vector onto the direction of `onto`.
     * Returns the scalar component of this along `onto`'s direction.
     * `onto` does NOT need to be normalised; the method normalises internally.
     */
    projectScalarOnto(onto: IVector2): number;
    /**
     * Return the vector component of this parallel to `onto`.
     * `onto` does NOT need to be normalised.
     */
    projectOnto(onto: IVector2): Vector2;
    /**
     * Return the vector component of this perpendicular to `onto`.
     * `onto` does NOT need to be normalised.
     */
    rejectFrom(onto: IVector2): Vector2;
    /**
     * Rotate this vector by `angleRad` radians (CCW).
     * Uses the standard 2-D rotation matrix.
     */
    rotate(angleRad: number): Vector2;
    /**
     * Return the angle of this vector in radians (CCW from +X axis).
     * Range: [-π, π]. Returns 0 for the zero vector.
     */
    angle(): number;
    /**
     * Reflect this vector across a surface defined by its normal.
     * `normal` must be a unit vector.
     * Formula: v_reflected = v - 2(v·n)n
     */
    reflect(normal: IVector2): Vector2;
    /**
     * Linear interpolation from this to `to`.
     * @param t Blend factor [0..1]. 0 = this, 1 = to. Not clamped.
     */
    lerp(to: IVector2, t: number): Vector2;
    /**
     * Component-wise approximate equality within an absolute epsilon.
     * @param epsilon Defaults to Number.EPSILON * 1000 for floating-point safety.
     */
    equals(v: IVector2, epsilon?: number): boolean;
    /** Return a plain {x, y} object (JSON-serialisable, matches Vec2 from types.ts). */
    toPlain(): {
        x: number;
        y: number;
    };
    /** Human-readable string for logging and debugging. */
    toString(): string;
    /** Add two plain vectors without allocating a Vector2 instance. */
    static addRaw(a: IVector2, b: IVector2): {
        x: number;
        y: number;
    };
    /** Dot product of two plain vectors. */
    static dotRaw(a: IVector2, b: IVector2): number;
    /** Distance between two plain vectors. */
    static distanceRaw(a: IVector2, b: IVector2): number;
    /** Squared distance between two plain vectors (avoids sqrt). */
    static distanceSqRaw(a: IVector2, b: IVector2): number;
}
//# sourceMappingURL=Vector2.d.ts.map