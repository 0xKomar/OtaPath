"use client";

/**
 * MusicTastePicker — the patient's vibe selector.
 * Four warm pills; the chosen one glows tangerine, and the closed-loop
 * "Best lift" badge marks whichever style has lifted next-day energy
 * the most in the bandit log. Lives in the Sensory Player drawer.
 */

import { Sparkles, Music2, AudioLines, Leaf, TrendingUp } from "lucide-react";
import { MUSIC_STYLES, type MusicStyleId } from "@/lib/musicTaste";
import { useOtaStore } from "@/store/useOtaStore";

const ICON: Record<MusicStyleId, typeof Sparkles> = {
  lively: Sparkles,
  piano: Music2,
  lofi: AudioLines,
  nature: Leaf,
};

export function MusicTastePicker({
  compact,
  onPick,
}: {
  compact?: boolean;
  /** override the default setMusicStyle — e.g. live-regenerate in-session */
  onPick?: (s: MusicStyleId) => void;
}) {
  const style = useOtaStore((s) => s.preferredMusicStyle);
  const setStyle = useOtaStore((s) => s.setMusicStyle);
  const best = useOtaStore((s) => s.bestLiftStyle);
  const pick = onPick ?? setStyle;

  return (
    <div className="w-full">
      <div className={`grid gap-1.5 ${compact ? "grid-cols-4" : "grid-cols-2"}`}>
        {MUSIC_STYLES.map((s) => {
          const Icon = ICON[s.id];
          const active = style === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              title={s.prompt}
              className={`relative flex flex-col items-center gap-0.5 rounded-2xl px-1.5 py-2 font-sans transition-all active:scale-95 ${
                active
                  ? "bg-tangerine text-cream"
                  : "bg-butter/70 text-ink-charcoal/60 hover:bg-butter"
              }`}
            >
              {best === s.id && (
                <span
                  className={`absolute -top-1.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-px font-sans text-[8px] font-bold uppercase tracking-wide ${
                    active ? "bg-ink-charcoal text-solar" : "bg-forest text-cream"
                  }`}
                >
                  <TrendingUp className="h-2.5 w-2.5" strokeWidth={3} />
                  best lift
                </span>
              )}
              <Icon
                className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
                strokeWidth={2.5}
              />
              <span
                className={`font-bold leading-tight ${
                  compact ? "text-[9px]" : "text-[10.5px]"
                } text-center`}
              >
                {compact ? s.tag : s.label}
              </span>
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-1.5 text-center font-sans text-[9.5px] font-medium text-ink-charcoal/40">
          instrumental only — your own voice always stays on top
        </p>
      )}
    </div>
  );
}
