"use client";

/**
 * ComfortMode — "Can't leave home today" guided 60-second journey.
 * A slow slideshow of the patient's brightest Memory Capsules, their
 * own positive voice notes layered under a generated soundscape, and
 * a breathing halo pulsing at 6 breaths/min. Warm, guided, over in
 * a minute — no interaction required once it starts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useOtaStore, type MemoryCapsule } from "@/store/useOtaStore";
import { AmbientPad } from "@/lib/ambientPad";
import { EntrainmentEngine } from "@/lib/entrainmentEngine";
import { playSoundscape } from "@/lib/soundscape";
import { OtaDog } from "@/components/ui/OtaDog";

const DURATION_S = 60;
const SLIDE_S = 8;
const BREATH_CYCLE_S = 10;
const nowMs = () => performance.now();

function breathScale(t: number) {
  const ph = t % BREATH_CYCLE_S;
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
  return ph < 4 ? 1 + 0.2 * ease(ph / 4) : 1.2 - 0.2 * ease((ph - 4) / 6);
}

/** brightest capsules first — vibrancy + valence weighted */
function brightest(memories: MemoryCapsule[]): MemoryCapsule[] {
  const score = (m: MemoryCapsule) =>
    (m.vibrancy ?? 40) + (m.valence ?? 0) * 25 + (m.savoringScore ?? 30) * 0.4;
  return [...memories]
    .filter((m) => m.photoUrl || m.transcript || m.audioUrl)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 7);
}

export function ComfortMode({ onClose }: { onClose: () => void }) {
  const memories = useOtaStore((s) => s.memories);
  const patientState = useOtaStore((s) => s.patientState);
  const slides = brightest(memories);

  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [src, setSrc] = useState<"eleven" | "pad" | "disk" | null>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narrRef = useRef<HTMLAudioElement | null>(null);
  const t0Ref = useRef(nowMs());
  const stopped = useRef(false);
  const engine = useRef<{ ctx: AudioContext | null; pad: AmbientPad; ent: EntrainmentEngine; sc: { stop: () => void } | null }>({
    ctx: null,
    pad: new AmbientPad(),
    ent: new EntrainmentEngine(),
    sc: null,
  });

  const teardown = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    engine.current.ent.stop();
    engine.current.pad.stop();
    engine.current.sc?.stop();
    audioRef.current?.pause();
    narrRef.current?.pause();
  }, []);

  // boot: audio layers + timers; auto-close at 60s
  useEffect(() => {
    const e = engine.current;
    e.ctx = new AudioContext();
    void e.ctx.resume().catch(() => {});
    e.ent.start(e.ctx, "calm");
    const prompt =
      [...slides].reverse().find((m) => m.soundscapePrompt)?.soundscapePrompt ??
      "Soft warm ambient piano with gentle morning light and a quiet room, tender and safe, ~64 BPM";
    // prefer the brightest capsule's own cached track — disk, not API
    const track = slides.find((m) => m.soundscapeUrl) ?? slides[0];
    void playSoundscape(e.ctx, prompt, "calm", patientState, e.pad, 22, {
      memoryId: track?.id,
      soundscapeUrl: track?.soundscapeUrl,
      musicStyle: track?.musicStyle ?? useOtaStore.getState().preferredMusicStyle,
      locationName: track?.poiName,
      themes: track?.themes,
    }).then((h) => {
      e.sc = h;
      setSrc(h.source);
    });
    // spoken layer — ElevenLabs narrates a short journey through your
    // own moments (silently skipped when no API key / API fails)
    const bits = slides
      .slice(0, 3)
      .map((m) =>
        m.transcript
          ? `At ${m.poiName}, you said — ${m.transcript}`
          : `Remember ${m.poiName}.`
      );
    const script = `Let's sit with your own light for a minute. ${bits.join(
      " "
    )} These were your moments. They're still yours.`;
    void fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: script }),
    })
      .then(async (r) => {
        if (stopped.current || !r.ok) return;
        const el = new Audio(URL.createObjectURL(await r.blob()));
        el.volume = 0.9;
        narrRef.current = el;
        void el.play().catch(() => {});
      })
      .catch(() => {});
    const tick = window.setInterval(() => {
      const t = (nowMs() - t0Ref.current) / 1000;
      setElapsed(Math.min(DURATION_S, Math.floor(t)));
      setIdx(Math.min(slides.length - 1, Math.floor(t / SLIDE_S)));
      if (t >= DURATION_S) {
        teardown();
        onClose();
      }
    }, 400);
    return () => {
      window.clearInterval(tick);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // breathing halo — rAF, direct DOM
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = (nowMs() - t0Ref.current) / 1000;
      if (haloRef.current)
        haloRef.current.style.transform = `scale(${breathScale(t).toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // play this slide's own voice note if it has one
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    const m = slides[idx];
    if (m?.audioUrl) {
      const el = new Audio(m.audioUrl);
      el.volume = 0.8;
      audioRef.current = el;
      void el.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const m = slides[idx];
  const progress = elapsed / DURATION_S;

  return (
    <div className="fixed inset-0 z-[1450] flex flex-col items-center justify-center overflow-hidden bg-cream">
      {/* breathing halo behind everything */}
      <div
        ref={haloRef}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-1000 ease-out"
        style={{ background: "radial-gradient(circle, rgba(255,206,50,0.35) 0%, rgba(251,232,166,0.4) 45%, transparent 70%)" }}
      />

      <button
        type="button"
        onClick={() => {
          teardown();
          onClose();
        }}
        aria-label="Close comfort mode"
        className="card-tactile absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-butter"
      >
        <X className="h-4 w-4 text-ink-charcoal" strokeWidth={2.75} />
      </button>

      <p className="z-10 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-tangerine">
        staying in today — a minute of your own light
      </p>

      {/* slide */}
      <div key={m?.id ?? "sun"} className="toast-in z-10 mt-5 flex w-full max-w-sm flex-col items-center px-5">
        {m?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.photoUrl}
            alt={m.poiName}
            className="ken-burns aspect-[4/3] w-full rounded-[28px] border-b-4 border-stone-900/10 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[28px] border-b-4 border-stone-900/10 bg-butter">
            <OtaDog state="idle" size={120} />
          </div>
        )}
        {m?.transcript && (
          <p className="mt-4 text-center font-display text-lg font-medium italic leading-snug text-ink-charcoal/80">
            “{m.transcript}”
          </p>
        )}
        {m && (
          <p className="mt-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-charcoal/40">
            {m.poiName}
          </p>
        )}
      </div>

      {/* progress + audio source */}
      <div className="z-10 mt-6 flex w-full max-w-xs flex-col items-center gap-2 px-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-butter">
          <div
            className="h-full rounded-full bg-solar transition-all duration-500 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="font-sans text-[10px] font-bold text-ink-charcoal/40">
          {src === "pad" ? "♫ soundscape · woven on device" : "♫ your soundscape · ElevenLabs"}
          {" · "}
          {DURATION_S - elapsed}s of quiet left
        </p>
      </div>
    </div>
  );
}
