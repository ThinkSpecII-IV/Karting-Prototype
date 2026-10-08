import { afterEach, describe, expect, it } from "vitest";
import { ServerLoop } from "../../src/server/ServerLoop.js";
import { createDefaultVehicleState } from "../../src/physics/KartPhysics.js";
import type { RaceState, Snapshot } from "../../src/shared/types.js";

describe("ServerLoop track collision", () => {
  let loop: ServerLoop | undefined;

  afterEach(() => {
    loop?.stop();
    loop = undefined;
  });

  it("resolves a vehicle back from a track boundary before broadcasting", async () => {
    const vehicle = createDefaultVehicleState("driver", 0.51, 0, 0);
    vehicle.velocity = { x: -1, y: 0 };
    const state: RaceState = {
      tick: 0,
      timestamp: Date.now(),
      phase: "RACING",
      vehicles: [vehicle],
      standings: [],
      weather: {
        type: "clear",
        intensity: 0,
        temperature: 20,
        windDirection: 0,
        windStrength: 0,
        wetness: 0,
      },
      countdown: 0,
    };
    const wall = { x1: 0, y1: -10, x2: 0, y2: 10 };
    const snapshotPromise = new Promise<Snapshot>((resolve) => {
      loop = new ServerLoop((_roomId, snapshot) => resolve(snapshot));
    });

    loop!.addRace("room", state, [wall]);
    loop!.start();

    const snapshot = await snapshotPromise;
    const result = snapshot.vehicles[0]!;
    expect(result.position.x).toBeGreaterThanOrEqual(0.5);
    expect(result.velocity.x).toBeGreaterThan(0);
  }, 1000);
});
