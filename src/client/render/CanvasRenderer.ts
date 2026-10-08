/**
 * 60 Hz HTML5 Canvas 2D graphics manager.
 * F1 2002 arcade HUD: tachometer, position/lap timers, tire temperature tracks,
 * and a flashing OVERHEAT PENALTY banner when engine caps are reached.
 *
 * Vehicle and needle rotation use lerpAngle (polar shortest-path interpolation)
 * plus ctx.rotate so sweeps never take the long way around 2π.
 */

import {
  ENGINE_OVERHEAT_THRESHOLD,
  MAX_SPEED_MS,
} from "../../shared/constants.js";
import type { F1TeamCarModel, Snapshot, SnapshotVehicle, Vec2 } from "../../shared/types.js";
import { clamp, clamp01, lerp, lerpAngle, radToDeg } from "../../math/MathUtils.js";

export type GameMode = "quick_race" | "time_trial";

export interface TireTemperatures {
  readonly fl: number;
  readonly fr: number;
  readonly rl: number;
  readonly rr: number;
}

export interface RenderView {
  readonly snapshot: Snapshot | null;
  readonly localPlayerId: string | null;
  readonly raceStartedAtMs: number;
  readonly gameMode: GameMode;
  readonly nowMs: number;
}

const TARGET_FRAME_MS = 1000 / 60;
const PIXELS_PER_METRE = 18;
const TACH_MIN_ANGLE = (-140 * Math.PI) / 180;
const TACH_MAX_ANGLE = (140 * Math.PI) / 180;
const TIRE_IDLE_C = 72;
const TIRE_MAX_C = 130;

// === F1 2002 TEAM SPRITE ENGINE ===
interface TeamPalette {
  readonly body: string;
  readonly accent: string;
  readonly secondary: string;
  readonly dark: string;
  readonly cockpit: string;
}

type SpriteDrawPass = (ctx: CanvasRenderingContext2D, palette: TeamPalette) => void;

interface TeamSpriteDefinition {
  readonly palette: TeamPalette;
  readonly passes: readonly SpriteDrawPass[];
}

const drawRearWing: SpriteDrawPass = (ctx, palette) => {
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-22, -12, 4, 24);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(-21, -13, 3, 26);
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-18, -10, 4, 20);
};

const drawRearSlicks: SpriteDrawPass = (ctx) => {
  ctx.fillStyle = "#101116";
  for (const y of [-12, 7]) {
    ctx.fillRect(-15, y, 9, 5);
    ctx.strokeStyle = "#454951";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-15, y, 9, 5);
  }
};

const drawSweptChassis: SpriteDrawPass = (ctx, palette) => {
  ctx.beginPath();
  ctx.moveTo(23, 0);
  ctx.lineTo(17, -4);
  ctx.bezierCurveTo(11, -7, 8, -8, 1, -8);
  ctx.lineTo(-12, -7);
  ctx.lineTo(-19, -4);
  ctx.lineTo(-19, 4);
  ctx.lineTo(-12, 7);
  ctx.lineTo(1, 8);
  ctx.bezierCurveTo(8, 8, 11, 7, 17, 4);
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 1.4;
  ctx.stroke();
};

const drawFerrariLivery: SpriteDrawPass = (ctx, palette) => {
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(12, -2);
  ctx.lineTo(-16, -2.5);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-16, 2.5);
  ctx.lineTo(12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4f0e8";
  ctx.fillRect(-7, -1, 5, 2);
};

const drawWilliamsLivery: SpriteDrawPass = (ctx, palette) => {
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(9, -2.2);
  ctx.lineTo(-15, -3.5);
  ctx.lineTo(-18, -1.7);
  ctx.lineTo(-18, 1.7);
  ctx.lineTo(-15, 3.5);
  ctx.lineTo(9, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(-9, -6, 13, 2);
  ctx.fillRect(-9, 4, 13, 2);
};

const drawMcLarenLivery: SpriteDrawPass = (ctx, palette) => {
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(13, -2);
  ctx.lineTo(-16, -3);
  ctx.lineTo(-19, 0);
  ctx.lineTo(-16, 3);
  ctx.lineTo(13, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(-13, -1, 8, 2);
};

const drawCockpit: SpriteDrawPass = (ctx, palette) => {
  ctx.fillStyle = palette.cockpit;
  ctx.beginPath();
  ctx.ellipse(1, 0, 6.2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 1;
  ctx.stroke();
};

const drawCockpitHalo: SpriteDrawPass = (ctx, palette) => {
  ctx.strokeStyle = palette.secondary;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(1, 0, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -4.3);
  ctx.lineTo(1, 4.3);
  ctx.stroke();
};

const drawFrontWing: SpriteDrawPass = (ctx, palette) => {
  ctx.fillStyle = palette.dark;
  ctx.fillRect(16, -13, 3, 26);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(19, -15, 2, 30);
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(21, -12, 2, 24);
  ctx.fillStyle = palette.dark;
  ctx.fillRect(16, -15, 7, 2);
  ctx.fillRect(16, 13, 7, 2);
};

const TEAM_SPRITE_PASSES: Readonly<Record<F1TeamCarModel, TeamSpriteDefinition>> = {
  "Ferrari F2002": {
    palette: {
      body: "#d71920",
      accent: "#f2c230",
      secondary: "#f4f0e8",
      dark: "#42090e",
      cockpit: "#171c26",
    },
    passes: [
      drawRearWing, drawRearSlicks, drawSweptChassis, drawFerrariLivery,
      drawCockpit, drawCockpitHalo, drawFrontWing,
    ],
  },
  "Williams FW24": {
    palette: {
      body: "#1763b3",
      accent: "#f4f6fb",
      secondary: "#17376f",
      dark: "#081c3a",
      cockpit: "#151c28",
    },
    passes: [
      drawRearWing, drawRearSlicks, drawSweptChassis, drawWilliamsLivery,
      drawCockpit, drawCockpitHalo, drawFrontWing,
    ],
  },
  "McLaren MP4-17": {
    palette: {
      body: "#aeb4bc",
      accent: "#e8edf2",
      secondary: "#f07a24",
      dark: "#343941",
      cockpit: "#151b25",
    },
    passes: [
      drawRearWing, drawRearSlicks, drawSweptChassis, drawMcLarenLivery,
      drawCockpit, drawCockpitHalo, drawFrontWing,
    ],
  },
};

const COL = {
  void: "#050814",
  asphalt: "#1a2233",
  hudPanel: "rgba(4, 10, 28, 0.82)",
  hudStroke: "#8a9bb8",
  gold: "#f0c400",
  cyan: "#6ee0ff",
  red: "#e02424",
  white: "#f4f6fb",
  dim: "#8b97ad",
} as const;

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private running = false;
  private lastDrawMs = 0;
  private view: RenderView;
  private displayedRotation = new Map<string, number>();
  private tachAngle = TACH_MIN_ANGLE;
  private flashPhase = 0;
  private onFrame: ((nowMs: number, dtSec: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable.");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.view = {
      snapshot: null,
      localPlayerId: null,
      raceStartedAtMs: 0,
      gameMode: "quick_race",
      nowMs: 0,
    };
  }

  public setFrameHook(hook: ((nowMs: number, dtSec: number) => void) | null): void {
    this.onFrame = hook;
  }

  public setView(view: RenderView): void {
    this.view = view;
  }

  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastDrawMs = 0;
    const loop = (now: number): void => {
      if (!this.running) {
        return;
      }
      this.rafId = window.requestAnimationFrame(loop);
      try {
        if (this.lastDrawMs === 0) {
          this.lastDrawMs = now;
        }
        const elapsed = now - this.lastDrawMs;
        if (elapsed < TARGET_FRAME_MS - 1) {
          return;
        }
        const dtSec = Math.min(0.05, elapsed / 1000);
        this.lastDrawMs = now;
        this.resizeToDisplay();
        this.onFrame?.(now, dtSec);
        this.draw(now, dtSec);
      } catch {
        /* never let a frame crash the RAF loop */
      }
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public worldToScreen(world: Vec2, camera: Vec2, width: number, height: number): Vec2 {
    return {
      x: (world.x - camera.x) * PIXELS_PER_METRE + width * 0.5,
      y: -(world.y - camera.y) * PIXELS_PER_METRE + height * 0.5,
    };
  }

  /**
   * Polar shortest-path blend, then map onto the tachometer sweep.
   * Exposed for tests and HUD needle updates.
   */
  public interpolatePolar(fromRad: number, toRad: number, t: number): number {
    return lerpAngle(fromRad, toRad, clamp01(t));
  }

  public deriveTireTemperatures(vehicle: SnapshotVehicle): TireTemperatures {
    const speed = Math.hypot(vehicle.velocity.x, vehicle.velocity.y);
    const speedRatio = clamp01(speed / MAX_SPEED_MS);
    const driftBoost = vehicle.isDrifting ? 28 : 0;
    const engineBias = clamp((vehicle.engineTemperature - 20) * 0.18, 0, 22);
    const base = TIRE_IDLE_C + speedRatio * 22 + engineBias;
    return {
      fl: clamp(base + driftBoost * 0.85, TIRE_IDLE_C, TIRE_MAX_C),
      fr: clamp(base + driftBoost, TIRE_IDLE_C, TIRE_MAX_C),
      rl: clamp(base + driftBoost * 1.15, TIRE_IDLE_C, TIRE_MAX_C),
      rr: clamp(base + driftBoost * 1.25, TIRE_IDLE_C, TIRE_MAX_C),
    };
  }

  private resizeToDisplay(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const pixelW = Math.floor(width * dpr);
    const pixelH = Math.floor(height * dpr);
    if (this.canvas.width !== pixelW || this.canvas.height !== pixelH) {
      this.canvas.width = pixelW;
      this.canvas.height = pixelH;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private draw(now: number, dtSec: number): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.fillStyle = COL.void;
    ctx.fillRect(0, 0, width, height);

    const snapshot = this.view.snapshot;
    const local = this.findLocal(snapshot);
    const camera: Vec2 = local ? local.position : { x: 0, y: 0 };

    this.drawTrackGrid(width, height, camera);
    if (snapshot) {
      for (const vehicle of snapshot.vehicles) {
        this.drawKart(vehicle, camera, width, height, dtSec);
      }
    }

    this.drawHud(now, dtSec, local, snapshot, width, height);
  }

  private findLocal(snapshot: Snapshot | null): SnapshotVehicle | null {
    if (!snapshot) {
      return null;
    }
    const id = this.view.localPlayerId;
    if (id) {
      const match = snapshot.vehicles.find((v) => v.id === id);
      if (match) {
        return match;
      }
    }
    return snapshot.vehicles[0] ?? null;
  }

  private drawTrackGrid(width: number, height: number, camera: Vec2): void {
    const ctx = this.ctx;
    ctx.fillStyle = COL.asphalt;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(80, 96, 128, 0.35)";
    ctx.lineWidth = 1;
    const spacing = PIXELS_PER_METRE * 4;
    const offsetX = -((camera.x * PIXELS_PER_METRE) % spacing);
    const offsetY = (camera.y * PIXELS_PER_METRE) % spacing;
    ctx.beginPath();
    for (let x = offsetX; x < width + spacing; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height + spacing; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  private drawKart(
    vehicle: SnapshotVehicle,
    camera: Vec2,
    width: number,
    height: number,
    dtSec: number
  ): void {
    const ctx = this.ctx;
    const screen = this.worldToScreen(vehicle.position, camera, width, height);
    const prev = this.displayedRotation.get(vehicle.id) ?? vehicle.rotation;
    const next = this.interpolatePolar(prev, vehicle.rotation, clamp01(dtSec * 18));
    this.displayedRotation.set(vehicle.id, next);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    // Canvas Y is down; world angles are CCW from +X, so negate for screen.
    ctx.rotate(-next);
    const sprite = TEAM_SPRITE_PASSES[vehicle.carModel];
    for (const pass of sprite.passes) {
      pass(ctx, sprite.palette);
    }
    if (vehicle.isDrifting) {
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-15, -16, 38, 32);
    }
    ctx.restore();
  }

  private drawHud(
    now: number,
    dtSec: number,
    local: SnapshotVehicle | null,
    snapshot: Snapshot | null,
    width: number,
    height: number
  ): void {
    this.flashPhase += dtSec * 6;
    this.drawTachometer(local, width, height, dtSec);
    this.drawRaceTimers(local, snapshot, now, width);
    this.drawTireTracks(local, height);
    this.drawOverheat(local, width, height);
    this.drawModeChip(width);
  }

  private drawTachometer(
    local: SnapshotVehicle | null,
    width: number,
    height: number,
    dtSec: number
  ): void {
    const ctx = this.ctx;
    const cx = width * 0.5;
    const cy = height - 78;
    const radius = 62;
    const speed = local ? Math.hypot(local.velocity.x, local.velocity.y) : 0;
    const ratio = clamp01(speed / MAX_SPEED_MS);
    const target = lerp(TACH_MIN_ANGLE, TACH_MAX_ANGLE, ratio);
    this.tachAngle = this.interpolatePolar(this.tachAngle, target, clamp01(dtSec * 10));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = COL.hudPanel;
    ctx.strokeStyle = COL.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = COL.hudStroke;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const a = lerp(TACH_MIN_ANGLE, TACH_MAX_ANGLE, t) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (radius - 4), Math.sin(a) * (radius - 4));
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.stroke();
    }

    ctx.save();
    ctx.rotate(this.tachAngle);
    ctx.strokeStyle = COL.red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -radius + 6);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COL.white;
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(speed * 3.6)} KM/H`, 0, 28);
    ctx.fillStyle = COL.dim;
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillText(`TACH ${radToDeg(this.tachAngle).toFixed(0)}°`, 0, 42);
    ctx.restore();
  }

  private drawRaceTimers(
    local: SnapshotVehicle | null,
    snapshot: Snapshot | null,
    now: number,
    width: number
  ): void {
    const ctx = this.ctx;
    const elapsed =
      this.view.raceStartedAtMs > 0 ? Math.max(0, now - this.view.raceStartedAtMs) : 0;
    const rank = this.localRank(local, snapshot);
    const laps = local?.completedLaps ?? 0;
    const progress = local?.checkpointProgress ?? 0;

    this.panel(12, 12, 220, 92);
    ctx.fillStyle = COL.gold;
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("F1 2002  TELEMETRY", 24, 32);
    ctx.fillStyle = COL.white;
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillText(`P${rank}   LAP ${laps}`, 24, 58);
    ctx.fillStyle = COL.cyan;
    ctx.font = "14px 'Courier New', monospace";
    ctx.fillText(`T ${formatRaceTime(elapsed)}`, 24, 80);
    ctx.fillStyle = COL.dim;
    ctx.font = "11px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`SEC ${(progress * 100).toFixed(0)}%`, 220, 80);

    ctx.textAlign = "right";
    this.panel(width - 188, 12, 176, 56);
    ctx.fillStyle = COL.gold;
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText("ENGINE °C", width - 24, 32);
    const temp = local?.engineTemperature ?? 20;
    ctx.fillStyle = temp >= ENGINE_OVERHEAT_THRESHOLD ? COL.red : COL.white;
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillText(temp.toFixed(0), width - 24, 54);
  }

  private drawTireTracks(local: SnapshotVehicle | null, height: number): void {
    const temps: TireTemperatures = local
      ? this.deriveTireTemperatures(local)
      : { fl: TIRE_IDLE_C, fr: TIRE_IDLE_C, rl: TIRE_IDLE_C, rr: TIRE_IDLE_C };
    const x = 16;
    const y = height - 148;
    this.panel(x, y, 132, 128);
    const ctx = this.ctx;
    ctx.fillStyle = COL.gold;
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("TIRE TEMP", x + 12, y + 20);
    this.tireBar(x + 18, y + 36, "FL", temps.fl);
    this.tireBar(x + 72, y + 36, "FR", temps.fr);
    this.tireBar(x + 18, y + 80, "RL", temps.rl);
    this.tireBar(x + 72, y + 80, "RR", temps.rr);
  }

  private tireBar(x: number, y: number, label: string, tempC: number): void {
    const ctx = this.ctx;
    const ratio = clamp01((tempC - TIRE_IDLE_C) / (TIRE_MAX_C - TIRE_IDLE_C));
    ctx.fillStyle = COL.dim;
    ctx.font = "10px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#12182a";
    ctx.fillRect(x, y + 4, 40, 28);
    ctx.fillStyle = ratio > 0.8 ? COL.red : ratio > 0.45 ? COL.gold : COL.cyan;
    ctx.fillRect(x, y + 32 - 28 * ratio, 40, 28 * ratio);
    ctx.strokeStyle = COL.hudStroke;
    ctx.strokeRect(x, y + 4, 40, 28);
    ctx.fillStyle = COL.white;
    ctx.font = "9px 'Courier New', monospace";
    ctx.fillText(`${tempC.toFixed(0)}`, x + 6, y + 22);
  }

  private drawOverheat(local: SnapshotVehicle | null, width: number, height: number): void {
    if (!local || local.engineTemperature < ENGINE_OVERHEAT_THRESHOLD) {
      return;
    }
    const ctx = this.ctx;
    const pulse = 0.45 + 0.45 * Math.abs(Math.sin(this.flashPhase));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(160, 8, 8, 0.55)";
    ctx.fillRect(width * 0.18, height * 0.38, width * 0.64, 64);
    ctx.strokeStyle = COL.red;
    ctx.lineWidth = 3;
    ctx.strokeRect(width * 0.18, height * 0.38, width * 0.64, 64);
    ctx.fillStyle = COL.white;
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("OVERHEAT PENALTY", width * 0.5, height * 0.38 + 42);
    ctx.restore();
  }

  private drawModeChip(width: number): void {
    const label = this.view.gameMode === "time_trial" ? "TIME TRIAL" : "QUICK RACE";
    this.panel(width * 0.5 - 70, 12, 140, 28);
    const ctx = this.ctx;
    ctx.fillStyle = COL.cyan;
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, width * 0.5, 32);
  }

  private panel(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COL.hudPanel;
    ctx.strokeStyle = COL.hudStroke;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  private localRank(local: SnapshotVehicle | null, snapshot: Snapshot | null): number {
    if (!local || !snapshot) {
      return 1;
    }
    const standing = snapshot.standings.find((s) => s.playerId === local.id);
    return standing?.rank ?? 1;
  }
}

export function formatRaceTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const hundredths = Math.floor((total % 1000) / 10);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const hh = String(hundredths).padStart(2, "0");
  return `${mm}:${ss}.${hh}`;
}
