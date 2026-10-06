# Architectural Invariants & Contradiction Log

> This document defines rules that must never be violated during implementation,
> and records every specification ambiguity or contradiction with a recommended resolution.
> Future agents must read this before touching existing code.

---

## Part 1 — Architectural Invariants

These are hard constraints. Any code change that would violate one requires an explicit discussion
and a documented exception before proceeding.

---

### INV-01 — The renderer is not the source of truth

The `Renderer` and all client-side drawing code read state; they never write it.
No position, velocity, lap count, or physics variable may be computed inside a rendering function.

**Enforced by:** `Renderer.ts` imports only from `Interpolator` (client) or `PhysicsWorld` (server debug).
It does not import from `VehiclePhysics`, `CollisionSystem`, or `RaceManager`.

---

### INV-02 — Server state is authoritative in multiplayer

The server's `PhysicsWorld` is the only legal source of vehicle positions and race progress
during a networked game. Clients may maintain a local predicted/interpolated view for smoothness,
but they must never emit their own position back to the server as a claim.

**Enforced by:** Server ignores any incoming event that carries a position payload.
`player:input` carries only `{ steering, throttle, brake, drift, timestamp }` — nothing else.

---

### INV-03 — Clients send inputs; they do not send authoritative positions

`PlayerInput` contains only control values. Any extension of `PlayerInput` that adds
`position`, `velocity`, or `rotation` is forbidden without an explicit security review.

---

### INV-04 — Physics is independent of rendering

`src/physics/` and `src/vehicle/` must not import anything from:
- `src/client/`
- `src/proxy/`
- `src/debug/` (except Telemetry, which only reads from physics)
- `src/audio/`
- `src/assets/`
- `src/ui/`

The physics simulation must be runnable in a headless Node.js environment with no canvas,
no DOM, and no asset loading.

---

### INV-05 — AI and human players use the same physics pipeline

`AIController` produces a `PlayerInput` struct identical to what `InputCapture` produces.
Both feed into `VehicleController.applyInput()` then `PhysicsWorld.integrate()`.
There is no "AI physics shortcut" or direct state mutation for AI cars.

**Why:** Any special path for AI invalidates the entire server-authoritative model
and makes balancing impossible.

---

### INV-06 — Race progress is determined by checkpoints and laps, not raw coordinates

Position ranking is computed from `completedLaps`, `currentCheckpointIndex`, and
`checkpointProgress` (fractional distance to next checkpoint).
Raw `position.x / position.y` coordinates are never used to determine race standing.

**Why:** Raw coordinate ranking breaks on any non-linear track
and is trivially exploitable by teleporting clients.

---

### INV-07 — Shared network contracts have exactly one canonical definition

All types used on both server and client (`VehicleConfig`, `VehicleState`, `PlayerInput`,
`Snapshot`, `RaceState`, `WeatherState`, `RoomInfo`, Socket.IO event names) are defined
in `src/shared/` and only there.

Neither `src/client/` nor `src/server/` (or `server/`) may re-declare or copy these types.
Both sides import from `src/shared/`.

**Why:** Divergence between server and client type definitions is the single most common
source of hard-to-debug network bugs.

---

### INV-08 — Physics uses a fixed timestep

`PhysicsWorld.integrate(dt)` is always called with the fixed server tick interval
(`dt = 1 / physicsTickHz`). Variable `dt` is never passed into physics integration.

The game loop may accumulate leftover time between real-time ticks, but it passes
only fixed `dt` slices to physics (the "fixed-update accumulator" pattern).

**Why:** Variable timestep physics produces non-deterministic results,
making debugging and replay impossible.

---

### INV-09 — Weather effects on gameplay are server-authoritative

`WeatherSystem` lives entirely on the server. Clients receive weather state inside
the `Snapshot` and use it only for visual effects (rain particles, wet road sheen).
Clients must not compute their own effective grip based on locally-assumed weather.

---

### INV-10 — Debug mode must not require final art assets

`PROXY_MODE=true` (the default during development) must produce a fully playable,
fully debuggable game using only Canvas 2D primitives. No image file loads, no audio
files, and no external CDN calls are permitted in proxy mode.

Toggling `PROXY_MODE` from `true` to `false` must change only the render path.
It must have zero effect on physics, networking, or race logic.

---

### INV-11 — Proxy assets are replaceable without changing gameplay logic

Asset paths live exclusively in `src/assets/manifest.ts`.
No gameplay, physics, networking, or UI file may contain a hardcoded asset path string.
Replacing all art means editing `manifest.ts` only.

---

### INV-12 — Coordinate system is defined once and used consistently

The internal world coordinate system is:
- **X** = right
- **Y** = up (or forward, to be decided in Phase 1 and frozen)
- Angles in **radians**, increasing counter-clockwise
- Units in **metres**

The `worldToScreen` transform (world coords → canvas pixels) lives in one place
(`src/client/Renderer.ts` or a dedicated `CoordTransform.ts`).
No other file performs coordinate conversion.

---

## Part 2 — Specification Contradictions & Ambiguities

Each entry records the conflict, its source in the spec, and the recommended resolution.
Deviating from a resolution requires a documented reason.

---

### CONTRADICTION-01 — 2D vs 3D coordinate space

**Spec says:**
- `VehicleState.position` is `{ x, y, z? }` (z is optional, implying 2D or 3D).
- Most physics descriptions use 2D (velocity `{x,y}`, rotation as a single angle).
- The rendering section mentions "Canvas 2D."

**Conflict:** The spec is ambiguous — it cannot be both a full 3D simulation
and a Canvas 2D renderer without a significant projection layer.

**Resolution:** **Build in 2D.** Use `{ x, y }` for all world-space position and velocity.
Remove the `z?` field from `VehicleState` in the canonical type. If a 3D upgrade is
needed later, the 2D physics layer becomes the XZ plane of a 3D world.
Keeps implementation tractable and consistent with Canvas 2D rendering.

---

### CONTRADICTION-02 — Physics tick rate: "60 Hz target" vs practical server load

**Spec says:**
- `physicsTickHz = 60` (Section 12, Table of Key Parameters).
- Also acknowledges "60 Hz → high CPU" as a con (Section 15).

**Conflict:** `setInterval` at 1 ms granularity (60 Hz = 16.67 ms) on Node.js
is achievable but not guaranteed. Under load, ticks can be delayed.

**Resolution:** Run the game loop at **60 Hz** as specified.
Use the fixed-accumulator pattern: measure real elapsed time, accumulate it,
and step physics in 16.67 ms slices until the accumulator is drained.
Cap the number of steps per frame to 3 (prevents spiral-of-death under CPU spike).
Document the cap; if a server stalls for > 50 ms it will simulate at most 3 ticks
and "lose" the remaining time rather than simulate a large jump.

---

### CONTRADICTION-03 — Client interpolation delay vs "server-authoritative" feel

**Spec says:**
- Clients buffer ~100 ms of snapshots for smooth rendering (Sections 4, 12).
- The game is server-authoritative with no client-side prediction (Section 15, Option A chosen).

**Conflict:** 100 ms buffer + network RTT = 150–250 ms of perceived input lag for local player.
This is acceptable for a casual multiplayer kart game but is explicitly noted as a downside
of Option A in the spec. The spec also mentions "immediate local response" as an Option B advantage.

**Resolution:** Accept the 100 ms buffer for correctness as specified.
**However:** implement a lightweight local "cosmetic prediction" for the local player's own car
(position-only, no physics authority) that is corrected on next snapshot.
This is visually indistinguishable from prediction but is cosmetic — the server snapshot
always wins. This must be clearly marked `COSMETIC_ONLY` in code to prevent future engineers
from misusing it as authoritative state. Defer to Phase 12; do not implement in Phase 3.

---

### CONTRADICTION-04 — "No external physics engine" vs reliability

**Spec says:** "We do not rely on an external physics engine (like Box2D)"
because the team wants "tight control" (Section 6).

**Assessment:** For 8 karts in 2D with simple circle/line geometry, a custom physics
implementation is entirely feasible and the correct choice. However:

**Risk:** Tunnelling (a fast car crossing a thin wall in one tick) is a real edge case
that Box2D handles automatically with swept collision detection.

**Resolution:** Keep custom physics as specified. Mitigate tunnelling by:
1. Capping max vehicle speed to a value where displacement per tick < vehicle radius (≈ `r / dt`).
2. Document the cap in `constants.ts` as `MAX_SPEED_MS` with a comment explaining why.
3. If tunnelling becomes a practical problem after Phase 7, implement a swept-circle
   broadphase check — without reaching for Box2D.

---

### CONTRADICTION-05 — Snapshot rate "15–20 Hz" vs "every 3 ticks at 60 Hz"

**Spec says:**
- `networkSnapHz ≈ 15–20` Hz (Section 12).
- "Server simulates 3 physics steps for each network update" (Section 4).
- `3 × 60 Hz = 20 Hz` network rate, but `15 Hz` is also mentioned.

**Conflict:** 60/3 = 20 Hz exactly. The "15 Hz" figure is inconsistent with "every 3 ticks."

**Resolution:** Use **20 Hz** (every 3 physics ticks). It's consistent with the "3 steps"
description and provides smoother interpolation than 15 Hz.
`networkSnapHz = 20` in `constants.ts`. Document the discrepancy here.

---

### CONTRADICTION-06 — LAN mode and HTTPS requirement for `DeviceOrientation`

**Spec says:**
- LAN mode serves from a local IP over HTTP (Section 11).
- Phase 15 uses `DeviceOrientation` API for gyro steering.

**Conflict:** Modern browsers (iOS Safari 13+, Chrome 91+) require HTTPS for
`DeviceOrientationEvent.requestPermission()` and restrict motion events on HTTP origins.

**Resolution:**
- LAN mode over HTTP is the primary transport — this is correct and necessary
  for simplicity (self-signed certs on mobile are a painful UX).
- **Gyro steering is opt-in and gracefully degraded.** If `DeviceOrientationEvent` is
  unavailable (HTTP origin or permission denied), fall back to touch joystick silently.
- Document as a known limitation: "Gyro steering requires HTTPS. On LAN HTTP, touch joystick is used."
- Do not attempt to self-sign certs as part of this project.

---

### CONTRADICTION-07 — "No game framework" vs development velocity

**Spec says:** "plain Canvas 2D" and no game framework like Phaser (implicit in the
custom physics requirement).

**Assessment:** This is the correct choice for this architecture. Phaser would impose its
own game loop, input system, and physics, all of which conflict with the server-authoritative
model. The custom Canvas 2D renderer is thin and fully under our control.

**Resolution:** Confirm and enforce: no Phaser, no PixiJS, no game framework.
Allowed: `socket.io`, `socket.io-client`, `qrcode`, TypeScript, `esbuild`/`webpack`, `vitest`.

---

### CONTRADICTION-08 — Spec mentions "Google Antigravity IDE" as the orchestration tool

**Spec says (Section 17):** "Use Google Antigravity IDE and its agentic tools."

**Assessment:** This is an internal reference in the spec document; we are working in
Kiro IDE. The reference is irrelevant to the implementation.

**Resolution:** Ignore all references to "Google Antigravity." The implementation plan
is IDE-agnostic. No action required.

---

### AMBIGUITY-01 — "checkpointProgress" definition

**Spec says:** `checkpointProgress: number // [0..1] to next checkpoint` in `VehicleState`,
but does not define how it is computed (time-based? distance-based?).

**Resolution:** Define as **fractional straight-line distance** from last crossed checkpoint
to the next checkpoint's midpoint.
`checkpointProgress = dist(car.pos, lastCheckpoint.pos) / dist(nextCheckpoint.pos, lastCheckpoint.pos)`
Clamped to `[0, 1]`. This is deterministic, cheap, and network-friendly.

---

### AMBIGUITY-02 — Maximum players per room

**Spec says:** `maxPlayers = 8` in the parameters table, but earlier mentions
"split-screen: one display + multiple phones" and "AirConsole-style."

**Resolution:** Default `maxPlayers = 8`. All 8 are active physics participants.
The "display screen" is not a player — it is a spectator client that receives snapshots
but sends no input. Implement it as a socket connection that joins the room with
`role: 'display'` and receives all events but is excluded from race logic.

---

### AMBIGUITY-03 — QR code generation: server-side vs client-side

**Spec says:** Display a QR code in the lobby (Section 11) but does not specify
where it is generated.

**Resolution:** Generate the QR code **server-side** (using the `qrcode` npm package)
as a base64 PNG data URL and include it in the `room:created` event payload.
Avoids the client needing to know the server's LAN IP independently.

---

## Part 3 — Decisions That Are Off the Table

These options were considered and explicitly rejected. Do not re-open without
updating this document.

| Decision | Rejected Option | Reason |
|---|---|---|
| Physics ownership | Client-authoritative or hybrid prediction | Cheat risk; spec explicitly chose server-auth |
| Game framework | Phaser, PixiJS, Babylon | Conflicts with custom physics loop and server-auth model |
| External physics | Box2D, Matter.js, Rapier | Custom physics is tractable for 8 circles in 2D |
| Coordinate space | 3D (x,y,z) | Canvas 2D; z adds complexity with no payoff at this stage |
| Network transport | Raw WebSocket (without Socket.IO) | Spec explicitly requires Socket.IO for fallback and rooms |
| Snapshot rate | 15 Hz | Inconsistent with "every 3 ticks at 60 Hz"; 20 Hz is correct |
| Gyro as required feature | Mandatory HTTPS + gyro | LAN HTTP incompatibility; touch joystick is the baseline |
