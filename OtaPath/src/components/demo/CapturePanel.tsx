"use client";

/**
 * CapturePanel — the "what the AI just heard" card on /demo.
 * Shows the most recent capture's NLP + acoustic breakdown from the
 * live LoopSnapshot (transcript, themes, savoring, signal bars).
 */

import { useClinicianFeed } from "@/lib/useClinicianFeed";

function Bar({ label, v, cls }: { label: string; v?: number; cls: string }) {
  if (v == null) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 font-sans text-[10px] font-bold uppercase text-zinc-400">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F4F4F2]">
        <div
          className={`h-full rounded-full ${cls} transition-all duration-700`}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
      <span className="w-7 text-right font-sans text-[10px] font-bold tabular-nums text-zinc-500">
        {Math.round(v)}
      </span>
    </div>
  );
}

export function CapturePanel() {
  const snap = useClinicianFeed();
  const c = snap.lastCapture;

  return (
    <div className="rounded-xl border border-[#E6E6E3] bg-white p-4">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
        Latest capture · NLP + acoustic breakdown
      </p>
      {c ? (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {c.transcript && (
            <p className="line-clamp-2 border-l-2 border-[#E6E6E3] pl-3 font-sans text-[13px] font-medium leading-snug text-zinc-700">
              “{c.transcript}”
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {c.savoringScore != null && (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-sans text-[10px] font-bold text-emerald-700">
                savoring {c.savoringScore}
              </span>
            )}
            {c.valence != null && (
              <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 font-sans text-[10px] font-bold text-orange-700">
                valence {c.valence > 0 ? "+" : ""}
                {c.valence}
              </span>
            )}
            {(c.themes ?? []).map((t) => (
              <span
                key={t}
                className="rounded-md border border-[#E6E6E3] bg-[#FAFAF9] px-2 py-1 font-sans text-[10px] font-bold text-zinc-500"
              >
                #{t}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            <Bar label="voice" v={c.acousticScore} cls="bg-violet-400" />
            <Bar label="vibrancy" v={c.vibrancy} cls="bg-[#FF6B2B]" />
            <Bar label="light" v={c.luminance} cls="bg-amber-400" />
          </div>
        </div>
      ) : (
        <p className="mt-2 font-sans text-[12px] font-medium text-zinc-400">
          waiting for the first capture on the phone →
        </p>
      )}
    </div>
  );
}
