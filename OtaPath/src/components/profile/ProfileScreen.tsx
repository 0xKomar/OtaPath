"use client";

/**
 * ProfileScreen — the patient's own gentle settings page.
 * Companion name, energy context, audio comfort, location status,
 * and a small "my week" glance. Warm, readable, zero guilt.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PawPrint, MapPin, RefreshCw, Moon, Flame, Waves, Volume2,
  ChevronLeft, HeartPulse, Footprints, Music4,
} from "lucide-react";
import { useOtaStore } from "@/store/useOtaStore";
import { useBackendSync } from "@/lib/useBackendSync";
import { BottomNav } from "@/components/hud/BottomNav";
import { MusicTastePicker } from "@/components/hud/MusicTastePicker";

const SRC_LABEL = { demo: "demo spot", ip: "rough fix (IP)", gps: "live GPS" } as const;

function Row({ icon: Icon, label, children }: {
  icon: typeof PawPrint; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-butter text-ink-charcoal">
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[10px] font-extrabold uppercase tracking-wider text-ink-charcoal/45">
          {label}
        </span>
        <span className="mt-0.5 block">{children}</span>
      </span>
    </div>
  );
}

export function ProfileScreen() {
  useBackendSync(); // keepsakes + clinician IAF hydrate on a fresh page load
  const dogName = useOtaStore((s) => s.dogName);
  const setDogName = useOtaStore((s) => s.setDogName);
  const ctx = useOtaStore((s) => s.todayContext);
  const setCtx = useOtaStore((s) => s.setTodayContext);
  const iaf = useOtaStore((s) => s.iafHz);
  const setIaf = useOtaStore((s) => s.setIafHz);
  const loc = useOtaStore((s) => s.locationSource);
  const gpsActive = useOtaStore((s) => s.gpsActive);
  const locate = useOtaStore((s) => s.locateNow);
  const exploredPct = useOtaStore((s) => s.exploredPct);
  const memories = useOtaStore((s) => s.memories);
  const comfortMotion = useOtaStore((s) => s.comfortMotion);
  const comfortTheme = useOtaStore((s) => s.comfortTheme);
  const setMotion = useOtaStore((s) => s.setComfortMotion);
  const setTheme = useOtaStore((s) => s.setComfortTheme);
  const dogHydrated = useOtaStore((s) => s.dogHydrated);
  const hydrate = useOtaStore((s) => s.hydrateFromStorage);
  // local draft; once hydration lands we adopt the stored name — `touched`
  // keeps the user's own typing from being overwritten by a late hydrate.
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [hydratedDog, setHydratedDog] = useState<string | null>(null);
  if (dogHydrated && dogName !== hydratedDog && !touched) {
    // "adjust state during render" — React's recommended prop-sync pattern
    setHydratedDog(dogName);
    setName(dogName ?? "");
  }
  const [locating, setLocating] = useState(false);

  useEffect(() => hydrate(), [hydrate]);

  return (
    <div className="app-nunito relative flex h-full flex-col overflow-hidden bg-cream">
      {/* header */}
      <header className="flex items-center gap-2 px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))]">
        <Link
          href="/app"
          aria-label="Back to the map"
          className="card-tactile grid h-9 w-9 place-items-center bg-paper text-ink-charcoal transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </Link>
        <h1 className="font-display text-[22px] font-black text-ink-charcoal">You &amp; yours</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-1">
        {/* week glance */}
        <div className="card-tactile mb-3 flex items-center justify-around bg-paper px-2 py-4">
          {[
            { icon: Footprints, v: `${exploredPct}%`, l: "world seen" },
            { icon: HeartPulse, v: String(memories.length), l: "keepsakes" },
            { icon: Music4, v: `${iaf.toFixed(1)} Hz`, l: "your rhythm" },
          ].map((s) => (
            <span key={s.l} className="flex flex-col items-center gap-1">
              <s.icon className="h-4 w-4 text-tangerine" strokeWidth={2.5} />
              <span className="font-display text-[17px] font-black text-ink-charcoal">{s.v}</span>
              <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-ink-charcoal/45">
                {s.l}
              </span>
            </span>
          ))}
        </div>

        <div className="card-tactile divide-y divide-ink-charcoal/8 bg-paper">
          <Row icon={PawPrint} label="companion's name">
            <span className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => {
                  setTouched(true);
                  setName(e.target.value);
                }}
                onBlur={() => setDogName(name)}
                placeholder="name your companion"
                maxLength={24}
                className="min-w-0 flex-1 rounded-xl bg-cream px-2.5 py-1.5 font-sans text-[13px] font-bold text-ink-charcoal outline-none placeholder:text-ink-charcoal/35"
              />
            </span>
          </Row>

          <Row icon={Flame} label="today's context">
            <span className="flex flex-wrap gap-1.5 pt-0.5">
              {(
                [
                  ["auto", "outdoor"],
                  ["sick", "resting"],
                  ["housebound", "indoors"],
                ] as const
              ).map(([id, l]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCtx(id)}
                  className={`rounded-full px-2.5 py-1 font-sans text-[10.5px] font-extrabold transition-all active:scale-95 ${
                    ctx === id
                      ? "bg-ink-charcoal text-cream"
                      : "bg-cream text-ink-charcoal/60"
                  }`}
                >
                  {l}
                </button>
              ))}
            </span>
          </Row>

          <Row icon={Waves} label="calming rhythm (IAF)">
            <span className="flex items-center gap-2.5">
              <input
                type="range"
                min={8}
                max={12.5}
                step={0.1}
                value={iaf}
                onChange={(e) => setIaf(parseFloat(e.target.value))}
                className="min-w-0 flex-1 accent-tangerine"
                aria-label="Individual alpha frequency"
              />
              <span className="w-14 shrink-0 text-right font-sans text-[12px] font-extrabold text-ink-charcoal">
                {iaf.toFixed(1)} Hz
              </span>
            </span>
          </Row>

          <Row icon={MapPin} label="your location">
            <span className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-[10.5px] font-extrabold ${
                  gpsActive ? "bg-forest/15 text-forest" : "bg-cream text-ink-charcoal/60"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${gpsActive ? "bg-forest" : "bg-ink-charcoal/30"}`}
                />
                {SRC_LABEL[loc]}
              </span>
              <button
                type="button"
                disabled={locating}
                onClick={() => {
                  setLocating(true);
                  locate();
                  setTimeout(() => setLocating(false), 2500);
                }}
                className="btn-tactile flex items-center gap-1 bg-butter px-2.5 py-1 font-sans text-[10.5px] font-extrabold text-ink-charcoal disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${locating ? "animate-spin" : ""}`} strokeWidth={3} />
                use my GPS
              </button>
            </span>
          </Row>

          <Row icon={Moon} label="calm at night">
            <span className="flex gap-1.5 pt-0.5">
              {(["day", "candle"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-full px-2.5 py-1 font-sans text-[10.5px] font-extrabold capitalize transition-all active:scale-95 ${
                    comfortTheme === t ? "bg-ink-charcoal text-cream" : "bg-cream text-ink-charcoal/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </span>
          </Row>

          <Row icon={Volume2} label="motion comfort">
            <span className="flex gap-1.5 pt-0.5">
              {(["full", "soft"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotion(m)}
                  className={`rounded-full px-2.5 py-1 font-sans text-[10.5px] font-extrabold capitalize transition-all active:scale-95 ${
                    comfortMotion === m ? "bg-ink-charcoal text-cream" : "bg-cream text-ink-charcoal/60"
                  }`}
                >
                  {m}
                </button>
              ))}
            </span>
          </Row>
        </div>

        {/* your soundtrack — the vibe ElevenLabs composes around */}
        <div className="card-tactile mt-3 bg-paper px-4 py-3.5">
          <p className="mb-2.5 font-sans text-[10px] font-extrabold uppercase tracking-wider text-ink-charcoal/45">
            your soundtrack
          </p>
          <MusicTastePicker />
        </div>

        <p className="mt-4 px-2 text-center font-sans text-[10.5px] font-semibold leading-relaxed text-ink-charcoal/40">
          Everything here stays yours. Your care team only sees the gentle
          trends — never the details you don&apos;t share.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
