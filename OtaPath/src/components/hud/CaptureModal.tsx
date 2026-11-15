"use client";

/**
 * CaptureModal — the soothing full-screen Memory Capture flow.
 * Three gentle steps designed for <20 seconds:
 *   1 · snap a photo        → hidden luminance + vibrancy biomarkers
 *   2 · 10s voice journal   → live wave + acoustic prosody + transcript
 *   3 · tuck it away        → /api/analyze-entry → amber capsule pin
 * Everything is skippable — the moment still counts.
 */

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Square, X, Music, Check } from "lucide-react";
import { analyzeImageMood, photoToDataUrl, type ImageMood } from "@/lib/analyzeImageMood";
import { useVoiceAnalyzer, type AcousticMetrics, type VoiceTake } from "@/lib/useVoiceAnalyzer";
import { useOtaStore } from "@/store/useOtaStore";
import { toDataUrl } from "@/lib/api";
import { OtaButton } from "@/components/ui/OtaButton";
import { OtaDog } from "@/components/ui/OtaDog";

const MAX_VOICE_S = 10;

interface Analysis {
  savoringScore: number;
  valence: number;
  themes: string[];
  soundscapePrompt: string;
  source: "openai" | "heuristic";
}

/* organic mirrored-ribbon wave, fed by the analyser each frame */
function Wave({ waveInto, active }: {
  waveInto: (out: Uint8Array) => void;
  active: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef(new Uint8Array(96));

  useEffect(() => {
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 0.016;
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const W = canvas.width, H = canvas.height, mid = H / 2;
        waveInto(dataRef.current);
        ctx.clearRect(0, 0, W, H);
        const data = dataRef.current;
        const step = W / (data.length - 1);

        // two ribbons: tangerine front, solar halo behind
        for (const [fill, amp, drift] of [
          ["rgba(255,206,50,0.45)", 0.75, 0.9],
          ["rgba(255,107,43,0.9)", 1, 1],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(0, mid);
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            const idle = active ? 0 : 0.08 * Math.sin(t * 2 + i * 0.3);
            ctx.lineTo(i * step, mid + (v * amp + idle) * (H * 0.42) * drift);
          }
          for (let i = data.length - 1; i >= 0; i--) {
            const v = (data[i] - 128) / 128;
            ctx.lineTo(i * step, mid - (v * amp) * (H * 0.42) * drift * 0.7);
          }
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [waveInto, active]);

  return <canvas ref={ref} width={640} height={72} className="h-[72px] w-full" aria-hidden />;
}

export function CaptureModal() {
  const close = useOtaStore((s) => s.closeCapture);
  const saveMemory = useOtaStore((s) => s.saveMemory);
  const mission = useOtaStore((s) => s.activeMission);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(
    () => useOtaStore.getState().captureStep
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mood, setMood] = useState<ImageMood | null>(null);
  const [take, setTake] = useState<VoiceTake | null>(null);
  const [metrics, setMetrics] = useState<AcousticMetrics | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  const voice = useVoiceAnalyzer();

  /* --- step 1: photo --- */
  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setPhotoUrl(await photoToDataUrl(f));
    setMood(await analyzeImageMood(f));
  }

  /* --- step 2: voice journal (auto-stops at 10s) --- */
  useEffect(() => {
    if (voice.recording && voice.elapsed >= MAX_VOICE_S) {
      void stopVoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.elapsed, voice.recording]);

  async function stopVoice() {
    const r = await voice.stop();
    setTake(r.take);
    setMetrics(r.metrics);
    if (r.transcript) setTranscript((t) => (t.trim() ? t : r.transcript));
  }

  /* --- step 3: analyze + save --- */
  async function finish() {
    setStep(4);
    const imageMetrics = mood
      ? { luminance: mood.luminance, vibrancy: mood.vibrancy }
      : undefined;
    let analysis: Analysis;
    try {
      const res = await fetch("/api/analyze-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          acousticMetrics: metrics ?? undefined,
          imageMetrics,
          poiName: mission?.poiName,
        }),
      });
      analysis = (await res.json()) as Analysis;
    } catch {
      analysis = {
        savoringScore: Math.min(100, Math.round(transcript.split(/\s+/).filter(Boolean).length * 6 + 30)),
        valence: 0.2,
        themes: ["moment"],
        soundscapePrompt: "Gentle ambient piece, ~72 BPM",
        source: "heuristic",
      };
    }
    setResult(analysis);
    const acousticScore = metrics
      ? Math.round(metrics.energy * 0.45 + metrics.prosody * 0.4 + metrics.speechRatio * 15)
      : undefined;
    // acoustic delta vs the discharge-day baseline (−100…+100)
    const baseline = useOtaStore.getState().baseline;
    const acousticDelta =
      metrics && baseline
        ? Math.round(
            Math.max(
              -100,
              Math.min(
                100,
                (metrics.prosody - baseline.prosody) +
                  (metrics.energy - 50) * 0.3 +
                  (metrics.speechRatio - 0.5) * 40
              )
            )
          )
        : undefined;
    // persist the voice take as a data URL so it replays after refresh
    const audioUrl = take ? await toDataUrl(take.url) : undefined;
    saveMemory({
      kind: photoUrl ? "photo" : take ? "voice" : "moment",
      photoUrl: photoUrl ?? undefined,
      audioUrl,
      audioDurS: take?.durationS,
      transcript: transcript.trim() || undefined,
      luminance: mood?.luminance,
      vibrancy: mood?.vibrancy,
      palette: mood?.palette,
      acousticScore,
      f0Hz: metrics?.f0Hz || undefined,
      f0SdHz: metrics?.f0SdHz || undefined,
      acousticDelta,
      savoringScore: analysis.savoringScore,
      valence: analysis.valence,
      themes: analysis.themes,
      soundscapePrompt: analysis.soundscapePrompt,
    });
  }

  const steps = ["snap", "whisper", "tuck away"];

  return (
    <div className="toast-in absolute inset-0 z-[1400] flex flex-col bg-cream/97 backdrop-blur-none">
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                step > i ? "w-7 bg-tangerine" : "w-4 bg-butter"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-butter transition-transform active:scale-90"
        >
          <X className="h-5 w-5 text-ink-charcoal" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 overflow-y-auto px-6 pb-8">
        {step === 1 && (
          <>
            <div>
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-tangerine">
                Step 1 · the hunt
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                Snap <em className="display-italic">one vivid thing</em>
              </h2>
              <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/55">
                at {mission?.poiName ?? "this quiet spot"} — {mission?.photoPrompt ?? "whatever caught your eye"}
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            {photoUrl ? (
              <div className="card-tactile overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Captured moment" className="h-52 w-full object-cover" />
                <div className="flex items-center gap-2 bg-butter px-4 py-3">
                  <span className="rounded-full bg-forest px-3 py-1 font-sans text-xs font-bold text-cream">
                    {mood ? mood.feedback : "Reading the colors…"}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="ml-auto font-sans text-xs font-bold text-ink-charcoal/55 underline underline-offset-2"
                  >
                    retake
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="card-tactile flex h-52 w-full flex-col items-center justify-center gap-3 bg-butter transition-transform active:scale-[0.98]"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tangerine">
                  <Camera className="h-7 w-7 text-cream" strokeWidth={2.5} />
                </span>
                <span className="font-sans text-sm font-bold">Tap to take or upload a photo</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              <OtaButton className="flex-1" onClick={() => setStep(2)}>
                {photoUrl ? "Lovely — next" : "Next"}
              </OtaButton>
              {!photoUrl && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="font-sans text-sm font-bold text-ink-charcoal/45"
                >
                  skip — still counts
                </button>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-tangerine">
                Step 2 · the whisper
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                What caught <em className="display-italic">your eye</em>?
              </h2>
              <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/55">
                {mission?.voicePrompt ?? "Take 10 seconds to tell your future self — and why you picked it."}
              </p>
            </div>

            <div className="card-tactile bg-butter p-4">
              <Wave waveInto={voice.waveInto} active={voice.recording} />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-ink-charcoal/60">
                  {voice.recording
                    ? `listening… ${Math.min(MAX_VOICE_S, voice.elapsed).toFixed(0)} / ${MAX_VOICE_S}s`
                    : take
                      ? `got it · ${take.durationS.toFixed(0)}s`
                      : "tap the mic, talk for up to 10s"}
                </span>
                {voice.recording ? (
                  <button
                    type="button"
                    onClick={stopVoice}
                    aria-label="Stop recording"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-tangerine transition-transform active:scale-90"
                  >
                    <Square className="h-4 w-4 fill-cream text-cream" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => voice.start()}
                    aria-label="Start recording"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-tangerine transition-transform active:scale-90"
                  >
                    <Mic className="h-5 w-5 text-cream" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {voice.micError && (
                <p className="mt-1 font-sans text-xs font-bold text-ink-charcoal/50">
                  Mic is shy — type a few words instead, same thing counts.
                </p>
              )}
            </div>

            <textarea
              value={voice.recording ? voice.liveTranscript : transcript}
              onChange={(e) => setTranscript(e.target.value)}
              readOnly={voice.recording}
              placeholder={
                voice.sttSupported
                  ? "Your words will appear here…"
                  : "Type a few words about what you saw…"
              }
              rows={3}
              maxLength={400}
              className="w-full resize-none rounded-2xl border-b-4 border-stone-900/10 bg-butter px-4 py-3 font-display text-base italic text-ink-charcoal placeholder:text-ink-charcoal/35 focus:outline-none"
            />

            <div className="flex items-center gap-3">
              <OtaButton className="flex-1" onClick={finish}>
                Tuck it away
              </OtaButton>
              <button
                type="button"
                onClick={finish}
                className="font-sans text-sm font-bold text-ink-charcoal/45"
              >
                skip — still counts
              </button>
            </div>
          </>
        )}

        {step === 3 && null}

        {step === 4 && (
          <div className="flex flex-col items-center gap-5 text-center">
            <OtaDog state="win" size={150} />
            {result ? (
              <>
                <h2 className="font-display text-3xl font-semibold tracking-tight">
                  Tucked away <em className="display-italic">safely</em>
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-forest px-3 py-1.5 font-sans text-xs font-bold text-cream">
                    Savoring {result.savoringScore}
                  </span>
                  {result.themes.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-butter px-3 py-1.5 font-sans text-xs font-bold text-ink-charcoal/70"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="flex items-center gap-1 rounded-full bg-solar px-3 py-1.5 font-sans text-xs font-bold text-ink-charcoal/70">
                    <Music className="h-3 w-3" strokeWidth={2.75} />
                    soundscape noted
                  </span>
                </div>
                <OtaButton size="sm" variant="paper" onClick={close}>
                  <Check className="h-4 w-4" strokeWidth={2.75} />
                  Back to the sunshine
                </OtaButton>
              </>
            ) : (
              <p className="font-sans text-sm font-bold text-ink-charcoal/55">
                Tucking your memory into the map…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
