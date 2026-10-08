import {
  PHYSICS_DT,
  PHYSICS_TICK_HZ,
  TICKS_PER_SNAPSHOT,
  MAX_PHYSICS_STEPS,
} from "../shared/constants.js";
import { performance } from "node:perf_hooks";
import {
  integrate,
  applyUpdate,
  DEFAULT_KART_CONFIG,
} from "../physics/KartPhysics.js";
import { resolveSphereCollision, resolveWallCollisions } from "../physics/BoundingSphere.js";
import { isF1TeamCarModel } from "../shared/types.js";
import type {
  LineSegment,
  RaceState,
  PlayerInput,
  Snapshot,
  SnapshotVehicle,
} from "../shared/types.js";
import { resolveSurfaceGrip } from "../physics/SurfaceResponse.js";
import { DEFAULT_TRACK } from "../track/defaultTrack.js";

export class ServerLoop {
  private activeRaces = new Map<string, RaceState>();
  private inputBuffers = new Map<string, Map<string, PlayerInput>>();
  private raceBoundaries = new Map<string, readonly LineSegment[]>();
  private previousTimeMs = Date.now();
  private accumulator = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private broadcastCallback: (roomId: string, snapshot: Snapshot) => void;
  private readonly metricsEnabled = process.env.SERVER_METRICS === "1";
  private metricsWindowStart = performance.now();
  private metricsCpuBaseline = process.cpuUsage();
  private maxTickDurationMs = 0;
  private snapshotBroadcastCount = 0;

  constructor(broadcastCallback: (roomId: string, snapshot: Snapshot) => void) {
    this.broadcastCallback = broadcastCallback;
  }

  start() {
    this.previousTimeMs = Date.now();
    this.intervalId = setInterval(() => this.tick(), 1000 / PHYSICS_TICK_HZ);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addRace(
    roomId: string,
    state: RaceState,
    boundaries: readonly LineSegment[] = DEFAULT_TRACK.boundaries
  ) {
    this.activeRaces.set(roomId, state);
    this.inputBuffers.set(roomId, new Map());
    this.raceBoundaries.set(roomId, boundaries);
  }

  removeRace(roomId: string) {
    this.activeRaces.delete(roomId);
    this.inputBuffers.delete(roomId);
    this.raceBoundaries.delete(roomId);
  }

  queueInput(roomId: string, playerId: string, input: PlayerInput) {
    const roomInputs = this.inputBuffers.get(roomId);
    if (roomInputs) {
      roomInputs.set(playerId, input);
    }
  }

  private tick() {
    const tickStartedAt = this.metricsEnabled ? performance.now() : 0;
    const now = Date.now();
    let frameTime = (now - this.previousTimeMs) / 1000.0;
    this.previousTimeMs = now;

    // Spiral of death protection
    if (frameTime > MAX_PHYSICS_STEPS * PHYSICS_DT) {
      frameTime = MAX_PHYSICS_STEPS * PHYSICS_DT;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= PHYSICS_DT) {
      this.stepPhysics(PHYSICS_DT);
      this.accumulator -= PHYSICS_DT;
    }

    if (this.metricsEnabled) {
      const tickDurationMs = performance.now() - tickStartedAt;
      this.maxTickDurationMs = Math.max(this.maxTickDurationMs, tickDurationMs);
      this.emitMetricsIfDue(performance.now());
    }
  }

  private stepPhysics(dt: number) {
    for (const [roomId, raceState] of this.activeRaces.entries()) {
      if (raceState.phase !== "RACING") continue;

      const roomInputs = this.inputBuffers.get(roomId) ?? new Map<string, PlayerInput>();
      const weather = raceState.weather;
      
      // Update tick
      (raceState as any).tick += 1;
      (raceState as any).timestamp = Date.now();

      // 1. Apply inputs & integrate
      for (let i = 0; i < raceState.vehicles.length; i++) {
        const vehicle = raceState.vehicles[i]!;
        const input = roomInputs.get(vehicle.id);
        
        if (input) {
          vehicle.throttle = input.throttle;
          vehicle.brake = input.brake;
          vehicle.steering = input.steering;
          vehicle.isDriftInput = input.drift;
          if (isF1TeamCarModel(input.carModel)) {
            vehicle.carModel = input.carModel;
          }
        }

        const surfaceGrip = resolveSurfaceGrip(
          vehicle.currentSurface,
          [], // Fallback to asphalt for now
          weather,
          DEFAULT_KART_CONFIG.lateralGrip
        );

        const update = integrate(
          vehicle,
          DEFAULT_KART_CONFIG,
          surfaceGrip,
          weather.temperature,
          dt
        );

        applyUpdate(vehicle, update);

        const wallResult = resolveWallCollisions(
          vehicle.position,
          vehicle.velocity,
          DEFAULT_KART_CONFIG.collisionRadius,
          this.raceBoundaries.get(roomId) ?? []
        );
        vehicle.position = wallResult.position;
        vehicle.velocity = wallResult.velocity;
      }

      // 2. Resolve Collisions (Car vs Car)
      for (let i = 0; i < raceState.vehicles.length; i++) {
        for (let j = i + 1; j < raceState.vehicles.length; j++) {
          const vA = raceState.vehicles[i]!;
          const vB = raceState.vehicles[j]!;
          
          const result = resolveSphereCollision(
            vA.position, vA.velocity, DEFAULT_KART_CONFIG.collisionRadius,
            vB.position, vB.velocity, DEFAULT_KART_CONFIG.collisionRadius
          );

          if (result.collided) {
            vA.position = result.positionA;
            vB.position = result.positionB;
            vA.velocity = result.velocityA;
            vB.velocity = result.velocityB;
          }
        }
      }

      // Snapshot broadcast
      if (raceState.tick % TICKS_PER_SNAPSHOT === 0) {
        this.broadcastSnapshot(roomId, raceState);
      }
    }
  }

  private broadcastSnapshot(roomId: string, raceState: RaceState) {
    const snapshotVehicles: SnapshotVehicle[] = raceState.vehicles.map((v) => ({
      id: v.id,
      carModel: v.carModel,
      position: { ...v.position },
      rotation: v.rotation,
      velocity: { ...v.velocity },
      isDrifting: v.isDrifting,
      inDraft: v.inDraft,
      completedLaps: v.completedLaps,
      currentCheckpointIndex: v.currentCheckpointIndex,
      checkpointProgress: v.checkpointProgress,
      engineTemperature: v.engineTemperature,
      currentSurface: v.currentSurface,
      finished: v.finished,
    }));

    const snapshot: Snapshot = {
      tick: raceState.tick,
      timestamp: raceState.timestamp,
      phase: raceState.phase,
      vehicles: snapshotVehicles,
      standings: [...raceState.standings],
      weather: { ...raceState.weather },
      countdown: raceState.countdown,
    };

    this.broadcastCallback(roomId, snapshot);
    if (this.metricsEnabled) {
      this.snapshotBroadcastCount += 1;
    }
  }

  private emitMetricsIfDue(now: number) {
    const elapsedMs = now - this.metricsWindowStart;
    if (elapsedMs < 1_000) return;

    const cpuUsage = process.cpuUsage(this.metricsCpuBaseline);
    const memoryUsage = process.memoryUsage();
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1_000 / elapsedMs) * 100;

    process.stdout.write(
      `SERVER_METRIC ${JSON.stringify({
        maxTickDurationMs: this.maxTickDurationMs,
        snapshotBroadcastsPerSecond: (this.snapshotBroadcastCount * 1_000) / elapsedMs,
        cpuPercent,
        rssBytes: memoryUsage.rss,
        heapUsedBytes: memoryUsage.heapUsed,
      })}\n`
    );

    this.metricsWindowStart = now;
    this.metricsCpuBaseline = process.cpuUsage();
    this.maxTickDurationMs = 0;
    this.snapshotBroadcastCount = 0;
  }
}
