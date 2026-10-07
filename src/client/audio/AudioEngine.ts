/**
 * Pure procedural 8-bit synthesizer. Native Web Audio API only — no sample files.
 *
 * Pipeline:
 *   engine oscillator  → gain  ┐
 *   white-noise blast  → gain  ├→ masterGain → destination
 *   melody square notes → gain ┘
 *
 * The melody uses an AudioContext.currentTime look-ahead scheduler so the
 * main thread never blocks on note playback.
 */

export interface EngineAudioTelemetry {
  readonly speedMs: number;
  readonly maxSpeedMs: number;
  readonly throttle: number;
  readonly isDrifting: boolean;
}

const IDLE_HZ = 72;
const MAX_ENGINE_HZ = 420;
const LOOKAHEAD_S = 0.12;
const SCHEDULE_INTERVAL_MS = 25;
const NOTE_DURATION_S = 0.14;
const MELODY_STEP_S = 0.18;

/** Square-wave fanfare (Hz). Loops indefinitely while racing. */
const MELODY_HZ: readonly number[] = [
  261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63, 196.0, 220.0, 261.63,
  329.63, 392.0, 349.23, 329.63, 293.66, 261.63,
];

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private melodyGain: GainNode | null = null;

  private running = false;
  private muted = false;
  private melodyEnabled = true;
  private nextNoteTime = 0;
  private melodyIndex = 0;
  private schedulerHandle: number | null = null;
  private engineHz = IDLE_HZ;

  public isRunning(): boolean {
    return this.running;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public async start(): Promise<void> {
    try {
      if (this.running) {
        await this.resume();
        return;
      }
      const Ctor = resolveAudioContextCtor();
      if (!Ctor) {
        return;
      }
      this.context = new Ctor();
      this.buildGraph();
      this.running = true;
      this.nextNoteTime = this.context.currentTime + 0.05;
      this.armScheduler();
      await this.resume();
    } catch {
      this.safeShutdown();
    }
  }

  public stop(): void {
    try {
      this.disarmScheduler();
      this.safeShutdown();
    } catch {
      this.running = false;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
  }

  public setMelodyEnabled(enabled: boolean): void {
    this.melodyEnabled = enabled;
    try {
      const now = this.context?.currentTime ?? 0;
      this.melodyGain?.gain.setTargetAtTime(enabled && !this.muted ? 0.08 : 0, now, 0.05);
    } catch {
      /* ignore */
    }
  }

  /**
   * Drive live parameters from interpolated vehicle telemetry.
   * Safe to call every animation frame.
   */
  public update(telemetry: EngineAudioTelemetry): void {
    if (!this.running || !this.context) {
      return;
    }
    try {
      const speed = Math.max(0, finite(telemetry.speedMs, 0));
      const maxSpeed = Math.max(1, finite(telemetry.maxSpeedMs, 30));
      const ratio = clamp01(speed / maxSpeed);
      const throttle = clamp01(finite(telemetry.throttle, 0));
      const targetHz = IDLE_HZ + (MAX_ENGINE_HZ - IDLE_HZ) * (0.35 * throttle + 0.65 * ratio);
      this.engineHz += (targetHz - this.engineHz) * 0.18;
      const now = this.context.currentTime;
      this.engineOsc?.frequency.setTargetAtTime(this.engineHz, now, 0.04);
      const engineLevel = 0.04 + 0.1 * ratio + 0.04 * throttle;
      this.engineGain?.gain.setTargetAtTime(this.muted ? 0 : engineLevel, now, 0.05);

      const screech = telemetry.isDrifting ? 0.16 + 0.1 * ratio : 0;
      this.noiseGain?.gain.setTargetAtTime(this.muted ? 0 : screech, now, 0.03);
    } catch {
      /* keep the graph alive */
    }
  }

  private async resume(): Promise<void> {
    if (!this.context) {
      return;
    }
    try {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
    } catch {
      /* autoplay policy — start() is retried from a user gesture */
    }
  }

  private buildGraph(): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.55;
    this.masterGain.connect(ctx.destination);

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.masterGain);
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = IDLE_HZ;
    this.engineOsc.connect(this.engineGain);
    this.engineOsc.start();

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseGain.connect(this.masterGain);
    const noiseBuffer = this.createWhiteNoiseBuffer(ctx);
    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    this.noiseSource.connect(this.noiseGain);
    this.noiseSource.start();

    this.melodyGain = ctx.createGain();
    this.melodyGain.gain.value = this.melodyEnabled ? 0.08 : 0;
    this.melodyGain.connect(this.masterGain);
  }

  private createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.5));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private armScheduler(): void {
    this.disarmScheduler();
    const tick = (): void => {
      this.scheduleAhead();
      this.schedulerHandle = window.setTimeout(tick, SCHEDULE_INTERVAL_MS);
    };
    this.schedulerHandle = window.setTimeout(tick, SCHEDULE_INTERVAL_MS);
  }

  private disarmScheduler(): void {
    if (this.schedulerHandle !== null) {
      window.clearTimeout(this.schedulerHandle);
      this.schedulerHandle = null;
    }
  }

  private scheduleAhead(): void {
    const ctx = this.context;
    const melodyGain = this.melodyGain;
    if (!ctx || !melodyGain || !this.running) {
      return;
    }
    if (!this.melodyEnabled) {
      this.nextNoteTime = Math.max(this.nextNoteTime, ctx.currentTime);
      return;
    }
    try {
      const horizon = ctx.currentTime + LOOKAHEAD_S;
      while (this.nextNoteTime < horizon) {
        this.spawnNote(this.nextNoteTime, MELODY_HZ[this.melodyIndex % MELODY_HZ.length] ?? 261.63);
        this.nextNoteTime += MELODY_STEP_S;
        this.melodyIndex += 1;
      }
    } catch {
      /* skip this scheduler slice */
    }
  }

  private spawnNote(when: number, frequency: number): void {
    const ctx = this.context;
    const melodyGain = this.melodyGain;
    if (!ctx || !melodyGain) {
      return;
    }
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = frequency;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.22, when + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + NOTE_DURATION_S);
    osc.connect(amp);
    amp.connect(melodyGain);
    osc.start(when);
    osc.stop(when + NOTE_DURATION_S + 0.02);
    osc.onended = (): void => {
      try {
        osc.disconnect();
        amp.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  }

  private applyMasterGain(): void {
    try {
      const now = this.context?.currentTime ?? 0;
      this.masterGain?.gain.setTargetAtTime(this.muted ? 0 : 0.55, now, 0.04);
    } catch {
      /* ignore */
    }
  }

  private safeShutdown(): void {
    this.running = false;
    try {
      this.engineOsc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.noiseSource?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.engineOsc?.disconnect();
      this.engineGain?.disconnect();
      this.noiseSource?.disconnect();
      this.noiseGain?.disconnect();
      this.melodyGain?.disconnect();
      this.masterGain?.disconnect();
    } catch {
      /* ignore */
    }
    const ctx = this.context;
    this.engineOsc = null;
    this.engineGain = null;
    this.noiseSource = null;
    this.noiseGain = null;
    this.melodyGain = null;
    this.masterGain = null;
    this.context = null;
    this.melodyIndex = 0;
    if (ctx) {
      void ctx.close().catch(() => undefined);
    }
  }
}
