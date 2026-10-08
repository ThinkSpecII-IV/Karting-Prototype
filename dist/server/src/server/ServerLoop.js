"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerLoop = void 0;
const constants_js_1 = require("../shared/constants.js");
const KartPhysics_js_1 = require("../physics/KartPhysics.js");
const BoundingSphere_js_1 = require("../physics/BoundingSphere.js");
const types_js_1 = require("../shared/types.js");
const SurfaceResponse_js_1 = require("../physics/SurfaceResponse.js");
class ServerLoop {
    activeRaces = new Map();
    inputBuffers = new Map();
    previousTimeMs = Date.now();
    accumulator = 0;
    intervalId = null;
    broadcastCallback;
    constructor(broadcastCallback) {
        this.broadcastCallback = broadcastCallback;
    }
    start() {
        this.previousTimeMs = Date.now();
        this.intervalId = setInterval(() => this.tick(), 1000 / constants_js_1.PHYSICS_TICK_HZ);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    addRace(roomId, state) {
        this.activeRaces.set(roomId, state);
        this.inputBuffers.set(roomId, new Map());
    }
    removeRace(roomId) {
        this.activeRaces.delete(roomId);
        this.inputBuffers.delete(roomId);
    }
    queueInput(roomId, playerId, input) {
        const roomInputs = this.inputBuffers.get(roomId);
        if (roomInputs) {
            roomInputs.set(playerId, input);
        }
    }
    tick() {
        const now = Date.now();
        let frameTime = (now - this.previousTimeMs) / 1000.0;
        this.previousTimeMs = now;
        // Spiral of death protection
        if (frameTime > constants_js_1.MAX_PHYSICS_STEPS * constants_js_1.PHYSICS_DT) {
            frameTime = constants_js_1.MAX_PHYSICS_STEPS * constants_js_1.PHYSICS_DT;
        }
        this.accumulator += frameTime;
        while (this.accumulator >= constants_js_1.PHYSICS_DT) {
            this.stepPhysics(constants_js_1.PHYSICS_DT);
            this.accumulator -= constants_js_1.PHYSICS_DT;
        }
    }
    stepPhysics(dt) {
        for (const [roomId, raceState] of this.activeRaces.entries()) {
            if (raceState.phase !== "RACING")
                continue;
            const roomInputs = this.inputBuffers.get(roomId) ?? new Map();
            const weather = raceState.weather;
            // Update tick
            raceState.tick += 1;
            raceState.timestamp = Date.now();
            // 1. Apply inputs & integrate
            for (let i = 0; i < raceState.vehicles.length; i++) {
                const vehicle = raceState.vehicles[i];
                const input = roomInputs.get(vehicle.id);
                if (input) {
                    vehicle.throttle = input.throttle;
                    vehicle.brake = input.brake;
                    vehicle.steering = input.steering;
                    vehicle.isDriftInput = input.drift;
                    if ((0, types_js_1.isF1TeamCarModel)(input.carModel)) {
                        vehicle.carModel = input.carModel;
                    }
                }
                const surfaceGrip = (0, SurfaceResponse_js_1.resolveSurfaceGrip)(vehicle.currentSurface, [], // Fallback to asphalt for now
                weather, KartPhysics_js_1.DEFAULT_KART_CONFIG.lateralGrip);
                const update = (0, KartPhysics_js_1.integrate)(vehicle, KartPhysics_js_1.DEFAULT_KART_CONFIG, surfaceGrip, weather.temperature, dt);
                (0, KartPhysics_js_1.applyUpdate)(vehicle, update);
            }
            // 2. Resolve Collisions (Car vs Car)
            for (let i = 0; i < raceState.vehicles.length; i++) {
                for (let j = i + 1; j < raceState.vehicles.length; j++) {
                    const vA = raceState.vehicles[i];
                    const vB = raceState.vehicles[j];
                    const result = (0, BoundingSphere_js_1.resolveSphereCollision)(vA.position, vA.velocity, KartPhysics_js_1.DEFAULT_KART_CONFIG.collisionRadius, vB.position, vB.velocity, KartPhysics_js_1.DEFAULT_KART_CONFIG.collisionRadius);
                    if (result.collided) {
                        vA.position = result.positionA;
                        vB.position = result.positionB;
                        vA.velocity = result.velocityA;
                        vB.velocity = result.velocityB;
                    }
                }
            }
            // Snapshot broadcast
            if (raceState.tick % constants_js_1.TICKS_PER_SNAPSHOT === 0) {
                this.broadcastSnapshot(roomId, raceState);
            }
        }
    }
    broadcastSnapshot(roomId, raceState) {
        const snapshotVehicles = raceState.vehicles.map((v) => ({
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
        const snapshot = {
            tick: raceState.tick,
            timestamp: raceState.timestamp,
            phase: raceState.phase,
            vehicles: snapshotVehicles,
            standings: [...raceState.standings],
            weather: { ...raceState.weather },
            countdown: raceState.countdown,
        };
        this.broadcastCallback(roomId, snapshot);
    }
}
exports.ServerLoop = ServerLoop;
//# sourceMappingURL=ServerLoop.js.map