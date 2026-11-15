/**
 * ambientPad.ts — on-device fallback soundscape.
 * When ElevenLabs isn't reachable we still weave a lush pad: a slowly
 * breathing chord cluster (detuned sines through a lowpass) + a warm
 * filtered pink-noise texture + a soft sparkle arpeggio. Mood-aware:
 * uplift = brighter major add9, calm = warmer, lower voicing.
 */

import type { EntrainmentMode } from "./entrainmentEngine";
import type { PatientState } from "@/lib/poi";

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

const f = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// chords in midi notes — warm Cmaj-add9 family, voiced low→high
const VOICINGS: Record<PatientState, Record<EntrainmentMode, number[]>> = {
  LOW:      { uplift: [48, 55, 62, 66, 74], calm: [36, 48, 55, 60, 67],
              gamma: [55, 62, 66, 71, 78], iaf: [43, 55, 60, 66, 71] },
  MODERATE: { uplift: [48, 55, 62, 67, 74], calm: [41, 48, 55, 62, 69],
              gamma: [55, 62, 67, 71, 79], iaf: [43, 55, 62, 67, 72] },
  HIGH:     { uplift: [50, 57, 62, 66, 74], calm: [38, 50, 57, 62, 69],
              gamma: [57, 62, 66, 74, 78], iaf: [45, 57, 62, 69, 74] },
};

export class AmbientPad {
  private nodes: AudioScheduledSourceNode[] = [];
  private master?: GainNode;
  private arpTimer?: number;
  private ctx?: AudioContext;
  running = false;

  start(ctx: AudioContext, mode: EntrainmentMode, state: PatientState) {
    this.stop();
    this.ctx = ctx;
    const chord = VOICINGS[state][mode];

    const master = ctx.createGain();
    master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = mode === "calm" ? 640 : mode === "gamma" ? 1400 : 1100;
    lp.Q.value = 0.4;
    master.connect(lp).connect(ctx.destination);
    master.gain.setTargetAtTime(0.09, ctx.currentTime, 2.2); // slow bloom
    this.master = master;

    // chord cluster — each note 2 detuned sines, slow per-note LFO drift
    for (const midi of chord) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f(midi);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = 0.16 / chord.length;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.08;
        const lg = ctx.createGain();
        lg.gain.value = 0.03 / chord.length;
        lfo.connect(lg).connect(g.gain);
        lfo.start();
        o.connect(g).connect(master);
        o.start();
        this.nodes.push(o, lfo);
      }
    }

    // warm noise texture — pink noise → band-limited "air"
    const noise = ctx.createBufferSource();
    noise.buffer = pinkNoiseBuffer(ctx);
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = mode === "calm" ? 420 : mode === "gamma" ? 1100 : 800;
    nf.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.value = 0.16;
    noise.connect(nf).connect(ng).connect(master);
    noise.start();
    this.nodes.push(noise);

    // sparse sparkle — a high note every ~5s, soft attack
    const sparkle = () => {
      if (!this.running || !this.master) return;
      const o = ctx.createOscillator();
      o.type = "sine";
      const top = chord[chord.length - 1];
      o.frequency.value = f(top + 12 * (Math.random() < 0.4 ? 1 : 0) + (Math.random() < 0.5 ? 7 : 0));
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g).connect(this.master);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.start(t);
      o.stop(t + 4.2);
    };
    this.arpTimer = window.setInterval(sparkle, 5200);
    this.running = true;
  }

  stop() {
    window.clearInterval(this.arpTimer);
    try {
      this.master?.gain.setTargetAtTime(0, 0, 0.25);
      const srcs = this.nodes, master = this.master;
      setTimeout(() => {
        srcs.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
        try { master?.disconnect(); } catch { /* noop */ }
      }, 900);
    } catch { /* noop */ }
    this.nodes = [];
    this.master = undefined;
    this.running = false;
  }
}
