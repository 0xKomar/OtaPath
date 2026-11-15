"use client";

/**
 * MemorySheet — opens a saved Memory Capsule: photo (if any), voice
 * note playback, savoring note, and the signal chips that fed the
 * closed loop. Warm, unhurried, blush-accented.
 */

import { X, MapPin } from "lucide-react";
import { useOtaStore } from "@/store/useOtaStore";

function ago(at: number) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function MemorySheet() {
  const id = useOtaStore((s) => s.viewingMemoryId);
  const memory = useOtaStore((s) => s.memories.find((m) => m.id === id));
  const close = () => useOtaStore.getState().viewMemory(null);

  if (!memory) return null;

  const chips = [
    memory.vibrancy != null && { label: `Vibrancy ${memory.vibrancy}`, cls: "bg-tangerine" },
    memory.luminance != null && { label: `Light ${memory.luminance}`, cls: "bg-cobalt" },
    memory.acousticScore != null && { label: `Voice ${memory.acousticScore}`, cls: "bg-sky" },
    memory.savoringScore != null && { label: `Savoring ${memory.savoringScore}`, cls: "bg-forest" },
  ].filter(Boolean) as { label: string; cls: string }[];

  return (
    <div className="toast-in card-tactile max-h-[82dvh] overflow-y-auto bg-cream p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-blush">
            Memory capsule · {ago(memory.at)}
          </p>
          <h3 className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-semibold tracking-tight">
            <MapPin className="h-4.5 w-4.5 h-[18px] w-[18px] text-blush" strokeWidth={2.5} />
            {memory.poiName}
          </h3>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-butter transition-transform active:scale-90"
        >
          <X className="h-[18px] w-[18px] text-ink-charcoal" strokeWidth={2.5} />
        </button>
      </div>

      {memory.photoUrl && (
        <div className="card-tactile mt-4 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={memory.photoUrl} alt="Saved moment" className="h-48 w-full object-cover" />
        </div>
      )}

      {memory.audioUrl && (
        <div className="card-tactile mt-3 bg-butter p-3.5">
          <p className="font-sans text-sm font-bold">
            Voice journal · {Math.round(memory.audioDurS ?? 0)}s
          </p>
          <audio src={memory.audioUrl} controls className="mt-1 h-8 w-full" />
        </div>
      )}

      {memory.transcript && (
        <p className="mt-3 font-display text-xl italic text-ink-charcoal/85">
          “{memory.transcript}”
        </p>
      )}

      {memory.themes && memory.themes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {memory.themes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-butter px-2.5 py-1 font-sans text-[11px] font-bold text-ink-charcoal/60"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {memory.soundscapePrompt && (
        <p className="mt-3 font-sans text-[11px] font-medium italic text-ink-charcoal/45">
          ♫ {memory.soundscapePrompt}
        </p>
      )}

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c.label}
              className={`rounded-full px-3 py-1 font-sans text-xs font-bold text-cream ${c.cls}`}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
