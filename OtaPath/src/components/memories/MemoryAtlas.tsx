"use client";

/**
 * MemoryAtlas — tactile scrapbook of every Memory Capsule.
 * Polaroid-style tilted cards (photo, italic transcript, place, date),
 * a per-capsule soundscape replay button, and the "Can't leave home
 * today" comfort journey launcher up top.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Music, Pause, Home, MapPin, Mic, RefreshCw } from "lucide-react";
import { useOtaStore, type MemoryCapsule } from "@/store/useOtaStore";
import { api } from "@/lib/api";
import { MUSIC_STYLES, STYLE_BY_ID, type MusicStyleId } from "@/lib/musicTaste";
import { AmbientPad } from "@/lib/ambientPad";
import { playSoundscape, type SoundscapeHandle } from "@/lib/soundscape";
import { ComfortMode } from "@/components/hud/ComfortMode";
import { BottomNav } from "@/components/hud/BottomNav";
import { OtaButton } from "@/components/ui/OtaButton";
import { OtaDog } from "@/components/ui/OtaDog";
import { useSensoryComfort } from "@/lib/useSensoryComfort";
import { useBackendSync } from "@/lib/useBackendSync";

function fmtDate(at: number) {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** one capsule card — photo, palette swatches, quote, voice + soundscape replay */
function CapsuleCard({ m }: { m: MemoryCapsule }) {
  const patientState = useOtaStore((s) => s.patientState);
  const preferred = useOtaStore((s) => s.preferredMusicStyle);
  const setCapsuleSoundscape = useOtaStore((s) => s.setCapsuleSoundscape);
  const pushToast = useOtaStore((s) => s.pushToast);
  const [playing, setPlaying] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [weaving, setWeaving] = useState(false);
  const handle = useRef<SoundscapeHandle | null>(null);
  const voiceEl = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const pad = useRef(new AmbientPad());

  async function toggle() {
    if (playing) {
      handle.current?.stop();
      handle.current = null;
      setPlaying(false);
      return;
    }
    const c = (ctx.current ??= new AudioContext());
    void c.resume().catch(() => {});
    const h = await playSoundscape(
      c,
      m.soundscapePrompt ?? "Soft warm ambient piece, gentle and safe, ~68 BPM",
      "calm",
      patientState,
      pad.current,
      14,
      // the cached MP3 replays instantly — zero API credits
      {
        memoryId: m.id,
        soundscapeUrl: m.soundscapeUrl,
        musicStyle: m.musicStyle ?? preferred,
        locationName: m.poiName,
        themes: m.themes,
      }
    );
    handle.current = h;
    setPlaying(true);
  }

  /** "Regenerate with a different vibe" — cycles the style wheel live */
  async function regenerate() {
    if (weaving) return;
    setWeaving(true);
    handle.current?.stop();
    handle.current = null;
    setPlaying(false);
    const order = MUSIC_STYLES.map((s) => s.id);
    const cur = m.musicStyle ?? preferred;
    const next = order[(order.indexOf(cur) + 1) % order.length] as MusicStyleId;
    try {
      const r = await api.generateSoundscape({
        musicStyle: next,
        memoryId: m.id,
        energy: patientState,
        locationName: m.poiName,
        themes: m.themes,
        luminance: m.luminance,
        force: true,
      });
      if (r) {
        setCapsuleSoundscape(m.id, r.url, next);
        pushToast(`Fresh track — ${STYLE_BY_ID[next].label}`);
        const c = (ctx.current ??= new AudioContext());
        void c.resume().catch(() => {});
        const el = new Audio(r.url);
        el.loop = true;
        el.volume = 0.55;
        await el.play().catch(() => {});
        handle.current = { source: "disk", stop: () => el.pause() };
        setPlaying(true);
      } else {
        pushToast("The studio is resting — woven pad keeps playing");
      }
    } finally {
      setWeaving(false);
    }
  }

  /** replay the real recorded voice take (persisted data URL) */
  function toggleVoice() {
    if (voicePlaying) {
      voiceEl.current?.pause();
      setVoicePlaying(false);
      return;
    }
    const el = (voiceEl.current ??= new Audio(m.audioUrl));
    el.onended = () => setVoicePlaying(false);
    void el.play().then(() => setVoicePlaying(true)).catch(() => setVoicePlaying(false));
  }

  return (
    <div className="card-tactile min-w-0 bg-cream p-2.5 sm:p-3">
      {m.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.photoUrl}
          alt={m.poiName}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-butter">
          <OtaDog state="idle" size={64} />
        </div>
      )}

      {/* real dominant palette — the colors the camera actually saw */}
      {m.palette && m.palette.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          {m.palette.slice(0, 5).map((hex) => (
            <span
              key={hex}
              title={hex}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-ink-charcoal/10"
              style={{ background: hex }}
            />
          ))}
        </div>
      )}

      {m.transcript && (
        <p className="mt-2.5 line-clamp-3 font-display text-[13.5px] font-medium italic leading-snug text-ink-charcoal/80">
          “{m.transcript}”
        </p>
      )}

      <div className="mt-2 flex min-w-0 items-center gap-1 font-sans text-[10px] font-bold text-ink-charcoal/45">
        <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.75} />
        <span className="truncate">{m.poiName}</span>
        <span className="shrink-0">· {fmtDate(m.at)}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 font-sans text-[10px] font-bold transition-all active:scale-95 ${
            playing ? "bg-solar text-ink-charcoal" : "bg-butter text-ink-charcoal/65"
          }`}
        >
          {playing ? (
            <Pause className="h-3 w-3" strokeWidth={3} />
          ) : (
            <Music className="h-3 w-3" strokeWidth={2.75} />
          )}
          {playing ? "playing" : m.musicStyle ? STYLE_BY_ID[m.musicStyle].tag : "soundscape"}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={weaving}
          title="Regenerate with a different vibe"
          className="flex items-center gap-1 rounded-full bg-butter/60 px-2 py-1.5 font-sans text-[10px] font-bold text-ink-charcoal/50 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3 w-3 ${weaving ? "animate-spin" : ""}`}
            strokeWidth={2.75}
          />
          {weaving ? "weaving" : "vibe"}
        </button>
        {m.audioUrl && (
          <button
            type="button"
            onClick={toggleVoice}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 font-sans text-[10px] font-bold transition-all active:scale-95 ${
              voicePlaying ? "bg-tangerine text-cream" : "bg-butter text-ink-charcoal/65"
            }`}
          >
            {voicePlaying ? (
              <Pause className="h-3 w-3" strokeWidth={3} />
            ) : (
              <Mic className="h-3 w-3" strokeWidth={2.75} />
            )}
            {voicePlaying ? "listening" : "my voice"}
          </button>
        )}
        {m.savoringScore != null && (
          <span className="rounded-full bg-forest/15 px-2 py-1 font-sans text-[9.5px] font-bold text-forest">
            savor {m.savoringScore}
          </span>
        )}
      </div>
    </div>
  );
}

export function MemoryAtlas() {
  useSensoryComfort();
  useBackendSync(); // capsules/baseline hydrate even on a fresh page load
  const memories = useOtaStore((s) => s.memories);
  const [comfort, setComfort] = useState(false);

  // read persisted comfort prefs post-mount (same store, fresh page load)
  useEffect(() => {
    useOtaStore.getState().hydrateFromStorage();
  }, []);

  return (
    <div className="app-nunito h-dvh w-full overflow-y-auto overflow-x-hidden bg-cream pb-28">
      {/* header — clears the phone status bar via safe-area */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-cream/95 px-3 pb-3 pt-[max(14px,env(safe-area-inset-top))] sm:px-4">
        <Link
          href="/app"
          className="card-tactile flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-butter"
          aria-label="Back to the map"
        >
          <ArrowLeft className="h-4 w-4 text-ink-charcoal" strokeWidth={2.75} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            Memory Atlas
          </h1>
          <p className="truncate font-sans text-[11px] font-bold text-ink-charcoal/45">
            {memories.length} {memories.length === 1 ? "capsule" : "capsules"} of collected light
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        {/* comfort mode launcher */}
        <div className="card-tactile mt-1 flex items-center gap-3 bg-butter p-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-solar">
            <Home className="h-5 w-5 text-ink-charcoal" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold leading-tight sm:text-lg">
              Can&apos;t leave home today?
            </p>
            <p className="mt-0.5 font-sans text-[11px] font-medium leading-snug text-ink-charcoal/60">
              A gentle 60-second journey through your brightest moments.
            </p>
          </div>
          <OtaButton size="sm" variant="forest" onClick={() => setComfort(true)}>
            Begin
          </OtaButton>
        </div>

        {/* scrapbook grid */}
        {memories.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-4 text-center">
            <OtaDog state="idle" size={110} />
            <p className="mt-4 font-display text-xl font-semibold">
              The atlas is waiting for its first page
            </p>
            <p className="mt-2 max-w-xs font-sans text-sm font-medium text-ink-charcoal/55">
              Your first walk plants the first capsule — it keeps itself, no effort needed.
            </p>
            <Link href="/app" className="mt-5">
              <OtaButton size="sm" variant="paper">Back to the map</OtaButton>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {memories.map((m) => (
              <CapsuleCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </main>

      {comfort && <ComfortMode onClose={() => setComfort(false)} />}
      <BottomNav />
    </div>
  );
}
