/**
 * Unified F1 2002 client: keyboard + mobile HUD, main menu, Socket.IO input uplink.
 */

import { io, type Socket } from "socket.io-client";
import { AudioEngine } from "./audio/AudioEngine.js";
import { CanvasRenderer, type GameMode } from "./render/CanvasRenderer.js";
import { InterpolationBuffer } from "./render/Interpolation.js";
import {
  MAX_PLAYERS,
  MAX_SPEED_MS,
  SERVER_PORT,
} from "../shared/constants.js";
import {
  ClientEvents,
  ServerEvents,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "../shared/events.js";
import {
  F1_2002_CAR_MODELS,
  isF1TeamCarModel,
  type F1TeamCarModel,
  type PlayerInput,
  type Snapshot,
} from "../shared/types.js";
import { clamp, deadZone } from "../math/MathUtils.js";

type UiScreen = "menu" | "lobby" | "race";
type BindAction = "throttle" | "brake" | "steerLeft" | "steerRight" | "drift";

interface ControlBindings {
  throttle: string;
  brake: string;
  steerLeft: string;
  steerRight: string;
  drift: string;
}

const DEFAULT_BINDINGS: ControlBindings = {
  throttle: "KeyW",
  brake: "KeyS",
  steerLeft: "KeyA",
  steerRight: "KeyD",
  drift: "Space",
};

const ARROW_ALIASES: Readonly<Record<string, BindAction>> = {
  ArrowUp: "throttle",
  ArrowDown: "brake",
  ArrowLeft: "steerLeft",
  ArrowRight: "steerRight",
};

const BIND_LABELS: Readonly<Record<BindAction, string>> = {
  throttle: "Throttle",
  brake: "Brake",
  steerLeft: "Steer Left",
  steerRight: "Steer Right",
  drift: "Drift",
};

interface ClientElements {
  canvas: HTMLCanvasElement;
  menu: HTMLElement;
  lobby: HTMLElement;
  touchHud: HTMLElement;
  status: HTMLElement;
  joinCode: HTMLElement;
  playerName: HTMLInputElement;
  pinInput: HTMLInputElement;
  carModelSelect: HTMLSelectElement;
  soundToggle: HTMLInputElement;
  melodyToggle: HTMLInputElement;
  steerSlider: HTMLInputElement;
}

// === F1 2002 TEAM SPRITE ENGINE ===
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
}

function codeLabel(code: string): string {
  if (code === "Space") return "SPACE";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Arrow")) return code.slice(5).toUpperCase();
  return code;
}

function socketUrl(): string {
  if (typeof window === "undefined") {
    return `http://127.0.0.1:${SERVER_PORT}`;
  }
  const { protocol, hostname, port } = window.location;
  if (hostname && port) {
    return `${protocol}//${hostname}:${port}`;
  }
  return `http://${hostname || "127.0.0.1"}:${SERVER_PORT}`;
}

export class ClientMain {
  private readonly els: ClientElements;
  private readonly renderer: CanvasRenderer;
  private readonly audio = new AudioEngine();
  private readonly interpolator = new InterpolationBuffer();
  private readonly keys = new Set<string>();
  private readonly bindings: ControlBindings = { ...DEFAULT_BINDINGS };

  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private localPlayerId: string | null = null;
  private roomId: string | null = null;
  private screen: UiScreen = "menu";
  private gameMode: GameMode = "quick_race";
  private selectedCarModel: F1TeamCarModel = F1_2002_CAR_MODELS[0];
  private raceStartedAtMs = 0;
  private rebindTarget: BindAction | null = null;
  private lastInput: PlayerInput | null = null;
  private pointerSteer = 0;
  private pointerThrottle = 0;
  private pointerBrake = 0;
  private pointerDrift = false;
  private destroyed = false;

  constructor(els: ClientElements, renderer: CanvasRenderer) {
    this.els = els;
    this.renderer = renderer;
  }

  public start(): void {
    this.bindDom();
    this.bindKeyboard();
    this.bindTouch();
    this.connectSocket();
    this.renderer.setFrameHook(() => {
      this.onAnimationFrame();
    });
    this.renderer.start();
    this.showScreen("menu");
  }

  public destroy(): void {
    this.destroyed = true;
    this.renderer.stop();
    this.audio.stop();
    this.socket?.disconnect();
  }

  private connectSocket(): void {
    try {
      const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl(), {
        autoConnect: true,
        reconnection: true,
        timeout: 4000,
      });
      this.socket = socket;

      socket.on("connect", () => {
        this.localPlayerId = socket.id ?? null;
        this.setStatus("LINK ONLINE");
      });
      socket.on("disconnect", () => {
        this.setStatus("LINK DOWN");
      });
      socket.on("connect_error", () => {
        this.setStatus("LINK FAILED — retrying");
      });

      socket.on(ServerEvents.ROOM_CREATED, (payload) => {
        this.roomId = payload.room.roomId;
        this.localPlayerId = socket.id ?? this.localPlayerId;
        this.els.joinCode.textContent = payload.joinCode;
        this.showScreen("lobby");
        this.setStatus(`ROOM ${payload.joinCode}`);
        this.emitReady();
      });
      socket.on(ServerEvents.ROOM_JOINED, (payload) => {
        this.roomId = payload.room.roomId;
        this.els.joinCode.textContent = payload.room.joinCode;
        this.showScreen("lobby");
        this.setStatus(`JOINED ${payload.room.joinCode}`);
        this.emitReady();
      });
      socket.on(ServerEvents.ROOM_ERROR, (payload) => {
        this.setStatus(payload.message);
      });
      socket.on(ServerEvents.RACE_STARTED, (payload) => {
        this.raceStartedAtMs = payload.startedAt;
        this.showScreen("race");
        this.setStatus(this.gameMode === "time_trial" ? "TIME TRIAL" : "QUICK RACE");
        void this.audio.start();
      });
      socket.on(ServerEvents.RACE_STATE, (snapshot: Snapshot) => {
        this.interpolator.addSnapshot(snapshot);
      });
      socket.on(ServerEvents.ROOM_CLOSED, () => {
        this.roomId = null;
        this.showScreen("menu");
        this.setStatus("ROOM CLOSED");
      });
    } catch {
      this.setStatus("SOCKET INIT FAILED");
    }
  }

  private bindDom(): void {
    document.getElementById("btn-quick-race")?.addEventListener("click", () => {
      this.gameMode = "quick_race";
      void this.audio.start();
      this.createRoom(3);
    });
    document.getElementById("btn-time-trial")?.addEventListener("click", () => {
      this.gameMode = "time_trial";
      void this.audio.start();
      this.createRoom(1);
    });
    document.getElementById("btn-join")?.addEventListener("click", () => {
      this.joinRoom();
    });
    document.getElementById("btn-leave")?.addEventListener("click", () => {
      this.leaveRoom();
    });
    this.els.soundToggle.addEventListener("change", () => {
      this.audio.setMuted(!this.els.soundToggle.checked);
    });
    this.els.melodyToggle.addEventListener("change", () => {
      this.audio.setMelodyEnabled(this.els.melodyToggle.checked);
    });
    if (isF1TeamCarModel(this.els.carModelSelect.value)) {
      this.selectedCarModel = this.els.carModelSelect.value;
    }
    this.els.carModelSelect.addEventListener("change", () => {
      if (!isF1TeamCarModel(this.els.carModelSelect.value)) {
        this.els.carModelSelect.value = this.selectedCarModel;
        return;
      }
      this.selectedCarModel = this.els.carModelSelect.value;
      this.lastInput = null;
      this.setStatus(`${this.selectedCarModel.toUpperCase()} SELECTED`);
    });
    this.paintBindButtons();
    for (const action of Object.keys(BIND_LABELS) as BindAction[]) {
      document.getElementById(`bind-${action}`)?.addEventListener("click", () => {
        this.rebindTarget = action;
        this.setStatus(`PRESS KEY FOR ${BIND_LABELS[action].toUpperCase()}`);
      });
    }
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (event) => {
      try {
        if (this.rebindTarget) {
          event.preventDefault();
          this.bindings[this.rebindTarget] = event.code;
          this.rebindTarget = null;
          this.paintBindButtons();
          this.setStatus("CONTROLS UPDATED");
          return;
        }
        if (event.code === "Space" || event.code.startsWith("Arrow")) {
          event.preventDefault();
        }
        this.keys.add(event.code);
        void this.audio.start();
      } catch {
        /* ignore */
      }
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener("blur", () => {
      this.keys.clear();
    });
  }

  private bindTouch(): void {
    const gas = document.getElementById("touch-gas");
    const brake = document.getElementById("touch-brake");
    const drift = document.getElementById("touch-drift");
    this.wireHold(gas, (down) => {
      this.pointerThrottle = down ? 1 : 0;
    });
    this.wireHold(brake, (down) => {
      this.pointerBrake = down ? 1 : 0;
    });
    this.wireHold(drift, (down) => {
      this.pointerDrift = down;
    });
    this.els.steerSlider.addEventListener("input", () => {
      const raw = Number.parseFloat(this.els.steerSlider.value);
      this.pointerSteer = deadZone(clamp(Number.isFinite(raw) ? raw : 0, -1, 1), 0.04);
    });
    this.els.steerSlider.addEventListener("pointerup", () => {
      this.els.steerSlider.value = "0";
      this.pointerSteer = 0;
    });
    this.els.steerSlider.addEventListener("pointercancel", () => {
      this.els.steerSlider.value = "0";
      this.pointerSteer = 0;
    });
  }

  private wireHold(el: HTMLElement | null, set: (down: boolean) => void): void {
    if (!el) {
      return;
    }
    const on = (event: Event): void => {
      event.preventDefault();
      set(true);
      void this.audio.start();
    };
    const off = (event: Event): void => {
      event.preventDefault();
      set(false);
    };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("pointercancel", off);
  }

  private createRoom(totalLaps: number): void {
    const name = this.playerName();
    this.safeEmit(ClientEvents.ROOM_CREATE, {
      playerName: name,
      role: "player",
      settings: {
        trackId: "default",
        totalLaps,
        maxPlayers: this.gameMode === "time_trial" ? 1 : MAX_PLAYERS,
      },
    });
  }

  private joinRoom(): void {
    const pin = this.els.pinInput.value.trim();
    this.safeEmit(ClientEvents.ROOM_JOIN, {
      joinCode: pin,
      playerName: this.playerName(),
      role: "player",
    });
  }

  private leaveRoom(): void {
    if (this.roomId) {
      this.safeEmit(ClientEvents.ROOM_LEAVE, { roomId: this.roomId });
    }
    this.roomId = null;
    this.showScreen("menu");
  }

  private emitReady(): void {
    this.safeEmit(ClientEvents.PLAYER_READY, { ready: true });
  }

  private playerName(): string {
    const value = this.els.playerName.value.trim();
    return value.length > 0 ? value.slice(0, 16) : "DRIVER";
  }

  private onAnimationFrame(): void {
    if (this.destroyed) {
      return;
    }
    const snapshot = this.interpolator.getInterpolatedState(Date.now());
    this.renderer.setView({
      snapshot,
      localPlayerId: this.localPlayerId,
      raceStartedAtMs: this.raceStartedAtMs,
      gameMode: this.gameMode,
      nowMs: Date.now(),
    });
    const local = snapshot?.vehicles.find((v) => v.id === this.localPlayerId) ?? snapshot?.vehicles[0];
    const speed = local ? Math.hypot(local.velocity.x, local.velocity.y) : 0;
    const input = this.captureInput();
    this.audio.update({
      speedMs: speed,
      maxSpeedMs: MAX_SPEED_MS,
      throttle: input.throttle,
      isDrifting: local?.isDrifting ?? this.held("drift"),
    });
    if (this.screen === "race") {
      this.uplinkInput(input);
    }
  }

  private captureInput(): PlayerInput {
    const steerKey =
      (this.held("steerRight") ? 1 : 0) + (this.held("steerLeft") ? -1 : 0);
    const steering = clamp(steerKey !== 0 ? steerKey : this.pointerSteer, -1, 1);
    const throttle = this.held("throttle") ? 1 : this.pointerThrottle;
    const brake = this.held("brake") ? 1 : this.pointerBrake;
    return {
      steering,
      throttle,
      brake,
      drift: this.held("drift") || this.pointerDrift,
      carModel: this.selectedCarModel,
      timestamp: Date.now(),
    };
  }

  private held(action: BindAction): boolean {
    if (this.keys.has(this.bindings[action])) {
      return true;
    }
    for (const [code, alias] of Object.entries(ARROW_ALIASES)) {
      if (alias === action && this.keys.has(code)) {
        return true;
      }
    }
    return false;
  }

  private uplinkInput(input: PlayerInput): void {
    const prev = this.lastInput;
    const changed =
      !prev ||
      prev.steering !== input.steering ||
      prev.throttle !== input.throttle ||
      prev.brake !== input.brake ||
      prev.drift !== input.drift ||
      prev.carModel !== input.carModel;
    if (!changed) {
      return;
    }
    this.lastInput = input;
    this.safeEmit(ClientEvents.PLAYER_INPUT, input);
  }

  private safeEmit(event: keyof ClientToServerEvents, payload: unknown): void {
    try {
      this.socket?.emit(event, payload as never);
    } catch {
      /* drop packet rather than crash */
    }
  }

  private showScreen(screen: UiScreen): void {
    this.screen = screen;
    this.els.menu.hidden = screen !== "menu";
    this.els.lobby.hidden = screen !== "lobby";
    this.els.touchHud.hidden = screen !== "race";
  }

  private paintBindButtons(): void {
    for (const action of Object.keys(BIND_LABELS) as BindAction[]) {
      const btn = document.getElementById(`bind-${action}`);
      if (btn) {
        btn.textContent = `${BIND_LABELS[action]}: ${codeLabel(this.bindings[action])}`;
      }
    }
  }

  private setStatus(message: string): void {
    this.els.status.textContent = message;
  }
}

function boot(): void {
  try {
    window.addEventListener("error", (event) => {
      event.preventDefault();
    });
    window.addEventListener("unhandledrejection", (event) => {
      event.preventDefault();
    });

    const canvas = byId<HTMLCanvasElement>("race-canvas");
    const renderer = new CanvasRenderer(canvas);
    const app = new ClientMain(
      {
        canvas,
        menu: byId("main-menu"),
        lobby: byId("lobby-overlay"),
        touchHud: byId("touch-hud"),
        status: byId("link-status"),
        joinCode: byId("join-code"),
        playerName: byId<HTMLInputElement>("player-name"),
        pinInput: byId<HTMLInputElement>("pin-input"),
        carModelSelect: byId<HTMLSelectElement>("car-model-select"),
        soundToggle: byId<HTMLInputElement>("sound-toggle"),
        melodyToggle: byId<HTMLInputElement>("melody-toggle"),
        steerSlider: byId<HTMLInputElement>("steer-slider"),
      },
      renderer
    );
    app.start();
  } catch (error) {
    const status = document.getElementById("link-status");
    if (status) {
      status.textContent = error instanceof Error ? error.message : "CLIENT BOOT FAILED";
    }
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
