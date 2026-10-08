import { Snapshot, SnapshotVehicle, Vec2 } from "../../shared/types.js";
import { lerp, lerpAngle } from "../../math/MathUtils.js";

/**
 * Renders at a configurable delay behind the latest server snapshot to ensure
 * there is always a "next" snapshot to interpolate towards.
 */
export const INTERPOLATION_DELAY_MS = 100;

export interface InterpolatedVehicle {
  id: string;
  position: Vec2;
  rotation: number;
  // Other fields can just be taken from the most recent snapshot
  velocity: Vec2;
  isDrifting: boolean;
  engineTemperature: number;
  completedLaps: number;
}

export class InterpolationBuffer {
  private snapshots: Snapshot[] = [];
  
  public addSnapshot(snapshot: Snapshot) {
    this.snapshots.push(snapshot);
    // Keep buffer bounded, e.g., only keep last 30 snapshots (1.5s at 20Hz)
    if (this.snapshots.length > 30) {
      this.snapshots.shift();
    }
  }

  public getInterpolatedState(clientTimeMs: number): Snapshot | null {
    if (this.snapshots.length === 0) {
      return null;
    }

    const renderTime = clientTimeMs - INTERPOLATION_DELAY_MS;

    // Find the two snapshots framing the render time
    let s0: Snapshot | null = null;
    let s1: Snapshot | null = null;

    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      const snap = this.snapshots[i]!;
      if (snap.timestamp <= renderTime) {
        s0 = snap;
        s1 = this.snapshots[i + 1] ?? snap; // if it's the newest, clamp to it
        break;
      }
    }

    if (!s0) {
      // Render time is older than our oldest snapshot
      s0 = this.snapshots[0]!;
      s1 = s0;
    }

    if (!s1 || s0 === s1) {
      return s0;
    }

    const t0 = s0.timestamp;
    const t1 = s1.timestamp;
    const dt = t1 - t0;
    
    // Clamp t to [0, 1] just in case
    let t = dt > 0 ? (renderTime - t0) / dt : 0;
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    // Interpolate vehicles
    const interpolatedVehicles: SnapshotVehicle[] = [];
    
    // Create maps for O(1) lookup
    const v0Map = new Map<string, SnapshotVehicle>();
    for (const v of s0.vehicles) v0Map.set(v.id, v);

    for (const v1 of s1.vehicles) {
      const v0 = v0Map.get(v1.id);
      if (!v0) {
        // Vehicle just appeared, no s0 to interpolate from
        interpolatedVehicles.push({ ...v1 });
        continue;
      }

      interpolatedVehicles.push({
        ...v0, // Base other properties on s0
        carModel: v1.carModel,
        position: {
          x: lerp(v0.position.x, v1.position.x, t),
          y: lerp(v0.position.y, v1.position.y, t)
        },
        rotation: lerpAngle(v0.rotation, v1.rotation, t),
        velocity: {
          x: lerp(v0.velocity.x, v1.velocity.x, t),
          y: lerp(v0.velocity.y, v1.velocity.y, t)
        }
      });
    }

    return {
      tick: s0.tick,
      timestamp: renderTime,
      phase: s0.phase,
      vehicles: interpolatedVehicles,
      standings: s0.standings,
      weather: s0.weather,
      countdown: s0.countdown,
    };
  }
}
