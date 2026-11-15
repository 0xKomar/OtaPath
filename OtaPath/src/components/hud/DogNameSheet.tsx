"use client";

/**
 * DogNameSheet — first-run companion naming, as a soft bottom sheet.
 * The dog trots in idle under a warm greeting; one input, one button.
 * Skipping is always allowed — zero pressure, he forgives instantly.
 * Re-opened any time from the demo drawer.
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useOtaStore } from "@/store/useOtaStore";
import { OtaDog } from "@/components/ui/OtaDog";
import { OtaButton } from "@/components/ui/OtaButton";
import { MusicTastePicker } from "./MusicTastePicker";

const SUGGESTIONS = ["Reksio", "Sunny", "Bruno", "Luna", "Fado", "Ota"];

export function DogNameSheet() {
  const dogName = useOtaStore((s) => s.dogName);
  const hydrated = useOtaStore((s) => s.dogHydrated);
  const setDogName = useOtaStore((s) => s.setDogName);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  // appear once, a beat after the map settles — only when unnamed,
  // and only after persisted prefs hydrated (no flash/mismatch)
  useEffect(() => {
    if (!hydrated || dogName !== null) return;
    const t = setTimeout(() => setOpen(true), 1600);
    return () => clearTimeout(t);
  }, [dogName, hydrated]);

  if (!open || dogName !== null) return null;

  const save = (v?: string) => {
    const n = (v ?? name).trim();
    if (!n) return;
    setDogName(n);
    setOpen(false);
  };

  return (
    <div className="absolute inset-0 z-[1400] flex items-end justify-center bg-ink-charcoal/30 backdrop-blur-[2px]">
      <div className="toast-in card-tactile mb-3 w-[calc(100%-24px)] max-w-md bg-cream px-5 pb-5 pt-4">
        <div className="flex justify-center">
          <OtaDog state="idle" size={120} />
        </div>
        <p className="mt-1 text-center font-display text-xl font-semibold tracking-tight text-ink-charcoal">
          Meet your walking <em className="italic">buddy</em>
        </p>
        <p className="mt-1 text-center font-sans text-[12.5px] font-semibold leading-snug text-ink-charcoal/55">
          He&rsquo;ll trot beside you on the map, celebrate every street you clear —
          and wait patiently on the days you stay in.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="What should we call him?"
          className="mt-3.5 w-full rounded-2xl border-2 border-ink-charcoal/10 bg-white px-4 py-3 text-center font-sans text-[15px] font-bold text-ink-charcoal outline-none transition-colors placeholder:font-semibold placeholder:text-ink-charcoal/30 focus:border-tangerine"
        />
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => save(s)}
              className="rounded-full bg-butter px-3 py-1.5 font-sans text-[11px] font-bold text-ink-charcoal/60 transition-colors active:bg-solar"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-charcoal/40">
          and the music he walks to
        </p>
        <div className="mt-2">
          <MusicTastePicker compact />
        </div>
        <div className="mt-3.5 flex items-center justify-center gap-3">
          <OtaButton size="sm" onClick={() => save()} disabled={!name.trim()}>
            <Check className="h-4 w-4" strokeWidth={2.75} />
            That&rsquo;s his name
          </OtaButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full px-2 py-1.5 font-sans text-[11px] font-bold text-ink-charcoal/45 underline underline-offset-4"
          >
            decide later
          </button>
        </div>
      </div>
    </div>
  );
}
