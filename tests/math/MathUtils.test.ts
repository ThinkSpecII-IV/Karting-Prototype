/**
 * tests/math/MathUtils.test.ts
 *
 * Unit tests for MathUtils.
 * Every exported function has at least one test; edge cases are covered
 * where floating-point behaviour is non-obvious.
 */

import { describe, it, expect } from "vitest";
import {
  // Constants
  TWO_PI,
  HALF_PI,
  DEG_TO_RAD,
  RAD_TO_DEG,
  // Conversion
  degToRad,
  radToDeg,
  // Clamping
  clamp,
  clamp01,
  sign,
  inRange,
  wrapPositive,
  // Interpolation
  lerp,
  lerpClamped,
  inverseLerp,
  remap,
  smoothStep,
  smootherStep,
  // Angles
  normalizeAngle,
  angleDelta,
  angleBetween,
  lerpAngle,
  // Numeric
  approxEqual,
  approxZero,
  sq,
  deadZone,
  moveToward,
  exponentialDecay,
  seededRandom,
  randomInt,
} from "../../src/math/MathUtils.js";

const EPS = 1e-9;
const LOOSE = 1e-7; // for trig results

function near(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("MathUtils — constants", () => {
  it("TWO_PI ≈ 6.2831853", () => {
    expect(near(TWO_PI, 2 * Math.PI)).toBe(true);
  });

  it("HALF_PI ≈ 1.5707963", () => {
    expect(near(HALF_PI, Math.PI / 2)).toBe(true);
  });

  it("DEG_TO_RAD * 180 = π", () => {
    expect(near(DEG_TO_RAD * 180, Math.PI)).toBe(true);
  });

  it("RAD_TO_DEG * π = 180", () => {
    expect(near(RAD_TO_DEG * Math.PI, 180)).toBe(true);
  });

  it("DEG_TO_RAD and RAD_TO_DEG are reciprocals", () => {
    expect(near(DEG_TO_RAD * RAD_TO_DEG, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

describe("MathUtils — degToRad / radToDeg", () => {
  it("degToRad(0) = 0", () => expect(degToRad(0)).toBe(0));
  it("degToRad(90) = π/2", () => expect(near(degToRad(90), Math.PI / 2)).toBe(true));
  it("degToRad(180) = π", () => expect(near(degToRad(180), Math.PI)).toBe(true));
  it("degToRad(360) = 2π", () => expect(near(degToRad(360), 2 * Math.PI)).toBe(true));
  it("degToRad(-90) = -π/2", () => expect(near(degToRad(-90), -Math.PI / 2)).toBe(true));

  it("radToDeg(0) = 0", () => expect(radToDeg(0)).toBe(0));
  it("radToDeg(π) = 180", () => expect(near(radToDeg(Math.PI), 180)).toBe(true));
  it("radToDeg(π/2) = 90", () => expect(near(radToDeg(Math.PI / 2), 90)).toBe(true));

  it("degToRad and radToDeg round-trip", () => {
    const deg = 137.5;
    expect(near(radToDeg(degToRad(deg)), deg)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Clamping & range
// ---------------------------------------------------------------------------

describe("MathUtils — clamp", () => {
  it("value below min returns min", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("value above max returns max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("value within range returns value", () => expect(clamp(5, 0, 10)).toBe(5));
  it("value equal to min returns min", () => expect(clamp(0, 0, 10)).toBe(0));
  it("value equal to max returns max", () => expect(clamp(10, 0, 10)).toBe(10));
  it("clamp with negative range", () => expect(clamp(-3, -10, -1)).toBe(-3));
});

describe("MathUtils — clamp01", () => {
  it("negative returns 0", () => expect(clamp01(-0.5)).toBe(0));
  it("above 1 returns 1", () => expect(clamp01(1.5)).toBe(1));
  it("0.5 returns 0.5", () => expect(clamp01(0.5)).toBe(0.5));
  it("exactly 0 returns 0", () => expect(clamp01(0)).toBe(0));
  it("exactly 1 returns 1", () => expect(clamp01(1)).toBe(1));
});

describe("MathUtils — sign", () => {
  it("positive returns 1", () => expect(sign(42)).toBe(1));
  it("negative returns -1", () => expect(sign(-7)).toBe(-1));
  it("zero returns 0", () => expect(sign(0)).toBe(0));
  it("small positive returns 1", () => expect(sign(1e-15)).toBe(1));
  it("small negative returns -1", () => expect(sign(-1e-15)).toBe(-1));
});

describe("MathUtils — inRange", () => {
  it("value strictly between min and max returns true", () => {
    expect(inRange(5, 0, 10)).toBe(true);
  });
  it("value equal to min returns false (exclusive)", () => {
    expect(inRange(0, 0, 10)).toBe(false);
  });
  it("value equal to max returns false (exclusive)", () => {
    expect(inRange(10, 0, 10)).toBe(false);
  });
  it("value outside range returns false", () => {
    expect(inRange(15, 0, 10)).toBe(false);
  });
});

describe("MathUtils — wrapPositive", () => {
  it("value within [0, range) is unchanged", () => {
    expect(wrapPositive(3, 10)).toBe(3);
  });
  it("value equal to range wraps to 0", () => {
    expect(wrapPositive(10, 10)).toBe(0);
  });
  it("negative value wraps correctly", () => {
    expect(wrapPositive(-1, 10)).toBe(9);
  });
  it("value larger than range wraps correctly", () => {
    expect(wrapPositive(13, 10)).toBe(3);
  });
  it("wrapping 2π around 2π gives 0", () => {
    expect(near(wrapPositive(TWO_PI, TWO_PI), 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

describe("MathUtils — lerp", () => {
  it("t=0 returns a", () => expect(lerp(0, 10, 0)).toBe(0));
  it("t=1 returns b", () => expect(lerp(0, 10, 1)).toBe(10));
  it("t=0.5 returns midpoint", () => expect(lerp(0, 10, 0.5)).toBe(5));
  it("works with negative values", () => expect(lerp(-10, 10, 0.5)).toBe(0));
  it("t is NOT clamped — extrapolation allowed", () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });
});

describe("MathUtils — lerpClamped", () => {
  it("t below 0 is clamped to a", () => expect(lerpClamped(0, 10, -1)).toBe(0));
  it("t above 1 is clamped to b", () => expect(lerpClamped(0, 10, 2)).toBe(10));
  it("t=0.5 returns midpoint", () => expect(lerpClamped(0, 10, 0.5)).toBe(5));
});

describe("MathUtils — inverseLerp", () => {
  it("value at a returns 0", () => expect(inverseLerp(0, 10, 0)).toBe(0));
  it("value at b returns 1", () => expect(inverseLerp(0, 10, 10)).toBe(1));
  it("value at midpoint returns 0.5", () => expect(inverseLerp(0, 10, 5)).toBe(0.5));
  it("a === b returns 0 (avoids division by zero)", () => {
    expect(inverseLerp(5, 5, 5)).toBe(0);
  });
  it("round-trips with lerp: inverseLerp(lerp(a,b,t)) = t", () => {
    const t = 0.37;
    const v = lerp(3, 17, t);
    expect(near(inverseLerp(3, 17, v), t)).toBe(true);
  });
});

describe("MathUtils — remap", () => {
  it("maps 5 from [0,10] to [0,100] → 50", () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });
  it("maps 0 from [0,1] to [-1,1] → -1", () => {
    expect(remap(0, 0, 1, -1, 1)).toBe(-1);
  });
  it("maps 1 from [0,1] to [-1,1] → 1", () => {
    expect(remap(1, 0, 1, -1, 1)).toBe(1);
  });
  it("maps 0.5 from [0,1] to [-1,1] → 0", () => {
    expect(remap(0.5, 0, 1, -1, 1)).toBe(0);
  });
});

describe("MathUtils — smoothStep", () => {
  it("smoothStep(0) = 0", () => expect(smoothStep(0)).toBe(0));
  it("smoothStep(1) = 1", () => expect(smoothStep(1)).toBe(1));
  it("smoothStep(0.5) = 0.5", () => expect(smoothStep(0.5)).toBe(0.5));
  it("is monotonically increasing between 0 and 1", () => {
    const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const curr = steps[i]!;
      expect(smoothStep(curr)).toBeGreaterThan(smoothStep(prev));
    }
  });
});

describe("MathUtils — smootherStep", () => {
  it("smootherStep(0) = 0", () => expect(smootherStep(0)).toBe(0));
  it("smootherStep(1) = 1", () => expect(smootherStep(1)).toBe(1));
  it("smootherStep(0.5) = 0.5", () => expect(smootherStep(0.5)).toBe(0.5));
});

// ---------------------------------------------------------------------------
// Angle utilities
// ---------------------------------------------------------------------------

describe("MathUtils — normalizeAngle", () => {
  it("angle in [-π, π] is unchanged: 1.0", () => {
    expect(near(normalizeAngle(1.0), 1.0)).toBe(true);
  });
  it("0 is unchanged", () => expect(normalizeAngle(0)).toBe(0));
  it("2π normalises to 0 (or ±near-zero)", () => {
    expect(near(normalizeAngle(TWO_PI), 0, LOOSE)).toBe(true);
  });
  it("3π normalises to π", () => {
    expect(near(normalizeAngle(3 * Math.PI), Math.PI, LOOSE)).toBe(true);
  });
  it("-2π normalises to 0", () => {
    expect(near(normalizeAngle(-TWO_PI), 0, LOOSE)).toBe(true);
  });
  it("5π/2 normalises to π/2", () => {
    expect(near(normalizeAngle(5 * Math.PI / 2), Math.PI / 2, LOOSE)).toBe(true);
  });
});

describe("MathUtils — angleDelta", () => {
  it("0° to 90° = π/2", () => {
    expect(near(angleDelta(0, Math.PI / 2), Math.PI / 2)).toBe(true);
  });
  it("0° to -90° = -π/2", () => {
    expect(near(angleDelta(0, -Math.PI / 2), -Math.PI / 2)).toBe(true);
  });
  it("0° to 270° = -π/2 (shortest arc, CW)", () => {
    // 270° = 3π/2; shortest path from 0 to 270° is -90° (CW)
    expect(near(angleDelta(0, (3 * Math.PI) / 2), -Math.PI / 2, LOOSE)).toBe(true);
  });
  it("same angle delta is 0", () => {
    expect(near(angleDelta(1.5, 1.5), 0)).toBe(true);
  });
  it("result is always in [-π, π]", () => {
    for (let a = -6; a <= 6; a += 0.5) {
      for (let b = -6; b <= 6; b += 0.5) {
        const d = angleDelta(a, b);
        expect(d).toBeGreaterThanOrEqual(-Math.PI - 1e-9);
        expect(d).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});

describe("MathUtils — angleBetween", () => {
  it("perpendicular angles: between 0 and π/2 = π/2", () => {
    expect(near(angleBetween(0, Math.PI / 2), Math.PI / 2)).toBe(true);
  });
  it("same angle returns 0", () => {
    expect(near(angleBetween(1.0, 1.0), 0)).toBe(true);
  });
  it("always returns non-negative result", () => {
    expect(angleBetween(Math.PI, 0)).toBeGreaterThanOrEqual(0);
    expect(angleBetween(0, -Math.PI)).toBeGreaterThanOrEqual(0);
  });
  it("result is always in [0, π]", () => {
    const samples = [-3, -2, -1, 0, 1, 2, 3];
    for (const a of samples) {
      for (const b of samples) {
        const ab = angleBetween(a, b);
        expect(ab).toBeGreaterThanOrEqual(0 - 1e-9);
        expect(ab).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});

describe("MathUtils — lerpAngle", () => {
  it("t=0 returns from angle", () => {
    expect(near(lerpAngle(0, Math.PI / 2, 0), 0)).toBe(true);
  });
  it("t=1 returns to angle", () => {
    expect(near(lerpAngle(0, Math.PI / 2, 1), Math.PI / 2)).toBe(true);
  });
  it("t=0.5 returns midpoint angle", () => {
    expect(near(lerpAngle(0, Math.PI, 0.5), Math.PI / 2)).toBe(true);
  });
  it("takes shortest arc: from=0, to=270°→-90° → t=0.5 gives -45°", () => {
    // 270° = 3π/2; shortest arc from 0 to 270° is -90° (CW), so at t=0.5 = -45°
    const result = lerpAngle(0, (3 * Math.PI) / 2, 0.5);
    expect(near(result, -Math.PI / 4, LOOSE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Numeric utilities
// ---------------------------------------------------------------------------

describe("MathUtils — approxEqual", () => {
  it("equal numbers return true", () => expect(approxEqual(1, 1)).toBe(true));
  it("within epsilon return true", () => expect(approxEqual(1, 1 + 1e-10)).toBe(true));
  it("outside epsilon return false", () => expect(approxEqual(1, 1.1)).toBe(false));
  it("custom epsilon: 1 and 1.005 equal within 0.01", () => {
    expect(approxEqual(1, 1.005, 0.01)).toBe(true);
  });
});

describe("MathUtils — approxZero", () => {
  it("0 is approx zero", () => expect(approxZero(0)).toBe(true));
  it("1e-10 is approx zero with default eps", () => expect(approxZero(1e-10)).toBe(true));
  it("0.1 is not approx zero", () => expect(approxZero(0.1)).toBe(false));
});

describe("MathUtils — sq", () => {
  it("sq(3) = 9", () => expect(sq(3)).toBe(9));
  it("sq(-4) = 16", () => expect(sq(-4)).toBe(16));
  it("sq(0) = 0", () => expect(sq(0)).toBe(0));
  it("sq(0.5) = 0.25", () => expect(sq(0.5)).toBe(0.25));
});

describe("MathUtils — deadZone", () => {
  it("value below threshold returns 0", () => {
    expect(deadZone(0.05, 0.1)).toBe(0);
  });
  it("negative value below threshold returns 0", () => {
    expect(deadZone(-0.05, 0.1)).toBe(0);
  });
  it("value above threshold returned unchanged", () => {
    expect(deadZone(0.5, 0.1)).toBe(0.5);
  });
  it("exactly at threshold passes through (boundary is exclusive)", () => {
    // deadZone returns 0 only when |value| < threshold (strictly less than).
    // When |value| === threshold the value is returned unchanged.
    expect(deadZone(0.1, 0.1)).toBe(0.1);
    expect(deadZone(-0.1, 0.1)).toBe(-0.1);
  });
});

describe("MathUtils — moveToward", () => {
  it("moves toward target by maxStep", () => {
    expect(moveToward(0, 10, 3)).toBe(3);
  });
  it("does not overshoot target", () => {
    expect(moveToward(9, 10, 5)).toBe(10);
  });
  it("moves in negative direction", () => {
    expect(moveToward(10, 0, 3)).toBe(7);
  });
  it("already at target returns target", () => {
    expect(moveToward(5, 5, 10)).toBe(5);
  });
});

describe("MathUtils — exponentialDecay", () => {
  it("rate=0 means no decay (value unchanged after one dt)", () => {
    // (1 - 0)^(dt/refDt) = 1
    expect(near(exponentialDecay(10, 0, 1 / 60), 10)).toBe(true);
  });

  it("rate=1 means instant full decay to 0", () => {
    // (1 - 1)^anything = 0
    expect(exponentialDecay(10, 1, 1 / 60)).toBe(0);
  });

  it("rate=0.5 at one reference timestep halves the value", () => {
    // (1 - 0.5)^1 = 0.5 → value * 0.5
    const result = exponentialDecay(10, 0.5, 1 / 60, 1 / 60);
    expect(near(result, 5)).toBe(true);
  });

  it("decay is dt-independent: same total time regardless of step count", () => {
    // Decaying with one large step should equal decaying with many small steps.
    const rate = 0.3;
    const refDt = 1 / 60;
    const totalTime = 1 / 60; // one reference tick

    // One big step
    const oneBigStep = exponentialDecay(100, rate, totalTime, refDt);

    // Four steps of totalTime/4
    let value = 100;
    for (let i = 0; i < 4; i++) {
      value = exponentialDecay(value, rate, totalTime / 4, refDt);
    }

    expect(near(oneBigStep, value, 1e-7)).toBe(true);
  });

  it("positive decay produces value between 0 and original", () => {
    const result = exponentialDecay(100, 0.6, 1 / 60);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// seededRandom
// ---------------------------------------------------------------------------

describe("MathUtils — seededRandom", () => {
  it("returns values in [0, 1)", () => {
    const rng = seededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("same seed produces the same sequence", () => {
    const rng1 = seededRandom(12345);
    const rng2 = seededRandom(12345);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = seededRandom(1);
    const rng2 = seededRandom(2);
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (rng1() !== rng2()) { allSame = false; break; }
    }
    expect(allSame).toBe(false);
  });
});

describe("MathUtils — randomInt", () => {
  it("returns integers within [min, max] inclusive", () => {
    const rng = seededRandom(99);
    for (let i = 0; i < 500; i++) {
      const v = randomInt(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("returns all values in range with enough samples", () => {
    const rng = seededRandom(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(randomInt(rng, 1, 5));
    }
    expect(seen.size).toBe(5); // all of 1,2,3,4,5 should appear
  });
});

// ---------------------------------------------------------------------------
// Constants sanity: verify constants.ts runtime assertions do not throw
// ---------------------------------------------------------------------------

describe("MathUtils — constants.ts runtime assertions", () => {
  it("importing constants.ts does not throw (tick divisibility check passes)", async () => {
    await expect(
      import("../../src/shared/constants.js")
    ).resolves.toBeDefined();
  });
});
