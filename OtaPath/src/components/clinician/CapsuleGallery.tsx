"use client";

/**
 * CapsuleGallery — the patient's recent Memory Capsules on the
 * clinician workstation: real photos, real transcripts, one-click
 * voice playback. The part of the chart a doctor can feel.
 */

import { useRef, useState } from "react";
import { Camera, MapPin, Play, Square } from "lucide-react";
import type { MemoryRow } from "@/lib/api";

function ago(at: number): string {
  const d = Date.now() - at;
  if (d < 3_600_000) return `${Math.max(1, Math.round(d / 60_000))}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

export function CapsuleGallery({ memories }: { memories: MemoryRow[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  function play(m: MemoryRow) {
    if (playingId === m.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    if (!m.audioUrl) return;
    const a = new Audio(m.audioUrl);
    audioRef.current = a;
    a.onended = () => setPlayingId(null);
    void a.play();
    setPlayingId(m.id);
  }

  if (!memories.length)
    return (
      <p className="rounded-xl border border-[#E6E6E3] bg-white p-4 font-sans text-[12px] font-medium text-zinc-500">
        No capsules yet — they&rsquo;ll appear here as the patient captures moments.
      </p>
    );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {memories.slice(0, 6).map((m) => (
        <article key={m.id} className="overflow-hidden rounded-xl border border-[#E6E6E3] bg-white transition-colors hover:border-[#D1D1CD]">
          {m.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={m.photoUrl} alt={m.locationName} className="h-28 w-full object-cover" />
          ) : (
            <div className="flex h-28 items-center justify-center bg-zinc-50">
              <Camera className="h-6 w-6 text-zinc-300" strokeWidth={2} />
            </div>
          )}
          <div className="p-2.5">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-zinc-400" strokeWidth={2.5} />
              <p className="truncate font-sans text-[11px] font-semibold text-zinc-800">
                {m.locationName}
              </p>
              <span className="ml-auto shrink-0 font-sans text-[9px] font-semibold tabular-nums text-zinc-400">
                {ago(m.createdAt)}
              </span>
            </div>
            {m.transcript && (
              <p className="mt-1 line-clamp-2 font-sans text-[12px] italic leading-snug text-zinc-600">
                “{m.transcript}”
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5">
              {m.savoringScore != null && (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-sans text-[9px] font-bold tabular-nums text-emerald-700">
                  {Math.round(m.savoringScore)}
                </span>
              )}
              {m.audioUrl && (
                <button
                  type="button"
                  onClick={() => play(m)}
                  className="ml-auto flex items-center gap-1 rounded-md bg-[#18181B] px-2 py-1 font-sans text-[9px] font-bold text-white transition-colors hover:bg-zinc-800"
                >
                  {playingId === m.id ? (
                    <Square className="h-2.5 w-2.5 fill-cream" />
                  ) : (
                    <Play className="h-2.5 w-2.5 fill-cream" />
                  )}
                  {playingId === m.id ? "stop" : `${Math.round(m.audioDurS ?? 10)}s`}
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
