/**
 * useVoiceAnalyzer.ts — real-time acoustic biomarker extraction.
 *
 * Mic → AudioContext/AnalyserNode → per-frame features:
 *   · RMS amplitude         → vocal energy (flat/quiet speech marker)
 *   · zero-crossing pitch   → pitch variance (monotone vs expressive)
 *   · spectral centroid     → brightness spread (prosody marker)
 *   · voiced-frame ratio    → speech-to-pause (psychomotor slowing)
 * MediaRecorder captures the take in parallel; Web Speech
 * SpeechRecognition streams a live transcript when supported.
 * All numbers stay on-device until the caller POSTs them.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface AcousticMetrics {
  durationS: number;
  /** 0–100 — mean RMS of voiced frames */
  energy: number;
  /** 0–100 — pitch-variance + spectral-centroid spread composite */
  prosody: number;
  /** 0–1 — voiced frames / total frames */
  speechRatio: number;
  voicedFrames: number;
  totalFrames: number;
  /** median fundamental frequency across voiced frames (autocorrelation), Hz */
  f0Hz: number;
  /** standard deviation of F0 across voiced frames — the monotone-speech marker */
  f0SdHz: number;
  /** ms between record-start and the first voiced syllable — initiation latency */
  initiationMs: number;
  /** ms spent inside silent pauses longer than 250 ms */
  pauseMs: number;
  /** vocal level in dB above the ambient noise floor */
  levelDb: number;
}

export interface VoiceTake {
  blob: Blob;
  url: string;
  durationS: number;
}

export interface VoiceResult {
  take: VoiceTake | null;
  metrics: AcousticMetrics;
  transcript: string;
}

interface Frame {
  rms: number;
  zcr: number;
  centroid: number;
  /** autocorrelation pitch estimate for this frame, Hz (null = unvoiced/silent) */
  f0: number | null;
}

const VOICED_RMS = 0.014;
const PAUSE_MIN_MS = 250;

/**
 * Autocorrelation F0 estimator (YIN-lite): scan lags spanning the human
 * voice range (≈60–400 Hz) on the time-domain window and take the lag
 * with the strongest normalized correlation. Returns null when the frame
 * lacks a clear periodic structure (noise, fricatives, silence).
 */
function detectF0(td: Uint8Array, sampleRate: number): number | null {
  const n = td.length;
  const buf = new Float32Array(n);
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const v = (td[i] - 128) / 128;
    buf[i] = v;
    energy += v * v;
  }
  if (energy / n < VOICED_RMS * VOICED_RMS) return null;

  const minLag = Math.floor(sampleRate / 400); // highest expected F0
  const maxLag = Math.min(Math.floor(sampleRate / 60), n - 2); // lowest
  let bestLag = -1;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i < n - lag; i += 2) {
      corr += buf[i] * buf[i + lag];
      norm += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    const c = norm > 0 ? (2 * corr) / norm : 0;
    if (c > bestCorr) {
      bestCorr = c;
      bestLag = lag;
    }
  }
  // require a solid periodic peak — below this the frame isn't voiced
  if (bestLag < 0 || bestCorr < 0.35) return null;
  // parabolic refinement around the best lag for sub-sample precision
  const lagCorr = (lag: number) => {
    let corr = 0, norm = 0;
    for (let i = 0; i < n - lag; i += 2) {
      corr += buf[i] * buf[i + lag];
      norm += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    return norm > 0 ? (2 * corr) / norm : 0;
  };
  const prev = bestLag > minLag ? lagCorr(bestLag - 1) : 0;
  const next = bestLag < maxLag ? lagCorr(bestLag + 1) : 0;
  const denom = prev - 2 * bestCorr + next;
  const shift = denom !== 0 ? 0.5 * (prev - next) / denom : 0;
  const f0 = sampleRate / (bestLag + shift);
  return f0 >= 55 && f0 <= 500 ? f0 : null;
}

/* --- minimal Web Speech typings (not in lib.dom yet) --------------- */
interface SRResultItem { transcript: string }
interface SRResult { isFinal: boolean; 0: SRResultItem }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SRCtor = new () => SpeechRec;

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
/** time source for recorder/analyser callbacks (never called during render) */
const nowMs = () => performance.now();

export function useVoiceAnalyzer() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const sttSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor })
        .SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition
    );

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const srRef = useRef<SpeechRec | null>(null);
  const rafRef = useRef(0);
  const t0Ref = useRef(0);
  const framesRef = useRef<Frame[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const timeDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const transcriptRef = useRef("");
  const firstVoicedAtRef = useRef<number | null>(null);
  const resolveRef = useRef<((r: VoiceResult) => void) | null>(null);

  /** copy current time-domain samples into `out` (for the wave canvas) */
  const waveInto = useCallback((out: Uint8Array) => {
    const a = analyserRef.current;
    const src = timeDataRef.current;
    if (!a || !src) {
      out.fill(128);
      return;
    }
    a.getByteTimeDomainData(src);
    const step = Math.max(1, Math.floor(src.length / out.length));
    for (let i = 0; i < out.length; i++) out[i] = src[i * step];
  }, []);

  async function start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // ~46 ms window — enough for ACF down to 60 Hz
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      timeDataRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      freqDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      framesRef.current = [];
      transcriptRef.current = "";
      firstVoicedAtRef.current = null;
      setLiveTranscript("");

      // --- per-frame acoustic features ---
      t0Ref.current = nowMs();
      const loop = () => {
        const td = timeDataRef.current!;
        const fd = freqDataRef.current!;
        analyser.getByteTimeDomainData(td);
        analyser.getByteFrequencyData(fd);

        let sum = 0, crossings = 0;
        let prev = td[0] - 128;
        for (let i = 1; i < td.length; i++) {
          const v = td[i] - 128;
          sum += v * v;
          if ((prev < 0 && v >= 0) || (prev >= 0 && v < 0)) crossings++;
          prev = v;
        }
        const rms = Math.sqrt(sum / td.length);
        const zcr = crossings / td.length;

        let num = 0, den = 0;
        for (let i = 1; i < fd.length; i++) {
          num += i * fd[i];
          den += fd[i];
        }
        const binHz = ctx.sampleRate / analyser.fftSize;
        const centroid = den > 0 ? (num / den) * binHz : 0;

        const voiced = rms > VOICED_RMS;
        const f0 = voiced ? detectF0(td, ctx.sampleRate) : null;
        if (voiced && firstVoicedAtRef.current === null)
          firstVoicedAtRef.current = nowMs() - t0Ref.current;

        framesRef.current.push({ rms, zcr, centroid, f0 });
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      // --- MediaRecorder take ---
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => finish();

      // --- SpeechRecognition in parallel ---
      const Ctor =
        (window as unknown as { SpeechRecognition?: SRCtor }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: SRCtor }).webkitSpeechRecognition;
      if (Ctor) {
        const sr = new Ctor();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = "en-US";
        sr.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) transcriptRef.current += r[0].transcript + " ";
            else interim += r[0].transcript;
          }
          setLiveTranscript((transcriptRef.current + interim).trim());
        };
        sr.onend = null;
        try {
          sr.start();
        } catch {
          /* recognition refused — transcript box still works */
        }
        srRef.current = sr;
      }

      rec.start(250);
      setElapsed(0);
      setMicError(false);
      setRecording(true);
      return true;
    } catch {
      setMicError(true);
      return false;
    }
  }

  function computeMetrics(): AcousticMetrics {
    const frames = framesRef.current;
    const durationS = (nowMs() - t0Ref.current) / 1000;
    const empty: AcousticMetrics = {
      durationS, energy: 0, prosody: 0, speechRatio: 0,
      voicedFrames: 0, totalFrames: frames.length,
      f0Hz: 0, f0SdHz: 0, initiationMs: Math.round(durationS * 1000),
      pauseMs: 0, levelDb: 0,
    };
    if (frames.length === 0) return empty;

    const voiced = frames.filter((f) => f.rms > VOICED_RMS);
    const energy = clamp((voiced.reduce((a, f) => a + f.rms, 0) / Math.max(1, voiced.length)) * 420);

    // noise floor: 10th-percentile RMS — level in dB above it
    const sorted = [...frames.map((f) => f.rms)].sort((a, b) => a - b);
    const floor = Math.max(1e-4, sorted[Math.floor(sorted.length * 0.1)]);
    const meanVoicedRms = voiced.length
      ? voiced.reduce((a, f) => a + f.rms, 0) / voiced.length
      : floor;
    const levelDb = Math.round(20 * Math.log10(meanVoicedRms / floor) * 10) / 10;

    // real ACF pitch stats across voiced frames
    const f0s = voiced.map((f) => f.f0).filter((v): v is number => v !== null);
    const cents = voiced.map((f) => f.centroid);
    const sd = (xs: number[]) => {
      if (xs.length < 2) return 0;
      const m = xs.reduce((a, b) => a + b) / xs.length;
      return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length);
    };
    const f0Sorted = [...f0s].sort((a, b) => a - b);
    const f0Hz = f0Sorted.length ? f0Sorted[Math.floor(f0Sorted.length / 2)] : 0;
    const f0SdHz = Math.round(sd(f0s) * 10) / 10;
    // prosody: real F0 variance (expressive ≳25 Hz SD) + spectral spread
    const pitchVarScore = clamp((f0SdHz - 8) * 3);
    const centroidSpread = clamp((sd(cents) - 180) / 9);
    const prosody = Math.round(clamp(0.5 * pitchVarScore + 0.5 * centroidSpread));

    // pauses: total ms inside silent runs longer than 250 ms
    const frameMs = (durationS * 1000) / frames.length;
    const minPauseFrames = Math.ceil(PAUSE_MIN_MS / frameMs);
    let pauseMs = 0;
    let run = 0;
    for (const f of frames) {
      if (f.rms <= VOICED_RMS) run++;
      else {
        if (run >= minPauseFrames) pauseMs += run * frameMs;
        run = 0;
      }
    }
    if (run >= minPauseFrames) pauseMs += run * frameMs;

    return {
      durationS,
      energy: Math.round(energy),
      prosody,
      speechRatio: +(voiced.length / frames.length).toFixed(2),
      voicedFrames: voiced.length,
      totalFrames: frames.length,
      f0Hz: Math.round(f0Hz),
      f0SdHz,
      initiationMs: Math.round(firstVoicedAtRef.current ?? durationS * 1000),
      pauseMs: Math.round(pauseMs),
      levelDb,
    };
  }

  function finish() {
    const blob = new Blob(chunksRef.current, { type: recRef.current?.mimeType || "audio/webm" });
    const durationS = (nowMs() - t0Ref.current) / 1000;
    resolveRef.current?.({
      take: blob.size ? { blob, url: URL.createObjectURL(blob), durationS } : null,
      metrics: computeMetrics(),
      transcript: transcriptRef.current.trim(),
    });
  }

  function stop(): Promise<VoiceResult> {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      cancelAnimationFrame(rafRef.current);
      try {
        srRef.current?.stop();
      } catch { /* noop */ }
      srRef.current = null;
      if (recRef.current?.state !== "inactive") recRef.current?.stop();
      else resolve({ take: null, metrics: computeMetrics(), transcript: transcriptRef.current.trim() });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
      streamRef.current = null;
      ctxRef.current = null;
      setRecording(false);
    });
  }

  // elapsed ticker
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((nowMs() - t0Ref.current) / 1000), 150);
    return () => clearInterval(id);
  }, [recording]);

  // unmount cleanup
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      try { srRef.current?.stop(); } catch { /* noop */ }
      if (recRef.current?.state !== "inactive") recRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close();
    },
    []
  );

  return { recording, elapsed, micError, sttSupported, liveTranscript, start, stop, waveInto };
}
