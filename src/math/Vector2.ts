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

export class Vector2 implements IVector2 {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    // Normalise -0 to +0 so Object.is / toBe comparisons are always consistent.
    // IEEE 754 operations like `-(0)` or `0 * -1` produce -0, which fails
    // strict equality checks (Object.is(-0, 0) === false).
    this.x = x === 0 ? 0 : x;
    this.y = y === 0 ? 0 : y;
    // Freeze so accidental runtime mutation throws in strict mode and is
    // detectable in tests — readonly is TypeScript-only without this.
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Static factory helpers
  // ---------------------------------------------------------------------------

  /** Zero vector (0, 0). Returns the same cached instance every call. */
  static readonly ZERO = new Vector2(0, 0);

  /** Unit vector pointing right (+X). */
  static readonly RIGHT = new Vector2(1, 0);

  /** Unit vector pointing up (+Y). */
  static readonly UP = new Vector2(0, 1);

  /** Create a Vector2 from a plain {x, y} object (e.g. from a network snapshot). */
  static from(v: IVector2): Vector2 {
    return new Vector2(v.x, v.y);
  }

  /**
   * Create a unit vector from an angle in radians (CCW from +X axis).
   * Equivalent to (cos θ, sin θ).
   */
  static fromAngle(angleRad: number): Vector2 {
    return new Vector2(Math.cos(angleRad), Math.sin(angleRad));
  }

  // ---------------------------------------------------------------------------
  // Arithmetic
  // ---------------------------------------------------------------------------

  /** Return this + v. */
  add(v: IVector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /** Return this - v. */
  sub(v: IVector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /** Return this * scalar. */
  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  /** Return this / scalar. Throws if scalar is zero. */
  divideBy(s: number): Vector2 {
    if (s === 0) throw new RangeError("Vector2.divideBy: division by zero");
    return new Vector2(this.x / s, this.y / s);
  }

  /** Return component-wise negation: (-x, -y). */
  negate(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  // ---------------------------------------------------------------------------
  // Scalar products
  // ---------------------------------------------------------------------------

  /** Dot product: this · v = x₁x₂ + y₁y₂. */
  dot(v: IVector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * 2-D cross product (scalar z-component of the 3-D cross product):
   * this × v = x₁y₂ − y₁x₂.
   * Positive when v is CCW from this; negative when CW.
   * Useful for determining which side of a line a point lies on.
   */
  cross(v: IVector2): number {
    return this.x * v.y - this.y * v.x;
  }

  // ---------------------------------------------------------------------------
  // Length / distance
  // ---------------------------------------------------------------------------

  /** Squared length (avoids sqrt — use when comparing distances). */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Euclidean length (magnitude). */
  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  /**
   * Return a unit vector in the same direction.
   * Returns Vector2.ZERO if the vector is zero-length (safe fallback).
   */
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return Vector2.ZERO;
    return new Vector2(this.x / len, this.y / len);
  }

  /** Euclidean distance from this to v. */
  distanceTo(v: IVector2): number {
    return this.sub(v).length();
  }

  /** Squared distance from this to v (avoids sqrt). */
  distanceSqTo(v: IVector2): number {
    return this.sub(v).lengthSq();
  }

  // ---------------------------------------------------------------------------
  // Projection & decomposition
  // ---------------------------------------------------------------------------

  /**
   * Project this vector onto the direction of `onto`.
   * Returns the scalar component of this along `onto`'s direction.
   * `onto` does NOT need to be normalised; the method normalises internally.
   */
  projectScalarOnto(onto: IVector2): number {
    const lenSq = onto.x * onto.x + onto.y * onto.y;
    if (lenSq === 0) return 0;
    return (this.x * onto.x + this.y * onto.y) / Math.sqrt(lenSq);
  }

  /**
   * Return the vector component of this parallel to `onto`.
   * `onto` does NOT need to be normalised.
   */
  projectOnto(onto: IVector2): Vector2 {
    const lenSq = onto.x * onto.x + onto.y * onto.y;
    if (lenSq === 0) return Vector2.ZERO;
    const scalar = (this.x * onto.x + this.y * onto.y) / lenSq;
    return new Vector2(onto.x * scalar, onto.y * scalar);
  }

  /**
   * Return the vector component of this perpendicular to `onto`.
   * `onto` does NOT need to be normalised.
   */
  rejectFrom(onto: IVector2): Vector2 {
    return this.sub(this.projectOnto(onto));
  }

  // ---------------------------------------------------------------------------
  // Rotation
  // ---------------------------------------------------------------------------

  /**
   * Rotate this vector by `angleRad` radians (CCW).
   * Uses the standard 2-D rotation matrix.
   */
  rotate(angleRad: number): Vector2 {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /**
   * Return the angle of this vector in radians (CCW from +X axis).
   * Range: [-π, π]. Returns 0 for the zero vector.
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Reflect this vector across a surface defined by its normal.
   * `normal` must be a unit vector.
   * Formula: v_reflected = v - 2(v·n)n
   */
  reflect(normal: IVector2): Vector2 {
    const dot2 = 2 * this.dot(normal);
    return new Vector2(this.x - dot2 * normal.x, this.y - dot2 * normal.y);
  }

  // ---------------------------------------------------------------------------
  // Interpolation
  // ---------------------------------------------------------------------------

  /**
   * Linear interpolation from this to `to`.
   * @param t Blend factor [0..1]. 0 = this, 1 = to. Not clamped.
   */
  lerp(to: IVector2, t: number): Vector2 {
    return new Vector2(
      this.x + (to.x - this.x) * t,
      this.y + (to.y - this.y) * t
    );
  }

  // ---------------------------------------------------------------------------
  // Comparison / equality
  // ---------------------------------------------------------------------------

  /**
   * Component-wise approximate equality within an absolute epsilon.
   * @param epsilon Defaults to Number.EPSILON * 1000 for floating-point safety.
   */
  equals(v: IVector2, epsilon = 1e-9): boolean {
    return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  /** Return a plain {x, y} object (JSON-serialisable, matches Vec2 from types.ts). */
  toPlain(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** Human-readable string for logging and debugging. */
  toString(): string {
    return `Vector2(${this.x.toFixed(4)}, ${this.y.toFixed(4)})`;
  }

  // ---------------------------------------------------------------------------
  // Static utility variants (operate on plain {x,y} without allocating)
  // ---------------------------------------------------------------------------

  /** Add two plain vectors without allocating a Vector2 instance. */
  static addRaw(a: IVector2, b: IVector2): { x: number; y: number } {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  /** Dot product of two plain vectors. */
  static dotRaw(a: IVector2, b: IVector2): number {
    return a.x * b.x + a.y * b.y;
  }

  /** Distance between two plain vectors. */
  static distanceRaw(a: IVector2, b: IVector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Squared distance between two plain vectors (avoids sqrt). */
  static distanceSqRaw(a: IVector2, b: IVector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
}
