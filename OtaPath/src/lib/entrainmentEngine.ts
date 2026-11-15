/**
 * entrainmentEngine.ts — real-time brainwave entrainment layer.
 * True stereo binaural beats (L/R panned sine oscillators) + subtle
 * isochronic pulse (LFO on the carrier gain) + soft pink-noise bed.
 *
 *   uplift → Alpha 10 Hz          (200 Hz L / 210 Hz R)
 *   calm   → Theta 6 Hz           (180 Hz L / 186 Hz R)
 *   gamma  → 40 Hz focus          (220 Hz L / 260 Hz R)
 *   iaf    → patient's Individual Alpha Frequency, tuned at discharge
 *            and adjustable by the clinician (8–12.5 Hz)
 */

export type EntrainmentMode = "uplift" | "calm" | "gamma" | "iaf";

interface ModeSpec { l: number; r: number; beat: number; level: number; noise: number }

const MODES: Record<Exclude<EntrainmentMode, "iaf">, ModeSpec> = {
  uplift: { l: 200, r: 210, beat: 10, level: 0.045, noise: 0.0 },
  calm: { l: 180, r: 186, beat: 6, level: 0.05, noise: 0.012 },
  gamma: { l: 220, r: 260, beat: 40, level: 0.03, noise: 0.0 },
};

/** build the spec — "iaf" derives its beat from the patient's stored IAF */
function specFor(mode: EntrainmentMode, iafHz: number): ModeSpec {
  if (mode !== "iaf") return MODES[mode];
  const beat = Math.min(12.5, Math.max(8, iafHz));
  return { l: 200, r: 200 + beat, beat, level: 0.045, noise: 0.006 };
}

/** precomputed pink-noise buffer (Paul Kellet's filter) */
function pinkNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

export class EntrainmentEngine {
  private nodes: {
    oscL?: OscillatorNode;
    oscR?: OscillatorNode;
    lfo?: OscillatorNode;
    noise?: AudioBufferSourceNode;
    master?: GainNode;
  } = {};
  private mode: EntrainmentMode = "uplift";
  private iaf = 10;
  /** gait-sync playback multiplier, 0.95–1.08 — nudges the pulse tempo */
  private rate = 1;
  /** output node — lets a caller mix the pulse under its own gain */
  private dest?: AudioNode;

  running = false;

  start(ctx: AudioContext, mode: EntrainmentMode, iafHz = 10, dest?: AudioNode) {
    this.stop();
    this.mode = mode;
    this.iaf = iafHz;
    this.dest = dest ?? this.dest; // internal restarts keep the mix routing
    const m = specFor(mode, iafHz);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(this.dest ?? ctx.destination);
    master.gain.setTargetAtTime(m.level, ctx.currentTime, 1.2); // 1.2s fade-in

    // binaural pair — hard-panned sines, beat = R − L (× gait-sync rate)
    const mk = (freq: number, pan: number) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * this.rate;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(p).connect(master);
      o.start();
      return o;
    };
    const oscL = mk(m.l, -1);
    const oscR = mk(m.r, +1);

    // isochronic pulse — subtle amplitude modulation at the beat rate
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = m.beat * this.rate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = m.level * 0.16; // ±16% shimmer, kept gentle
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();

    // pink-noise bed (calm mode — soft grounding texture)
    let noise: AudioBufferSourceNode | undefined;
    if (m.noise > 0) {
      noise = ctx.createBufferSource();
      noise.buffer = pinkNoiseBuffer(ctx);
      noise.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.value = 900;
      const ng = ctx.createGain();
      ng.gain.value = m.noise;
      noise.connect(nf).connect(ng).connect(this.dest ?? ctx.destination);
      noise.start();
    }

    this.nodes = { oscL, oscR, lfo, noise, master };
    this.running = true;
  }

  setMode(ctx: AudioContext, mode: EntrainmentMode, iafHz = this.iaf) {
    if (!this.running) return;
    this.start(ctx, mode, iafHz);
  }

  /** retune the running binaural pair to a new IAF (clinician slider) */
  retune(ctx: AudioContext, iafHz: number) {
    this.iaf = iafHz;
    if (this.running && this.mode === "iaf") this.start(ctx, "iaf", iafHz);
  }

  /**
   * Gait-sync: nudge carrier + pulse frequencies by step cadence.
   * `rate` is clamped to 0.95–1.08 and glides, never jumps.
   */
  setRate(ctx: AudioContext, rate: number) {
    const r = Math.min(1.08, Math.max(0.95, rate));
    if (Math.abs(r - this.rate) < 0.005) return;
    const prev = this.rate;
    this.rate = r;
    const n = this.nodes;
    const t = ctx.currentTime;
    try {
      const m = specFor(this.mode, this.iaf);
      n.oscL?.frequency.setTargetAtTime(m.l * r, t, 0.4);
      n.oscR?.frequency.setTargetAtTime(m.r * r, t, 0.4);
      n.lfo?.frequency.setTargetAtTime(m.beat * r, t, 0.4);
    } catch {
      this.rate = prev;
    }
  }

  getRate() {
    return this.rate;
  }

  stop() {
    const n = this.nodes;
    try {
      n.master?.gain.setTargetAtTime(0, 0, 0.08);
      const killers = [n.oscL, n.oscR, n.lfo, n.noise];
      setTimeout(() => killers.forEach((k) => { try { k?.stop(); } catch { /* noop */ } }), 250);
      setTimeout(() => { try { n.master?.disconnect(); } catch { /* noop */ } }, 300);
    } catch { /* noop */ }
    this.nodes = {};
    this.running = false;
  }
}
