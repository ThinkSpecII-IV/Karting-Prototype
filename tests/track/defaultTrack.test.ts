import { describe, expect, it } from "vitest";
import { resolveWallCollisions } from "../../src/physics/BoundingSphere.js";
import { DEFAULT_TRACK } from "../../src/track/defaultTrack.js";

describe("DEFAULT_TRACK", () => {
  it("defines a closed road with inner and outer collision boundaries", () => {
    expect(DEFAULT_TRACK.centerline.length).toBeGreaterThan(32);
    expect(DEFAULT_TRACK.outerBoundary).toHaveLength(DEFAULT_TRACK.centerline.length);
    expect(DEFAULT_TRACK.innerBoundary).toHaveLength(DEFAULT_TRACK.centerline.length);
    expect(DEFAULT_TRACK.boundaries).toHaveLength(DEFAULT_TRACK.centerline.length * 2);
  });

  it("places every grid spawn inside the drivable road", () => {
    expect(DEFAULT_TRACK.spawnPoints).toHaveLength(8);
    for (const spawn of DEFAULT_TRACK.spawnPoints) {
      const result = resolveWallCollisions(
        spawn.position,
        { x: 0, y: 0 },
        0.5,
        DEFAULT_TRACK.boundaries
      );
      expect(result.collisionCount).toBe(0);
    }
  });
});
