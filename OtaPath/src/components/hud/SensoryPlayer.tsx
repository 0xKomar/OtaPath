"use client";

/**
 * SensoryPlayer — persistent sensory dock → expandable full-screen
 * neuro-entrainment session.
 *
 *   Layer 1 · soundscape  — ElevenLabs via /api/generate-soundscape,
 *                           seamless Web Audio pad fallback.
 *   Layer 2 · entrainment — true stereo binaural beats + isochronic
 *                           pulse (uplift 10 Hz α / calm 6 Hz θ).
 *   Visual  · breathing halo at 6 breaths/min (4s in, 6s out),
 *             color temperature follows the patient state.
 *   Replay  · "My best moments" — guided journey back through the
 *             patient's own capsules (photo + voice + soundscape).
 */

import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Play, Pause, Waves, Heart, SkipForward, Music, Radio } from "lucide-react";
import { EntrainmentEngine, type EntrainmentMode } from "@/lib/entrainmentEngine";
import { AmbientPad } from "@/lib/ambientPad";
import { startMusicLoop, type MusicLoop } from "@/lib/musicLoop";
import { api } from "@/lib/api";
import { STYLE_BY_ID, type MusicStyleId } from "@/lib/musicTaste";
import { useOtaStore } from "@/store/useOtaStore";
import type { PatientState } from "@/lib/poi";
import { OtaButton } from "@/components/ui/OtaButton";
import { OtaDog } from "@/components/ui/OtaDog";
import { MusicTastePicker } from "./MusicTastePicker";

const HALO: Record<PatientState, { a: string; b: string }> = {
  LOW: { a: "#FFCE32", b: "#FF6B2B" }, // extra-warm solar cocoon
  MODERATE: { a: "#38BDF8", b: "#2563EB" }, // cool sky balance
  HIGH: { a: "#1E8E5A", b: "#FFCE32" }, // grounded forest + sun
};

const BREATH_CYCLE_S = 10; // 4s inhale + 6s exhale → 6 breaths/min

/** per-mode display + which bandit arm the session feeds */
const MODE_LABEL: Record<EntrainmentMode, { name: string; beat: string; arm: "alpha" | "theta" }> = {
  uplift: { name: "Uplift", beat: "10 Hz alpha session", arm: "alpha" },
  calm: { name: "Calm", beat: "6 Hz theta session", arm: "theta" },
  gamma: { name: "Focus", beat: "40 Hz gamma session", arm: "alpha" },
  iaf: { name: "Your rhythm", beat: "IAF-tuned alpha session", arm: "alpha" },
};
/** time source for session timers (never called during render) */
const nowMs = () => performance.now();

function breathPhase(t: number): { scale: number; label: string } {
  const ph = t % BREATH_CYCLE_S;
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  if (ph < 4) return { scale: 1 + 0.24 * ease(ph / 4), label: "breathe in" };
  return { scale: 1.24 - 0.24 * ease((ph - 4) / 6), label: "breathe out" };
}

export function SensoryPlayer() {
  const patientState = useOtaStore((s) => s.patientState);
  const memories = useOtaStore((s) => s.memories);
  const iafHz = useOtaStore((s) => s.iafHz);
  const musicStyle = useOtaStore((s) => s.preferredMusicStyle);
  const pushToast = useOtaStore((s) => s.pushToast);
  const expanded = useOtaStore((s) => s.sensoryOpen);
  const setExpanded = useOtaStore((s) => s.setSensoryOpen);
  const setPlayingGlobal = useOtaStore((s) => s.setSensoryPlaying);

  const [playing, setPlayingLocal] = useState(false);
  const setPlaying = (v: boolean) => {
    setPlayingLocal(v);
    setPlayingGlobal(v);
  };
  const [mode, setMode] = useState<EntrainmentMode>("uplift");
  const [source, setSource] = useState<"eleven" | "pad" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [replayIdx, setReplayIdx] = useState<number | null>(null);
  const [breath, setBreath] = useState("breathe in");
  const [musicVol, setMusicVol] = useState(0.75);
  const [pulseVol, setPulseVol] = useState(1);

  const ctxRef = useRef<AudioContext | null>(null);
  const entrainRef = useRef<EntrainmentEngine | null>(null);
  const padRef = useRef<AmbientPad | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const pulseGainRef = useRef<GainNode | null>(null);
  const loopRef = useRef<MusicLoop | null>(null);
  const replayAudioRef = useRef<HTMLAudioElement | null>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const replayTimerRef = useRef<number>(0);
  const t0Ref = useRef(0);

  const halo = HALO[patientState];

  /* ---------- session control ---------- */
  async function start() {
    const ctx = (ctxRef.current ??= new AudioContext());
    // resume() can stall (autoplay policy, iOS) — never let it block the
    // session; the graph stays valid while suspended and we retry on gesture.
    void ctx.resume().catch(() => {});
    entrainRef.current ??= new EntrainmentEngine();
    padRef.current ??= new AmbientPad();
    // two mix buses — Music Volume vs Brainwave Pulse, user-controlled
    musicGainRef.current ??= ctx.createGain();
    pulseGainRef.current ??= ctx.createGain();
    musicGainRef.current.gain.value = musicVol;
    pulseGainRef.current.gain.value = pulseVol;
    musicGainRef.current.connect(ctx.destination);
    pulseGainRef.current.connect(ctx.destination);
    entrainRef.current.start(ctx, mode, useOtaStore.getState().iafHz, pulseGainRef.current);
    t0Ref.current = nowMs();

    // Layer 1 — the patient's chosen vibe through the ElevenLabs engine
    try {
      const st = useOtaStore.getState();
      const last = [...st.memories].reverse()[0];
      const r = await api.generateSoundscape({
        musicStyle: st.preferredMusicStyle,
        memoryId: last?.id,
        energy: st.patientState,
        locationName: last?.poiName,
        themes: last?.themes,
        luminance: last?.luminance,
      });
      if (r) {
        loopRef.current?.stop();
        loopRef.current = await startMusicLoop(ctx, r.url, musicGainRef.current);
        setSource("eleven");
      } else {
        throw new Error("no-api");
      }
    } catch {
      padRef.current.start(ctx, mode, patientState);
      setSource("pad");
    }
    setPlaying(true);
    useOtaStore.getState().loopEvent("ACT", `${MODE_LABEL[mode].beat} session`);
  }

  function stop() {
    // sessions ≥15s count as a completed intervention → logged outcome
    // on both the entrainment arm and the music-style arm (Best lift)
    if ((nowMs() - t0Ref.current) / 1000 >= 15) {
      const st = useOtaStore.getState();
      st.recordOutcome(MODE_LABEL[mode].arm);
      st.recordOutcome(`m-${st.preferredMusicStyle}` as never);
    }
    entrainRef.current?.stop();
    padRef.current?.stop();
    loopRef.current?.stop();
    loopRef.current = null;
    stopReplay();
    setPlaying(false);
    setSource(null);
  }

  /* pick a new vibe — when a track is playing, regenerate + crossfade-swap */
  async function switchStyle(s: MusicStyleId) {
    useOtaStore.getState().setMusicStyle(s);
    if (!playing || source !== "eleven") return;
    const ctx = ctxRef.current;
    if (!ctx || !musicGainRef.current) return;
    try {
      const st = useOtaStore.getState();
      const last = [...st.memories].reverse()[0];
      const r = await api.generateSoundscape({
        musicStyle: s,
        memoryId: last?.id,
        energy: st.patientState,
        locationName: last?.poiName,
        themes: last?.themes,
        luminance: last?.luminance,
        force: true, // a deliberate vibe switch always asks for a fresh take
      });
      if (r) {
        const next = await startMusicLoop(ctx, r.url, musicGainRef.current);
        loopRef.current?.stop();
        loopRef.current = next;
      }
    } catch { /* keep the current track playing */ }
  }

  function switchMode(m: EntrainmentMode) {
    setMode(m);
    const ctx = ctxRef.current;
    if (playing && ctx) {
      entrainRef.current?.setMode(ctx, m, useOtaStore.getState().iafHz);
      if (padRef.current?.running) padRef.current.start(ctx, m, patientState);
    }
  }

  /* clinician retunes IAF mid-session → live binaural retune */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (playing && mode === "iaf" && ctx) entrainRef.current?.retune(ctx, iafHz);
  }, [iafHz, playing, mode]);

  /* ---------- gait-sync: step cadence nudges pulse + soundscape ---------- */
  const simRunning = useOtaStore((s) => s.simRunning);
  useEffect(() => {
    if (!playing) return;
    const ctx = ctxRef.current;
    const apply = (rate: number) => {
      if (ctx) entrainRef.current?.setRate(ctx, rate);
      loopRef.current?.setRate(Math.min(1.08, Math.max(0.95, rate)));
    };
    // simulated walk → brisk ~105 spm cadence
    if (simRunning) {
      apply(1.06);
      return () => apply(1);
    }
    // real accelerometer cadence → peak detection on |a|
    let lastPeak = 0;
    const intervals: number[] = [];
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const t = nowMs();
      if (mag > 11.5 && t - lastPeak > 280) {
        if (lastPeak > 0) {
          intervals.push(t - lastPeak);
          if (intervals.length > 6) intervals.shift();
          const mean = intervals.reduce((x, y) => x + y, 0) / intervals.length;
          const spm = 60000 / mean;
          apply(Math.min(1.08, Math.max(0.95, spm / 100)));
        }
        lastPeak = t;
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      apply(1);
    };
  }, [playing, simRunning]);

  /* ---------- "Replay my best moments" ---------- */
  const reel = memories.filter((m) => m.audioUrl || m.photoUrl || m.transcript);

  function advance(i: number) {
    setReplayIdx(i);
    playReelItem(i);
  }

  function startReplay() {
    if (reel.length === 0) {
      pushToast("Make your first memory — the reel will glow");
      return;
    }
    if (!playing) void start();
    advance(0);
  }

  function playReelItem(i: number) {
    replayAudioRef.current?.pause();
    replayAudioRef.current = null;
    window.clearTimeout(replayTimerRef.current);
    const m = reel[i];
    if (!m) {
      setReplayIdx(null);
      return;
    }
    if (m.audioUrl) {
      const a = new Audio(m.audioUrl);
      a.volume = 0.9;
      replayAudioRef.current = a;
      a.onended = () => advance(i + 1);
      void a.play().catch(() => advance(i + 1));
    } else {
      replayTimerRef.current = window.setTimeout(() => advance(i + 1), 6000);
    }
  }

  function stopReplay() {
    replayAudioRef.current?.pause();
    replayAudioRef.current = null;
    window.clearTimeout(replayTimerRef.current);
    setReplayIdx(null);
  }

  /* ---------- timers ---------- */
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setElapsed(nowMs() - t0Ref.current), 500);
    return () => window.clearInterval(id);
  }, [playing]);

  // if the context is still suspended, any user gesture retries resume
  useEffect(() => {
    if (!playing) return;
    const kick = () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", kick);
    return () => document.removeEventListener("pointerdown", kick);
  }, [playing]);

  // breathing halo — direct DOM updates, re-render only on label change
  useEffect(() => {
    if (!expanded) return;
    let raf = 0;
    let lastLabel = "";
    const loop = () => {
      const t = (nowMs() - t0Ref.current) / 1000;
      const { scale, label } = breathPhase(t);
      if (haloRef.current)
        haloRef.current.style.transform = `scale(${scale.toFixed(3)})`;
      // SunBlob physically breathes with the pacer — subtler swell
      if (sunRef.current)
        sunRef.current.style.transform = `scale(${(1 + (scale - 1) * 0.55).toFixed(3)})`;
      if (label !== lastLabel) {
        lastLabel = label;
        setBreath(label);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [expanded]);

  // unmount cleanup
  useEffect(
    () => () => {
      entrainRef.current?.stop();
      padRef.current?.stop();
      loopRef.current?.stop();
      replayAudioRef.current?.pause();
      window.clearTimeout(replayTimerRef.current);
    },
    []
  );

  const replayItem = replayIdx != null ? reel[replayIdx] : null;

  /* ---------- full-screen session ---------- */
  if (expanded)
    return (
      <div className="toast-in absolute inset-0 z-[1350] flex flex-col bg-cream/97">
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="rounded-full bg-solar/60 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-charcoal/70">
            Sensory session ·{" "}
            {mode === "uplift"
              ? "10 Hz α"
              : mode === "calm"
                ? "6 Hz θ"
                : mode === "gamma"
                  ? "40 Hz γ"
                  : `${iafHz.toFixed(1)} Hz α · IAF`}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Collapse"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-butter transition-transform active:scale-90"
          >
            <ChevronDown className="h-5 w-5 text-ink-charcoal" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
          {replayItem ? (
            /* ---- memory replay ---- */
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-tangerine">
                Best moments · {replayIdx! + 1} / {reel.length}
              </p>
              {replayItem.photoUrl && (
                <div className="card-tactile w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={replayItem.photoUrl}
                    alt="A bright moment"
                    className="h-44 w-full object-cover"
                  />
                </div>
              )}
              {replayItem.transcript && (
                <p className="font-display text-lg italic leading-snug text-ink-charcoal/85">
                  “{replayItem.transcript}”
                </p>
              )}
              <p className="font-sans text-xs font-bold text-ink-charcoal/45">
                {replayItem.poiName}
              </p>
              <button
                type="button"
                onClick={() => advance((replayIdx ?? 0) + 1)}
                className="flex items-center gap-1.5 font-sans text-sm font-bold text-ink-charcoal/50"
              >
                <SkipForward className="h-4 w-4" strokeWidth={2.5} /> next moment
              </button>
            </div>
          ) : (
            /* ---- breathing halo ---- */
            <div className="flex flex-col items-center gap-5">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <div
                  ref={haloRef}
                  className="absolute inset-0 flex items-center justify-center will-change-transform"
                >
                  <div
                    className="absolute h-64 w-64 rounded-full"
                    style={{ background: halo.a, opacity: 0.14 }}
                  />
                  <div
                    className="absolute h-48 w-48 rounded-full"
                    style={{ background: halo.a, opacity: 0.22 }}
                  />
                  <div
                    className="absolute h-32 w-32 rounded-full"
                    style={{ background: halo.b, opacity: 0.3 }}
                  />
                </div>
                <div ref={sunRef} className="will-change-transform">
                  <OtaDog state={playing ? "idle" : "static"} size={112} />
                </div>
              </div>
              <p className="font-display text-2xl font-semibold italic text-ink-charcoal/75">
                {breath}…
              </p>
            </div>
          )}

          {/* controls */}
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <div className="grid w-full grid-cols-2 gap-1.5 rounded-3xl bg-butter p-1.5">
              {(["uplift", "calm", "iaf", "gamma"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`rounded-full px-3 py-2.5 font-sans text-xs font-bold transition-all active:scale-95 ${
                    mode === m ? "bg-tangerine text-cream" : "text-ink-charcoal/55"
                  }`}
                >
                  {m === "uplift" && "Uplift · 10 Hz α"}
                  {m === "calm" && "Calm · 6 Hz θ"}
                  {m === "iaf" && `Your rhythm · ${iafHz.toFixed(1)} Hz`}
                  {m === "gamma" && "Focus · 40 Hz γ"}
                </button>
              ))}
            </div>

            {/* the patient's vibe — regenerates the track live mid-session */}
            {replayIdx == null && (
              <div className="w-full">
                <p className="mb-1.5 flex items-center justify-center gap-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-charcoal/40">
                  <Music className="h-3 w-3" strokeWidth={2.75} />
                  your soundtrack · ElevenLabs
                </p>
                <MusicTastePicker compact onPick={switchStyle} />
              </div>
            )}

            {/* mix bus — Music vs Brainwave pulse */}
            {playing && (
              <div className="flex w-full items-center gap-3 rounded-2xl bg-butter/60 px-3 py-2">
                <label className="flex flex-1 items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 shrink-0 text-ink-charcoal/45" strokeWidth={2.5} />
                  <input
                    type="range" min={0} max={1} step={0.01} value={musicVol}
                    aria-label="Music volume"
                    onChange={(e) => {
                      const v = +e.target.value;
                      setMusicVol(v);
                      const ctx = ctxRef.current;
                      if (ctx && musicGainRef.current)
                        musicGainRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
                    }}
                    className="w-full accent-tangerine"
                  />
                </label>
                <label className="flex flex-1 items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 shrink-0 text-ink-charcoal/45" strokeWidth={2.5} />
                  <input
                    type="range" min={0} max={1} step={0.01} value={pulseVol}
                    aria-label="Brainwave pulse"
                    onChange={(e) => {
                      const v = +e.target.value;
                      setPulseVol(v);
                      const ctx = ctxRef.current;
                      if (ctx && pulseGainRef.current)
                        pulseGainRef.current.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
                    }}
                    className="w-full accent-forest"
                  />
                </label>
              </div>
            )}

            <div className="flex items-center gap-3">
              <OtaButton
                size="sm"
                variant={playing ? "paper" : "tangerine"}
                onClick={playing ? stop : start}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing
                  ? `Rest · ${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}`
                  : "Begin session"}
              </OtaButton>
              {replayIdx == null && (
                <OtaButton size="sm" variant="forest" onClick={startReplay}>
                  <Heart className="h-4 w-4" strokeWidth={2.75} />
                  Replay my best moments
                </OtaButton>
              )}
            </div>

            <p className="flex items-center gap-1.5 font-sans text-[11px] font-bold text-ink-charcoal/40">
              <Waves className="h-3 w-3" strokeWidth={2.75} />
              {source === "eleven"
                ? `${STYLE_BY_ID[musicStyle].tag} · ElevenLabs`
                : source === "pad"
                  ? "soundscape · woven on device"
                  : "press begin — sound + light therapy"}
            </p>
          </div>
        </div>
      </div>
    );

  /* ---------- persistent bottom dock ---------- */
  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="absolute inset-x-0 bottom-0 z-[1050] hidden h-[54px] items-center gap-3 border-t-[3px] border-stone-900/10 bg-cream px-3 text-left"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-solar">
        {playing ? (
          <span className="flex items-end gap-[3px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[3px] animate-pulse rounded-full bg-ink-charcoal"
                style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 160}ms` }}
              />
            ))}
          </span>
        ) : (
          <Play className="h-4 w-4 text-ink-charcoal" strokeWidth={2.75} />
        )}
      </span>
      <span className="flex-1">
        <span className="block font-sans text-[13px] font-bold leading-tight">
          {playing ? "Session playing" : "Sensory session"}
        </span>
        <span className="block font-sans text-[11px] font-medium text-ink-charcoal/50">
          {MODE_LABEL[mode].name.toLowerCase()}
          {mode === "iaf" ? ` · ${iafHz.toFixed(1)} Hz` : mode === "gamma" ? " · 40 Hz gamma" : mode === "uplift" ? " · 10 Hz alpha" : " · 6 Hz theta"}
          {source === "pad" && " · on-device"}
        </span>
      </span>
      <ChevronUp className="h-4 w-4 text-ink-charcoal/45" strokeWidth={2.75} />
    </button>
  );
}
