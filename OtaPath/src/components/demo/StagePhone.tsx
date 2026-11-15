"use client";

/**
 * StagePhone — the patient's phone on the /demo stage.
 * Listens for `ota:slide` cues dispatched by the JourneyDeck and swaps
 * the iframe route (/ /memories /profile) so each slide shows the app
 * screen it describes. Sensory cues are forwarded into the app itself
 * over the otapath-demo BroadcastChannel.
 */

import { useEffect, useState } from "react";
import { Signal, Wifi, BatteryFull } from "lucide-react";
import { publishDemo } from "@/lib/broadcast";

export interface SlideCue {
  route?: "/app" | "/app/memories" | "/app/profile";
  sensory?: boolean;
  /** open the Memory Capture sheet on the phone (undefined = keep closed) */
  capture?: boolean;
  /** which step the sheet opens on — 2 = the voice journal */
  captureStep?: 1 | 2;
}

export const SLIDE_EVENT = "ota:slide";

export function fireSlideCue(cue: SlideCue) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SlideCue>(SLIDE_EVENT, { detail: cue }));
}

export function StagePhone() {
  const [route, setRoute] = useState<string>("/app");

  useEffect(() => {
    const onCue = (e: Event) => {
      const cue = (e as CustomEvent<SlideCue>).detail;
      if (!cue) return;
      if (cue.route) setRoute(cue.route);
      if (cue.sensory !== undefined)
        publishDemo({ t: "sensory", open: cue.sensory });
      // normalized every cue — leaving a slide always folds the sheet away
      publishDemo({
        t: "capture",
        open: cue.capture === true,
        step: cue.captureStep ?? 2,
      });
    };
    window.addEventListener(SLIDE_EVENT, onCue);
    return () => window.removeEventListener(SLIDE_EVENT, onCue);
  }, []);

  return (
    <section className="flex w-[42%] min-w-[400px] shrink-0 flex-col items-center justify-center gap-3 border-r border-[#E6E6E3] bg-[#F7F7F5] py-6">
      <div className="relative aspect-[9/19] h-[min(90dvh,960px)] shrink-0">
        <div className="absolute inset-0 rounded-[44px] border-[12px] border-[#1C1917] bg-[#1C1917] shadow-[0_20px_50px_-20px_rgba(28,25,23,0.35)]" />
        {/* screen interior: iOS-style status bar, then the app */}
        <div className="absolute inset-[12px] flex flex-col overflow-hidden rounded-[32px] bg-cream">
          <div className="flex h-[34px] shrink-0 items-center justify-between px-6 pt-1.5">
            <span className="font-sans text-[11px] font-bold text-ink-charcoal">
              9:41
            </span>
            <span className="flex items-center gap-1.5 text-ink-charcoal">
              <Signal className="h-3 w-3" strokeWidth={2.5} />
              <Wifi className="h-3 w-3" strokeWidth={2.5} />
              <BatteryFull className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </div>
          <iframe
            key={route}
            src={route}
            title="OtaPath patient app"
            className="w-full flex-1 border-0 bg-cream"
          />
        </div>
        {/* dynamic island — floats over the status bar like the real thing */}
        <div className="absolute left-1/2 top-[20px] z-10 h-[20px] w-[32%] -translate-x-1/2 rounded-full bg-[#1C1917]" />
      </div>
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
        the patient&rsquo;s phone
      </p>
    </section>
  );
}
