/**
 * src/shared/types.ts
 *
 * CANONICAL data contracts for the multiplayer kart racing game.
 *
 * INVARIANT (INV-07): This is the ONLY place these types are defined.
 * Both server (src/server/, src/physics/, etc.) and client (src/client/)
 * import from here. Never redeclare or copy these types elsewhere.
 *
 * All types are plain JSON-serialisable objects (no class instances, no
 * methods, no Symbol fields) so they can be sent over Socket.IO without
 * transformation.
 */

// ---------------------------------------------------------------------------
// Primitive geometry helpers (used inside the types below)
// ---------------------------------------------------------------------------

/** A 2-D point or vector in world space (metres). X = right, Y = up/forward. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** A line segment used for walls and checkpoint lines. */
export interface LineSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------

/**
 * Immutable characteristics of a kart model.
 * Loaded once at race start; never mutated during a race.
 */
export interface VehicleConfig {
  /** Unique identifier for this car model (e.g. "kart_red"). */
  readonly id: string;

  /** Mass in kilograms. */
  readonly mass: number;

  /**
   * Maximum forward speed in m/s.
   * Also used to cap velocity so the car cannot tunnel through thin walls
   * (MAX_SPEED_MS must satisfy: maxSpeed <= VEHICLE_RADIUS / PHYSICS_DT).
   */
  readonly maxSpeed: number;

  /** Peak engine force in Newtons applied at full throttle. */
  readonly enginePower: number;

  /** Maximum braking force in Newtons. */
  readonly brakeForce: number;

  /**
   * Maximum angular velocity in radians/second at full steering input.
   * Actual turn rate is scaled by (speed / maxSpeed) in VehiclePhysics.
   */
  readonly steeringRate: number;

  /**
   * Base lateral grip coefficient [0..1].
   * 1.0 = perfect grip (no sideways slide in one tick).
   * 0.0 = frictionless ice (lateral velocity never decays).
   * Applied as: v_lateral *= (1 - lateralGrip).
   */
  readonly lateralGrip: number;

  /**
   * Lateral grip coefficient used when drift input is active.
   * Typically lower than lateralGrip to allow controlled sliding.
   */
  readonly driftGrip: number;

  /**
   * Aerodynamic drag coefficient.
   * F_drag = -dragCoef * v²   (opposes velocity direction)
   */
  readonly dragCoef: number;

  /**
   * Rolling resistance force in Newtons (constant, opposes velocity).
   * Applied whenever the car is moving, regardless of throttle.
   */
  readonly rollingResistance: number;

  /**
   * Rear-grip reduction multiplier.
   * 1.0 = neutral handling.
   * >1.0 = more oversteer (rear slides out in corners).
   * <1.0 = more understeer (front slides wide).
   */
  readonly oversteerFactor: number;

  /**
   * Downforce coefficient. Increases effective grip at high speed.
   * effectiveLateralGrip = lateralGrip + downforceCoef * (speed / maxSpeed)
   */
  readonly downforceCoef: number;

  /** Radius of the car's collision circle in metres. */
  readonly collisionRadius: number;

  /**
   * Heat generated per second at full throttle (°C/s).
   * Used by the engine temperature model.
   */
  readonly engineHeatRate: number;

  /**
   * Heat dissipation rate coefficient.
   * heatDissipated = (engineTemp - ambientTemp) * coolingRate   per second.
   */
  readonly coolingRate: number;
}

/**
 * Mutable runtime state of a single kart.
 * Updated every physics tick on the server; serialised into Snapshot for clients.
 *
 * IMPORTANT: This type is also used client-side in the interpolated view.
 * All fields must be JSON-serialisable primitives.
 */
export interface VehicleState {
  /** Matches the player's socket/player ID. */
  readonly id: string;

  /** World-space position in metres. */
  position: Vec2;

  /**
   * Facing angle in RADIANS, measured counter-clockwise from the +X axis.
   * 0 = facing right, π/2 = facing up.
   */
  rotation: number;

  /** World-space velocity in m/s. */
  velocity: Vec2;

  /** Angular velocity in radians/second (counter-clockwise positive). */
  angularVelocity: number;

  // --- Player input (last received from client) ---
  /** Throttle input [0..1]. */
  throttle: number;
  /** Brake input [0..1]. */
  brake: number;
  /** Steering input [-1..1]. Negative = left, positive = right. */
  steering: number;
  /** Drift button held. */
  isDriftInput: boolean;

  // --- Physics-derived flags ---
  /** True when |lateral velocity| exceeds the drift threshold. */
  isDrifting: boolean;
  /** True when slipstreaming behind another vehicle. */
  inDraft: boolean;

  // --- Surface ---
  /**
   * ID of the surface zone the car is currently on (e.g. "asphalt", "dirt").
   * Matches a SurfaceDef.id from the current TrackDef.
   */
  currentSurface: string;

  // --- Engine temperature ---
  /** Current engine temperature in °C. */
  engineTemperature: number;

  // --- Race progress (updated by LapCounter / RaceManager) ---
  /** Number of fully completed laps. */
  completedLaps: number;
  /**
   * Index of the next checkpoint the car must cross.
   * Reset to 0 when a lap is completed.
   */
  currentCheckpointIndex: number;
  /**
   * Fractional progress toward the next checkpoint [0..1].
   * Computed as: dist(car, lastCheckpoint) / dist(nextCheckpoint, lastCheckpoint).
   */
  checkpointProgress: number;

  /** True if the car has finished the race (crossed finish after all laps). */
  finished: boolean;
  /** Server timestamp (ms) when the car finished. 0 if not yet finished. */
  finishTime: number;
}

// ---------------------------------------------------------------------------
// Player Input
// ---------------------------------------------------------------------------

/**
 * Input payload sent from client to server on every input event.
 *
 * INVARIANT (INV-03): This struct contains ONLY control values.
 * Adding position, velocity, or rotation here is FORBIDDEN.
 */
export interface PlayerInput {
  /** Steering [-1..1]. Negative = left, positive = right. */
  readonly steering: number;
  /** Throttle [0..1]. */
  readonly throttle: number;
  /** Brake [0..1]. */
  readonly brake: number;
  /** Drift button state. */
  readonly drift: boolean;
  /**
   * Client-side timestamp (ms, from Date.now()) when input was captured.
   * Used for latency measurement only; never used to override server physics.
   */
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

/** All weather condition types the system supports. */
export type WeatherType = "clear" | "rain" | "storm" | "fog" | "heatwave";

/**
 * Complete weather state for a race session.
 * Owned exclusively by the server's WeatherSystem; broadcast in every Snapshot.
 *
 * INVARIANT (INV-09): Clients use this for visual FX only.
 * Grip/physics modifications are computed server-side from this state.
 */
export interface WeatherState {
  readonly type: WeatherType;

  /** Weather intensity [0..1]. 0 = off, 1 = maximum. */
  intensity: number;

  /** Ambient temperature in °C. Affects engine cooling rate. */
  temperature: number;

  /** Wind direction in degrees (0 = north, 90 = east). */
  windDirection: number;

  /** Wind speed in m/s. */
  windStrength: number;

  /**
   * Road wetness factor [0..1].
   * 0 = fully dry, 1 = fully saturated.
   * Decays at WETNESS_DECAY_RATE after rain stops.
   */
  wetness: number;
}

// ---------------------------------------------------------------------------
// Race / Snapshot
// ---------------------------------------------------------------------------

/** Race lifecycle state machine values. */
export type RacePhase = "LOBBY" | "COUNTDOWN" | "RACING" | "FINISHED";

/** Per-player standings entry. */
export interface StandingsEntry {
  readonly playerId: string;
  /** Computed race progress scalar (higher = further ahead). */
  readonly raceProgress: number;
  /** Display rank position (1-based). */
  readonly rank: number;
}

/**
 * Complete race state — the authoritative view from the server.
 * Serialised into a Snapshot for network broadcast.
 */
export interface RaceState {
  /** Monotonically increasing server physics tick counter. */
  readonly tick: number;

  /** Server wall-clock timestamp (ms) when this state was computed. */
  readonly timestamp: number;

  /** Phase of the current race. */
  phase: RacePhase;

  /** All vehicle states, one per connected player + AI. */
  vehicles: VehicleState[];

  /** Sorted standings (index 0 = leader). */
  standings: StandingsEntry[];

  /** Current weather. */
  weather: WeatherState;

  /** Countdown value (3, 2, 1, 0) during COUNTDOWN phase. 0 otherwise. */
  countdown: number;
}

/**
 * Network snapshot broadcast from server to all clients in a room.
 * Sent at networkSnapHz (20 Hz) — a subset of physics ticks (60 Hz).
 */
export interface Snapshot {
  readonly tick: number;
  readonly timestamp: number;
  readonly phase: RacePhase;
  readonly vehicles: readonly SnapshotVehicle[];
  readonly standings: readonly StandingsEntry[];
  readonly weather: WeatherState;
  readonly countdown: number;
}

/**
 * Minimal vehicle data inside a Snapshot.
 * Contains only what the client needs to interpolate and render.
 * Omits input state and internal physics flags to keep payload small.
 */
export interface SnapshotVehicle {
  readonly id: string;
  readonly position: Vec2;
  readonly rotation: number;
  readonly velocity: Vec2;
  readonly isDrifting: boolean;
  readonly inDraft: boolean;
  readonly completedLaps: number;
  readonly currentCheckpointIndex: number;
  readonly checkpointProgress: number;
  readonly engineTemperature: number;
  readonly currentSurface: string;
  readonly finished: boolean;
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

/** A named surface type with its physics coefficients. */
export interface SurfaceDef {
  /** Unique identifier (e.g. "asphalt", "dirt", "ice", "grass", "water"). */
  readonly id: string;
  /** Friction multiplier applied to lateralGrip. 1.0 = asphalt. */
  readonly friction: number;
  /** Max-speed multiplier. 1.0 = no effect. */
  readonly speedMultiplier: number;
  /** Acceleration multiplier. 1.0 = no effect. */
  readonly accelerationMultiplier: number;
}

/** A convex polygon zone on the track with a specific surface type. */
export interface SurfaceZone {
  readonly surfaceId: string;
  /** Polygon vertices in world space (metres), in order. */
  readonly vertices: readonly Vec2[];
}

/**
 * A checkpoint line segment.
 * Cars must cross checkpoints in ascending index order.
 * Index 0 is also the finish line.
 */
export interface CheckpointDef {
  readonly index: number;
  /** Line segment across the track. Car must cross from one side to the other. */
  readonly line: LineSegment;
}

/**
 * Complete track definition — loaded from a JSON file by TrackLoader.
 * Data-driven: adding a new track requires only a new JSON file,
 * no code changes.
 */
export interface TrackDef {
  /** Unique track identifier (matches the filename without extension). */
  readonly id: string;
  readonly name: string;

  /** Total number of laps to complete the race. */
  readonly totalLaps: number;

  /** Ordered list of checkpoint lines. Index 0 = finish line. */
  readonly checkpoints: readonly CheckpointDef[];

  /**
   * Wall boundary line segments.
   * Cars collide against these using circle-vs-line detection.
   */
  readonly boundaries: readonly LineSegment[];

  /** Surface zones. A car on no zone uses the default "asphalt" surface. */
  readonly surfaceZones: readonly SurfaceZone[];

  /** Named surface definitions referenced by surfaceZones. */
  readonly surfaces: readonly SurfaceDef[];

  /** Spawn positions and headings for each player slot (0-indexed). */
  readonly spawnPoints: readonly SpawnPoint[];

  /**
   * Pre-computed total length of the racing line in metres.
   * Used by PositionSystem to compute raceProgress.
   */
  readonly trackLength: number;
}

/** Initial position and facing angle for one player spawn slot. */
export interface SpawnPoint {
  readonly position: Vec2;
  /** Facing angle in radians. */
  readonly rotation: number;
}

// ---------------------------------------------------------------------------
// Room / Lobby
// ---------------------------------------------------------------------------

/** A player registered in a room. */
export interface PlayerInfo {
  readonly id: string;
  readonly name: string;
  /** True when the player has clicked "Ready" in the lobby. */
  isReady: boolean;
  /**
   * "player" = active racer.
   * "display" = spectator screen (receives snapshots, sends no input).
   */
  readonly role: "player" | "display";
}

/** Settings chosen by the host before race start. */
export interface RoomSettings {
  readonly trackId: string;
  readonly totalLaps: number;
  /** If present, room is password-protected. */
  readonly password?: string | undefined;
  readonly maxPlayers: number;
}

/**
 * Complete room descriptor.
 * Stored in RoomManager; serialised for lobby broadcasts.
 */
export interface RoomInfo {
  readonly roomId: string;
  /** 6-digit numeric PIN string, e.g. "739214". */
  readonly joinCode: string;
  readonly hostId: string;
  players: PlayerInfo[];
  phase: RacePhase;
  settings: RoomSettings;
  /** Server wall-clock time (ms) when the room was created. */
  readonly createdAt: number;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Final race result for one player, broadcast when phase → FINISHED. */
export interface PlayerResult {
  readonly playerId: string;
  readonly playerName: string;
  readonly rank: number;
  /** Total race time in milliseconds (from race:started to finish crossing). */
  readonly totalTimeMs: number;
  readonly completedLaps: number;
  readonly dnf: boolean;
}

export interface RaceResults {
  readonly roomId: string;
  readonly trackId: string;
  readonly results: readonly PlayerResult[];
  /** Server timestamp when the race ended. */
  readonly finishedAt: number;
}
