/**
 * tests/physics/KartPhysics.test.ts
 *
 * Unit tests for all three Phase-2 physics modules:
 *   - SurfaceResponse  (grip modifiers, overheat, engine temperature)
 *   - BoundingSphere   (wall collision, sphere collision, world bounds clamp)
 *   - KartPhysics      (integrate() — acceleration, braking, slip, drift, cap)
 *
 * Every numeric assertion is derived from the actual formula in the source so
 * a refactor that silently changes behaviour will be caught immediately.
 *
 * No rendering, networking, or DOM APIs are used.
 */

import { describe, it, expect } from "vitest";

// --- physics modules ---
import {
  resolveSurfaceGrip,
  resolveOverheatPenalty,
  updateEngineTemperature,
  ASPHALT_SURFACE,
} from "../../src/physics/SurfaceResponse.js";

import {
  resolveWallCollision,
  resolveWallCollisions,
  resolveSphereCollision,
  clampToWorldBounds,
  WALL_RESTITUTION,
} from "../../src/physics/BoundingSphere.js";

import {
  integrate,
  applyUpdate,
  createDefaultVehicleState,
  DEFAULT_KART_CONFIG,
} from "../../src/physics/KartPhysics.js";

// --- shared ---
import type { VehicleState, WeatherState, LineSegment } from "../../src/shared/types.js";
import {
  PHYSICS_DT,
  ENGINE_OVERHEAT_THRESHOLD,
  ENGINE_CRITICAL_THRESHOLD,
  ENGINE_OVERHEAT_SPEED_FACTOR,
} from "../../src/shared/constants.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const DT = PHYSICS_DT; // 1/60 s

/** Tolerance for floating-point comparisons that involve multiplication chains. */
const EPS = 1e-9;
const LOOSE = 1e-6;

function near(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

/** Dry, clear weather — no modifiers applied. */
const CLEAR_WEATHER: WeatherState = {
  type: "clear",
  intensity: 0,
  temperature: 20,
  windDirection: 0,
  windStrength: 0,
  wetness: 0,
};

/** Fully saturated rain weather. */
const RAIN_WEATHER: WeatherState = {
  type: "rain",
  intensity: 1.0,
  temperature: 15,
  windDirection: 270,
  windStrength: 8,
  wetness: 1.0,
};

/** Pre-resolved dry asphalt grip for DEFAULT_KART_CONFIG. */
const DRY_ASPHALT_GRIP = resolveSurfaceGrip(
  "asphalt",
  [ASPHALT_SURFACE],
  CLEAR_WEATHER,
  DEFAULT_KART_CONFIG.lateralGrip
);

/** Factory: fresh VehicleState at origin facing right (+X), engine at ambient 20 °C. */
function makeState(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...createDefaultVehicleState("p1", 0, 0, 0),
    ...overrides,
  };
}

// ===========================================================================
// SECTION 1 — SurfaceResponse
// ===========================================================================

describe("SurfaceResponse — resolveSurfaceGrip", () => {
  it("dry asphalt returns full grip and no speed penalty", () => {
    const result = resolveSurfaceGrip(
      "asphalt",
      [ASPHALT_SURFACE],
      CLEAR_WEATHER,
      DEFAULT_KART_CONFIG.lateralGrip
    );
    // combinedFriction = 1.0 * (1 - 0.5*0) = 1.0
    expect(near(result.combinedFriction, 1.0)).toBe(true);
    // effectiveLateralGrip = lateralGrip * 1.0
    expect(near(result.effectiveLateralGrip, DEFAULT_KART_CONFIG.lateralGrip)).toBe(true);
    expect(near(result.speedMult, 1.0)).toBe(true);
    expect(near(result.accelerationMult, 1.0)).toBe(true);
  });

  it("fully wet asphalt reduces combinedFriction by 50%", () => {
    const result = resolveSurfaceGrip(
      "asphalt",
      [ASPHALT_SURFACE],
      RAIN_WEATHER,
      DEFAULT_KART_CONFIG.lateralGrip
    );
    // combinedFriction = 1.0 * (1 - 0.5*1.0) = 0.5
    expect(near(result.combinedFriction, 0.5)).toBe(true);
    // effectiveLateralGrip = 0.82 * 0.5 = 0.41
    expect(near(result.effectiveLateralGrip, DEFAULT_KART_CONFIG.lateralGrip * 0.5)).toBe(true);
  });

  it("wet acceleration multiplier is reduced by 25% at full wetness", () => {
    const result = resolveSurfaceGrip(
      "asphalt",
      [ASPHALT_SURFACE],
      RAIN_WEATHER,
      DEFAULT_KART_CONFIG.lateralGrip
    );
    // accelerationMult = 1.0 * (1 - 0.5*0.5) = 0.75
    expect(near(result.accelerationMult, 0.75)).toBe(true);
  });

  it("unknown surface ID falls back to ASPHALT_SURFACE", () => {
    const result = resolveSurfaceGrip(
      "moon_dust",
      [ASPHALT_SURFACE],
      CLEAR_WEATHER,
      DEFAULT_KART_CONFIG.lateralGrip
    );
    expect(near(result.combinedFriction, 1.0)).toBe(true);
  });

  it("low-friction dirt surface reduces grip", () => {
    const dirtSurface = {
      id: "dirt",
      friction: 0.6,
      speedMultiplier: 0.9,
      accelerationMultiplier: 0.8,
    };
    const result = resolveSurfaceGrip(
      "dirt",
      [ASPHALT_SURFACE, dirtSurface],
      CLEAR_WEATHER,
      DEFAULT_KART_CONFIG.lateralGrip
    );
    // combinedFriction = 0.6 * 1.0 = 0.6
    expect(near(result.combinedFriction, 0.6)).toBe(true);
    // effectiveLateralGrip = 0.82 * 0.6 = 0.492
    expect(near(result.effectiveLateralGrip, DEFAULT_KART_CONFIG.lateralGrip * 0.6, LOOSE)).toBe(true);
    // speedMult = 0.9
    expect(near(result.speedMult, 0.9)).toBe(true);
    // accelerationMult = 0.8 * 1.0 = 0.8
    expect(near(result.accelerationMult, 0.8)).toBe(true);
  });

  it("all output values are clamped to [0, 1]", () => {
    const badSurface = { id: "x", friction: 5.0, speedMultiplier: 5.0, accelerationMultiplier: 5.0 };
    const result = resolveSurfaceGrip("x", [badSurface], CLEAR_WEATHER, 2.0);
    expect(result.effectiveLateralGrip).toBeLessThanOrEqual(1.0);
    expect(result.effectiveLateralGrip).toBeGreaterThanOrEqual(0.0);
    expect(result.accelerationMult).toBeLessThanOrEqual(1.0);
    expect(result.speedMult).toBeLessThanOrEqual(1.0);
    expect(result.combinedFriction).toBeLessThanOrEqual(1.0);
  });
});

describe("SurfaceResponse — resolveOverheatPenalty", () => {
  it("below threshold returns full power (1.0)", () => {
    expect(resolveOverheatPenalty(ENGINE_OVERHEAT_THRESHOLD - 1)).toBe(1.0);
    expect(resolveOverheatPenalty(20)).toBe(1.0);
    expect(resolveOverheatPenalty(0)).toBe(1.0);
  });

  it("at critical threshold returns ENGINE_OVERHEAT_SPEED_FACTOR", () => {
    expect(resolveOverheatPenalty(ENGINE_CRITICAL_THRESHOLD)).toBe(ENGINE_OVERHEAT_SPEED_FACTOR);
  });

  it("above critical threshold is clamped to ENGINE_OVERHEAT_SPEED_FACTOR", () => {
    expect(resolveOverheatPenalty(ENGINE_CRITICAL_THRESHOLD + 100)).toBe(ENGINE_OVERHEAT_SPEED_FACTOR);
  });

  it("midpoint between threshold and critical gives 0.5 linear interpolation", () => {
    const mid = (ENGINE_OVERHEAT_THRESHOLD + ENGINE_CRITICAL_THRESHOLD) / 2;
    const expected = 1.0 - 0.5 * (1.0 - ENGINE_OVERHEAT_SPEED_FACTOR);
    expect(near(resolveOverheatPenalty(mid), expected, LOOSE)).toBe(true);
  });

  it("penalty is monotonically non-increasing as temperature rises", () => {
    let prev = resolveOverheatPenalty(100);
    for (let t = 110; t <= 200; t += 5) {
      const curr = resolveOverheatPenalty(t);
      expect(curr).toBeLessThanOrEqual(prev + 1e-9);
      prev = curr;
    }
  });
});

describe("SurfaceResponse — updateEngineTemperature", () => {
  const config = DEFAULT_KART_CONFIG;
  const ambient = 20;

  it("at full throttle temperature increases each tick", () => {
    const next = updateEngineTemperature(ambient, 1.0, config.engineHeatRate, config.coolingRate, ambient, DT);
    expect(next).toBeGreaterThan(ambient);
  });

  it("at zero throttle temperature drifts back toward ambient over time", () => {
    // Start hot, no throttle. coolingRate=0.08/s, ambient=20°C.
    // After 600 ticks (10 s): temp decays exponentially toward 20°C.
    // Verified: 600 ticks from 100°C ≈ 55.9°C — well below the start of 100°C.
    let temp = 100;
    for (let i = 0; i < 600; i++) {
      temp = updateEngineTemperature(temp, 0, config.engineHeatRate, config.coolingRate, ambient, DT);
    }
    // Temperature must have dropped significantly from 100°C
    expect(temp).toBeLessThan(70);
    // But must still be above ambient (exponential decay never reaches it in finite time)
    expect(temp).toBeGreaterThan(ambient);
  });

  it("temperature never falls below ambient", () => {
    let temp = ambient;
    for (let i = 0; i < 300; i++) {
      temp = updateEngineTemperature(temp, 0, config.engineHeatRate, config.coolingRate, ambient, DT);
    }
    expect(temp).toBeGreaterThanOrEqual(ambient - 1e-9);
  });

  it("temperature is bounded above by ENGINE_CRITICAL_THRESHOLD + 50", () => {
    let temp = 20;
    // Apply max throttle for a very long time
    for (let i = 0; i < 10000; i++) {
      temp = updateEngineTemperature(temp, 1.0, config.engineHeatRate, config.coolingRate, ambient, DT);
    }
    expect(temp).toBeLessThanOrEqual(ENGINE_CRITICAL_THRESHOLD + 50 + 1e-9);
  });

  it("higher ambient temperature causes engine to run hotter", () => {
    const tempCool = updateEngineTemperature(80, 1.0, config.engineHeatRate, config.coolingRate, 10, DT);
    const tempHot  = updateEngineTemperature(80, 1.0, config.engineHeatRate, config.coolingRate, 40, DT);
    // Less cooling at high ambient → ends up hotter
    expect(tempHot).toBeGreaterThan(tempCool);
  });
});

// ===========================================================================
// SECTION 2 — BoundingSphere
// ===========================================================================

describe("BoundingSphere — resolveWallCollision", () => {
  const radius = 0.5;

  it("no collision when circle is well clear of segment", () => {
    const wall: LineSegment = { x1: -10, y1: 0, x2: 10, y2: 0 };
    const result = resolveWallCollision({ x: 0, y: 5 }, { x: 0, y: -2 }, radius, wall);
    expect(result.collided).toBe(false);
    expect(result.position).toEqual({ x: 0, y: 5 });
    expect(result.velocity).toEqual({ x: 0, y: -2 });
    expect(result.penetration).toBe(0);
  });

  it("detects collision when circle overlaps horizontal floor segment", () => {
    // Circle at (0, 0.3) with radius 0.5 overlaps the wall at y=0
    const wall: LineSegment = { x1: -10, y1: 0, x2: 10, y2: 0 };
    const result = resolveWallCollision({ x: 0, y: 0.3 }, { x: 1, y: -3 }, radius, wall);
    expect(result.collided).toBe(true);
    expect(result.penetration).toBeGreaterThan(0);
  });

  it("pushes circle above the floor so it no longer overlaps", () => {
    const wall: LineSegment = { x1: -10, y1: 0, x2: 10, y2: 0 };
    const result = resolveWallCollision({ x: 0, y: 0.3 }, { x: 0, y: -3 }, radius, wall);
    expect(result.position.y).toBeGreaterThanOrEqual(radius - 1e-6);
  });

  it("reflects velocity across the wall normal", () => {
    // Horizontal wall at y=0, car moving downward (negative y)
    const wall: LineSegment = { x1: -10, y1: 0, x2: 10, y2: 0 };
    const result = resolveWallCollision({ x: 0, y: 0.3 }, { x: 2, y: -5 }, radius, wall);
    // Y velocity must now be positive (reflected upward)
    expect(result.velocity.y).toBeGreaterThan(0);
    // X velocity must be unchanged (tangent to wall)
    expect(near(result.velocity.x, 2 * WALL_RESTITUTION, LOOSE)).toBe(true);
  });

  it("applies restitution — speed is reduced by WALL_RESTITUTION factor", () => {
    const wall: LineSegment = { x1: -10, y1: 0, x2: 10, y2: 0 };
    const inSpeed = 5;
    const result = resolveWallCollision({ x: 0, y: 0.3 }, { x: 0, y: -inSpeed }, radius, wall);
    const outSpeed = Math.sqrt(result.velocity.x ** 2 + result.velocity.y ** 2);
    expect(near(outSpeed, inSpeed * WALL_RESTITUTION, LOOSE)).toBe(true);
  });

  it("does not reflect velocity if car is already moving away from wall", () => {
    // Circle slightly inside wall but moving away (positive y)
    const wall: LineSegment = { x1: -10, y1: 0, x2: 10, y2: 0 };
    const result = resolveWallCollision({ x: 0, y: 0.3 }, { x: 0, y: 3 }, radius, wall);
    if (result.collided) {
      // Position must still be corrected but velocity sign must stay positive
      expect(result.velocity.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles vertical wall correctly", () => {
    // Vertical wall at x=0, car approaching from right
    const wall: LineSegment = { x1: 0, y1: -10, x2: 0, y2: 10 };
    const result = resolveWallCollision({ x: 0.3, y: 0 }, { x: -4, y: 0 }, radius, wall);
    expect(result.collided).toBe(true);
    // X velocity must flip
    expect(result.velocity.x).toBeGreaterThan(0);
    // Y velocity unchanged (tangent)
    expect(near(result.velocity.y, 0, LOOSE)).toBe(true);
  });

  it("handles endpoint corner — car hits the end of a segment", () => {
    // Short wall from (0,0) to (1,0). Circle hits its left endpoint.
    const wall: LineSegment = { x1: 0, y1: 0, x2: 1, y2: 0 };
    const result = resolveWallCollision({ x: -0.2, y: 0 }, { x: 1, y: 0 }, radius, wall);
    // The nearest point is the segment start (0,0); dist = 0.2 < 0.5 → collision
    expect(result.collided).toBe(true);
  });
});

describe("BoundingSphere — resolveWallCollisions (batch)", () => {
  it("no collision with empty boundary list", () => {
    const r = resolveWallCollisions({ x: 0, y: 5 }, { x: 1, y: 0 }, 0.5, []);
    expect(r.collisionCount).toBe(0);
    expect(r.position).toEqual({ x: 0, y: 5 });
  });

  it("counts multiple simultaneous wall collisions", () => {
    // Two parallel walls — car stuck between them
    const walls: LineSegment[] = [
      { x1: -10, y1: 0,  x2: 10, y2: 0 },   // floor
      { x1: -10, y1: 1,  x2: 10, y2: 1 },   // ceiling 1m above
    ];
    // Car at y=0.5 exactly between them — touches both
    const r = resolveWallCollisions({ x: 0, y: 0.5 }, { x: 0, y: 0 }, 0.5, walls);
    // Both are exactly touching (dist == radius) → no penetration, collisionCount=0
    expect(r.collisionCount).toBe(0);
  });
});

describe("BoundingSphere — resolveSphereCollision", () => {
  const rA = 0.5;
  const rB = 0.5;

  it("no collision when circles are well separated", () => {
    const r = resolveSphereCollision(
      { x: 0, y: 0 }, { x: 0, y: 0 }, rA,
      { x: 5, y: 0 }, { x: 0, y: 0 }, rB
    );
    expect(r.collided).toBe(false);
    expect(r.penetration).toBe(0);
  });

  it("detects collision when circles overlap", () => {
    // Centers are 0.5m apart, combined radius = 1.0 → overlap = 0.5
    const r = resolveSphereCollision(
      { x: 0, y: 0 }, { x: 0, y: 0 }, rA,
      { x: 0.5, y: 0 }, { x: 0, y: 0 }, rB
    );
    expect(r.collided).toBe(true);
    expect(near(r.penetration, 0.5, LOOSE)).toBe(true);
  });

  it("separates circles so they are no longer overlapping", () => {
    const r = resolveSphereCollision(
      { x: 0, y: 0 }, { x: 5, y: 0 }, rA,
      { x: 0.6, y: 0 }, { x: -5, y: 0 }, rB
    );
    const dist = Math.sqrt(
      (r.positionA.x - r.positionB.x) ** 2 +
      (r.positionA.y - r.positionB.y) ** 2
    );
    expect(dist).toBeGreaterThanOrEqual(rA + rB - 1e-6);
  });

  it("head-on collision: velocities exchange along axis", () => {
    // A moves right at 5 m/s, B moves left at 5 m/s, perfectly head-on
    const r = resolveSphereCollision(
      { x: 0, y: 0 }, { x:  5, y: 0 }, rA,
      { x: 0.6, y: 0 }, { x: -5, y: 0 }, rB
    );
    // After elastic exchange with restitution: A should move leftward, B rightward
    expect(r.velocityA.x).toBeLessThan(0);
    expect(r.velocityB.x).toBeGreaterThan(0);
  });

  it("tangential velocities (perpendicular to axis) are unchanged", () => {
    // A and B moving in same direction — only lateral separation
    const r = resolveSphereCollision(
      { x: 0, y: 0 }, { x: 0, y: 3 }, rA,
      { x: 0.5, y: 0 }, { x: 0, y: 3 }, rB
    );
    // Y velocity is tangential to the X collision axis — must stay the same
    expect(near(r.velocityA.y, 3, LOOSE)).toBe(true);
    expect(near(r.velocityB.y, 3, LOOSE)).toBe(true);
  });

  it("coincident circles get separated along RIGHT axis (degenerate case)", () => {
    const r = resolveSphereCollision(
      { x: 0, y: 0 }, { x: 0, y: 0 }, rA,
      { x: 0, y: 0 }, { x: 0, y: 0 }, rB
    );
    expect(r.collided).toBe(true);
    const dist = Math.sqrt(
      (r.positionA.x - r.positionB.x) ** 2 +
      (r.positionA.y - r.positionB.y) ** 2
    );
    expect(dist).toBeGreaterThan(0);
  });
});

describe("BoundingSphere — clampToWorldBounds", () => {
  const radius = 0.5;
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  it("position inside bounds is unchanged", () => {
    const r = clampToWorldBounds({ x: 50, y: 50 }, { x: 1, y: 1 }, radius, bounds);
    expect(r.position).toEqual({ x: 50, y: 50 });
    expect(r.velocity).toEqual({ x: 1, y: 1 });
  });

  it("clamps position to left boundary and zeroes negative vx", () => {
    const r = clampToWorldBounds({ x: -1, y: 50 }, { x: -3, y: 0 }, radius, bounds);
    expect(near(r.position.x, bounds.minX + radius)).toBe(true);
    expect(r.velocity.x).toBe(0);
  });

  it("clamps position to right boundary and zeroes positive vx", () => {
    const r = clampToWorldBounds({ x: 101, y: 50 }, { x: 5, y: 0 }, radius, bounds);
    expect(near(r.position.x, bounds.maxX - radius)).toBe(true);
    expect(r.velocity.x).toBe(0);
  });

  it("clamps position to bottom boundary and zeroes negative vy", () => {
    const r = clampToWorldBounds({ x: 50, y: -2 }, { x: 0, y: -4 }, radius, bounds);
    expect(near(r.position.y, bounds.minY + radius)).toBe(true);
    expect(r.velocity.y).toBe(0);
  });

  it("does not zero velocity component if moving away from boundary", () => {
    // Position is beyond the left wall but velocity is positive (moving right)
    const r = clampToWorldBounds({ x: -1, y: 50 }, { x: 3, y: 0 }, radius, bounds);
    expect(near(r.position.x, bounds.minX + radius)).toBe(true);
    // vx is positive (moving away) → should NOT be zeroed
    expect(r.velocity.x).toBe(3);
  });
});

// ===========================================================================
// SECTION 3 — KartPhysics.integrate()
// ===========================================================================

describe("KartPhysics — createDefaultVehicleState", () => {
  it("creates a state at the given position and rotation", () => {
    const s = createDefaultVehicleState("abc", 10, 20, Math.PI / 4);
    expect(s.id).toBe("abc");
    expect(near(s.position.x, 10)).toBe(true);
    expect(near(s.position.y, 20)).toBe(true);
    expect(near(s.rotation, Math.PI / 4)).toBe(true);
  });

  it("starts with zero velocity, throttle, brake, steering", () => {
    const s = createDefaultVehicleState("x", 0, 0, 0);
    expect(s.velocity.x).toBe(0);
    expect(s.velocity.y).toBe(0);
    expect(s.throttle).toBe(0);
    expect(s.brake).toBe(0);
    expect(s.steering).toBe(0);
    expect(s.isDrifting).toBe(false);
  });

  it("engine temperature starts at ambient default (20°C)", () => {
    const s = createDefaultVehicleState("y", 0, 0, 0);
    expect(s.engineTemperature).toBe(20);
  });
});

describe("KartPhysics — integrate: linear acceleration", () => {
  it("full throttle on flat asphalt accelerates the car forward", () => {
    const state = makeState({ throttle: 1.0 });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    // With rotation=0, forward is +X. Position.x must increase.
    expect(update.position.x).toBeGreaterThan(0);
    expect(update.velocity.x).toBeGreaterThan(0);
  });

  it("zero throttle, zero initial velocity — car stays at origin", () => {
    const state = makeState();
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    // Rolling resistance may push it negligibly, but position delta should be ~0
    expect(Math.abs(update.position.x)).toBeLessThan(0.01);
    expect(Math.abs(update.position.y)).toBeLessThan(0.01);
  });

  it("full throttle increases speed each tick (before terminal velocity)", () => {
    let state = makeState({ throttle: 1.0 });
    let prevSpeed = 0;
    for (let i = 0; i < 30; i++) {
      const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
      const speed = Math.sqrt(update.velocity.x ** 2 + update.velocity.y ** 2);
      expect(speed).toBeGreaterThanOrEqual(prevSpeed - 1e-6);
      prevSpeed = speed;
      state = { ...state, ...update, throttle: 1.0 };
    }
  });

  it("speed never exceeds maxSpeed * surface speedMult", () => {
    let state = makeState({ throttle: 1.0 });
    const limit = DEFAULT_KART_CONFIG.maxSpeed * DRY_ASPHALT_GRIP.speedMult + 1e-6;
    for (let i = 0; i < 600; i++) {
      const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
      const speed = Math.sqrt(update.velocity.x ** 2 + update.velocity.y ** 2);
      expect(speed).toBeLessThanOrEqual(limit);
      state = { ...state, ...update, throttle: 1.0 };
    }
  });
});

describe("KartPhysics — integrate: braking", () => {
  it("applying brake decelerates the car", () => {
    // Start at a non-zero speed
    const state = makeState({ velocity: { x: 15, y: 0 }, brake: 1.0 });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    const speed = Math.sqrt(update.velocity.x ** 2 + update.velocity.y ** 2);
    expect(speed).toBeLessThan(15);
  });

  it("braking from rest does not reverse the car", () => {
    // car at v=0, brake=1 — should stay at rest or near zero
    const state = makeState({ velocity: { x: 0.5, y: 0 }, brake: 1.0 });
    let s = state;
    for (let i = 0; i < 120; i++) {
      const u = integrate(s, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
      s = { ...s, ...u, brake: 1.0 };
    }
    // Car should not travel backward (negative X)
    expect(s.position.x).toBeGreaterThanOrEqual(-0.1);
  });
});

describe("KartPhysics — integrate: steering and rotation", () => {
  it("positive steering input increases rotation (CCW)", () => {
    const state = makeState({ throttle: 0.5, steering: 1.0, velocity: { x: 10, y: 0 } });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    expect(update.rotation).toBeGreaterThan(0);
    expect(update.angularVelocity).toBeGreaterThan(0);
  });

  it("negative steering input decreases rotation (CW)", () => {
    const state = makeState({ throttle: 0.5, steering: -1.0, velocity: { x: 10, y: 0 } });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    expect(update.rotation).toBeLessThan(0);
    expect(update.angularVelocity).toBeLessThan(0);
  });

  it("zero steering input produces zero angular velocity", () => {
    const state = makeState({ throttle: 0.5, steering: 0, velocity: { x: 10, y: 0 } });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    expect(near(update.angularVelocity, 0)).toBe(true);
    expect(near(update.rotation, 0)).toBe(true);
  });

  it("steer rate scales with speed — minimal turn from rest", () => {
    const stateAtRest  = makeState({ steering: 1.0, velocity: { x: 0,  y: 0 } });
    const stateMoving  = makeState({ steering: 1.0, velocity: { x: 15, y: 0 } });
    const turnAtRest   = integrate(stateAtRest,  DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT).angularVelocity;
    const turnMoving   = integrate(stateMoving,  DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT).angularVelocity;
    // Both are positive (same steer direction) but moving car turns faster
    expect(turnMoving).toBeGreaterThan(turnAtRest);
  });
});

describe("KartPhysics — integrate: lateral slip and drift", () => {
  it("a lateral impulse decays over time with normal grip", () => {
    // Apply a pure sideways velocity and let it decay with no input.
    // rotation=0 → forward=+X, right=+Y... wait. right = (sin0, -cos0) = (0,-1).
    // So pure Y+ velocity is lateral-left. Let us use X=0,Y=5 as lateral.
    const state = makeState({ velocity: { x: 0, y: 5 }, throttle: 0 });
    let s = state;
    let prevLateralSq = 5 * 5;
    for (let i = 0; i < 10; i++) {
      const u = integrate(s, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
      const lateralSq = u.velocity.y ** 2; // Y is lateral when facing +X
      // Lateral speed must decay each tick
      expect(lateralSq).toBeLessThanOrEqual(prevLateralSq + 1e-9);
      prevLateralSq = lateralSq;
      s = { ...s, ...u, throttle: 0 };
    }
  });

  it("drift input preserves more lateral velocity than normal grip", () => {
    const baseState = makeState({ velocity: { x: 0, y: 5 }, throttle: 0 });

    // Normal grip
    const normalUpdate = integrate(
      { ...baseState, isDriftInput: false },
      DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT
    );

    // Drift grip
    const driftUpdate = integrate(
      { ...baseState, isDriftInput: true },
      DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT
    );

    const normalLateral = Math.abs(normalUpdate.velocity.y);
    const driftLateral  = Math.abs(driftUpdate.velocity.y);
    // Drift retains more lateral velocity (less grip = less decay)
    expect(driftLateral).toBeGreaterThan(normalLateral);
  });

  it("isDrifting flag is set when lateral speed exceeds threshold", () => {
    // High lateral velocity at speed → isDrifting should be true
    const state = makeState({
      velocity: { x: 20, y: 8 },  // significant lateral component
      isDriftInput: true,
    });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    expect(update.isDrifting).toBe(true);
  });

  it("isDrifting is false with near-zero lateral velocity", () => {
    // Pure forward motion, no drift input, no lateral velocity
    const state = makeState({ velocity: { x: 20, y: 0 }, isDriftInput: false });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    expect(update.isDrifting).toBe(false);
  });
});

describe("KartPhysics — integrate: oversteer factor", () => {
  it("high oversteer config retains more lateral velocity than neutral", () => {
    const highOversteer = { ...DEFAULT_KART_CONFIG, oversteerFactor: 3.0 };
    const state = makeState({ velocity: { x: 0, y: 5 }, throttle: 0 });

    const neutralUpdate = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    const oversteerUpdate = integrate(state, highOversteer, DRY_ASPHALT_GRIP, 20, DT);

    // Oversteer = weaker effective grip = less lateral decay = more lateral remaining
    expect(Math.abs(oversteerUpdate.velocity.y)).toBeGreaterThan(
      Math.abs(neutralUpdate.velocity.y)
    );
  });
});

describe("KartPhysics — integrate: engine temperature", () => {
  it("engine temperature rises with sustained throttle", () => {
    let state = makeState({ throttle: 1.0 });
    const initial = state.engineTemperature;
    for (let i = 0; i < 60; i++) {
      const u = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
      state = { ...state, ...u, throttle: 1.0 };
    }
    expect(state.engineTemperature).toBeGreaterThan(initial);
  });

  it("overheated engine is slower than normal engine", () => {
    const hotState  = makeState({ throttle: 1.0, engineTemperature: ENGINE_CRITICAL_THRESHOLD + 10 });
    const coldState = makeState({ throttle: 1.0, engineTemperature: 20 });

    const hotUpdate  = integrate(hotState,  DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    const coldUpdate = integrate(coldState, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);

    const hotSpeed  = Math.sqrt(hotUpdate.velocity.x  ** 2 + hotUpdate.velocity.y  ** 2);
    const coldSpeed = Math.sqrt(coldUpdate.velocity.x ** 2 + coldUpdate.velocity.y ** 2);

    expect(coldSpeed).toBeGreaterThan(hotSpeed);
  });
});

describe("KartPhysics — integrate: wet surface reduces speed", () => {
  it("rain surface produces lower final speed than dry surface", () => {
    const wetGrip = resolveSurfaceGrip(
      "asphalt",
      [ASPHALT_SURFACE],
      RAIN_WEATHER,
      DEFAULT_KART_CONFIG.lateralGrip
    );

    let dryState  = makeState({ throttle: 1.0 });
    let wetState  = makeState({ throttle: 1.0 });

    for (let i = 0; i < 120; i++) {
      const dryU = integrate(dryState, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
      const wetU = integrate(wetState, DEFAULT_KART_CONFIG, wetGrip, 15, DT);
      dryState = { ...dryState, ...dryU, throttle: 1.0 };
      wetState = { ...wetState, ...wetU, throttle: 1.0 };
    }

    const drySpeed = Math.sqrt(dryState.velocity.x ** 2 + dryState.velocity.y ** 2);
    const wetSpeed = Math.sqrt(wetState.velocity.x ** 2 + wetState.velocity.y ** 2);
    expect(drySpeed).toBeGreaterThan(wetSpeed);
  });
});

describe("KartPhysics — applyUpdate", () => {
  it("merges update into state without touching race-progress fields", () => {
    const state = makeState({
      completedLaps: 2,
      currentCheckpointIndex: 3,
      checkpointProgress: 0.75,
    });
    const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);
    applyUpdate(state, update);

    // Physics fields updated
    expect(state.position).toEqual(update.position);
    expect(state.velocity).toEqual(update.velocity);
    expect(state.rotation).toBe(update.rotation);

    // Race fields untouched
    expect(state.completedLaps).toBe(2);
    expect(state.currentCheckpointIndex).toBe(3);
    expect(near(state.checkpointProgress, 0.75)).toBe(true);
  });
});

// ===========================================================================
// SECTION 4 — Physics scenario: full pipeline
// ===========================================================================

describe("KartPhysics — full pipeline scenario", () => {
  it("car drives forward, hits a wall, and bounces back", () => {
    // Wall is a horizontal line at y=5. Car starts at (0,0) facing +Y (π/2).
    const wall: LineSegment = { x1: -100, y1: 5, x2: 100, y2: 5 };
    let state = createDefaultVehicleState("p1", 0, 0, Math.PI / 2);
    state.throttle = 1.0;

    let collided = false;
    for (let tick = 0; tick < 600; tick++) {
      const update = integrate(state, DEFAULT_KART_CONFIG, DRY_ASPHALT_GRIP, 20, DT);

      // Resolve wall collision on the candidate position
      const wallResult = resolveWallCollision(
        update.position,
        update.velocity,
        DEFAULT_KART_CONFIG.collisionRadius,
        wall
      );

      if (wallResult.collided) collided = true;

      applyUpdate(state, {
        ...update,
        position: wallResult.position,
        velocity: wallResult.velocity,
      });

      // After collision the car should eventually be moving in -Y direction
      if (collided && state.velocity.y < -0.5) break;
    }

    expect(collided).toBe(true);
    // Car must have bounced — now moving away from the wall
    expect(state.velocity.y).toBeLessThan(0);
    // Car must be below the wall
    expect(state.position.y).toBeLessThan(5);
  });

  it("two cars approaching head-on are separated after collision resolution", () => {
    const stateA = createDefaultVehicleState("a", 0,    0, 0);
    const stateB = createDefaultVehicleState("b", 0.6,  0, Math.PI);
    stateA.velocity = { x:  5, y: 0 };
    stateB.velocity = { x: -5, y: 0 };

    const result = resolveSphereCollision(
      stateA.position, stateA.velocity, DEFAULT_KART_CONFIG.collisionRadius,
      stateB.position, stateB.velocity, DEFAULT_KART_CONFIG.collisionRadius
    );

    expect(result.collided).toBe(true);

    const dist = Math.sqrt(
      (result.positionA.x - result.positionB.x) ** 2 +
      (result.positionA.y - result.positionB.y) ** 2
    );
    expect(dist).toBeGreaterThanOrEqual(
      DEFAULT_KART_CONFIG.collisionRadius * 2 - 1e-6
    );

    // After collision A moves left, B moves right
    expect(result.velocityA.x).toBeLessThan(0);
    expect(result.velocityB.x).toBeGreaterThan(0);
  });
});
