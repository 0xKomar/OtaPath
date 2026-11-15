"use client";

/**
 * FogWalkDemo — interactive demo of the golden fog-of-war.
 * Tap "Take a walk" and CloudWalker toddles across the neighborhood,
 * peeling back the warm paper mist behind every step — scratch-off style.
 */

import { useEffect, useRef, useState } from "react";
import { FogOverlay, SproutPin, type FogReveal } from "./OtaShapes";
import { OtaDog } from "./OtaDog";
import { OtaButton } from "./OtaButton";

const WAYPOINTS = [
  { x: 14, y: 72 },
  { x: 24, y: 58 },
  { x: 36, y: 62 },
  { x: 48, y: 46 },
  { x: 60, y: 54 },
  { x: 72, y: 40 },
  { x: 85, y: 48 },
];

const PINS: { kind: "park" | "cinema" | "sport"; x: number; y: number }[] = [
  { kind: "park", x: 30, y: 46 },
  { kind: "cinema", x: 66, y: 62 },
  { kind: "sport", x: 86, y: 30 },
];

export function FogWalkDemo() {
  const [reveals, setReveals] = useState<FogReveal[]>([]);
  const [pos, setPos] = useState(WAYPOINTS[0]);
  const [step, setStep] = useState(0);
  const [walking, setWalking] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const done = step >= WAYPOINTS.length;
  const pct = Math.round((step / WAYPOINTS.length) * 100);

  useEffect(() => {
    if (!walking) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        const next = s + 1;
        if (next >= WAYPOINTS.length) {
          setWalking(false);
          clearInterval(timer.current!);
          return WAYPOINTS.length;
        }
        const wp = WAYPOINTS[next];
        setPos(wp);
        setReveals((r) => [...r, { x: wp.x, y: wp.y, r: 11 + Math.random() * 4 }]);
        return next;
      });
    }, 620);
    return () => clearInterval(timer.current!);
  }, [walking]);

  function start() {
    if (done) reset();
    setReveals([{ x: WAYPOINTS[0].x, y: WAYPOINTS[0].y, r: 12 }]);
    setStep(1);
    setWalking(true);
  }

  function reset() {
    setWalking(false);
    setReveals([]);
    setStep(0);
    setPos(WAYPOINTS[0]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card-tactile relative aspect-[4/3] w-full overflow-hidden bg-[#EFE5CB]">
        {/* --- pretend neighborhood map --- */}
        <svg
          viewBox="0 0 100 75"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <rect width="100" height="75" fill="#EFE5CB" />
          {/* roads */}
          <g stroke="#FAF3DF" strokeWidth="5" fill="none" strokeLinecap="round">
            <path d="M-2 55 C20 52 40 60 60 50 C75 43 88 46 102 40" />
            <path d="M30 -2 C34 20 28 45 38 77" />
            <path d="M70 -2 C66 25 78 50 72 77" />
          </g>
          {/* park */}
          <ellipse cx="30" cy="52" rx="13" ry="10" fill="#1E8E5A" opacity="0.18" />
          <circle cx="24" cy="48" r="2.4" fill="#1E8E5A" opacity="0.55" />
          <circle cx="33" cy="55" r="2.8" fill="#1E8E5A" opacity="0.55" />
          {/* water */}
          <ellipse cx="84" cy="16" rx="14" ry="9" fill="#38BDF8" opacity="0.35" />
          {/* buildings */}
          <g fill="#FBE8A6" stroke="#1C1917" strokeOpacity="0.1" strokeWidth="0.5">
            <rect x="48" y="20" width="9" height="7" rx="1.5" />
            <rect x="60" y="66" width="11" height="6" rx="1.5" />
            <rect x="12" y="24" width="8" height="6" rx="1.5" />
          </g>
        </svg>

        {/* hidden friends waiting under the mist */}
        {PINS.map((p) => (
          <div
            key={p.kind}
            className="absolute -translate-x-1/2 -translate-y-[85%]"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <SproutPin kind={p.kind} size={44} />
          </div>
        ))}

        {/* the walker */}
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-[80%] transition-all duration-500 ease-out"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          <OtaDog size={64} state={walking ? "walk" : done ? "win" : "idle"} />
        </div>

        {/* golden paper mist — peels away where you've walked */}
        <FogOverlay reveals={reveals} softness={5} />

        {done && (
          <div className="absolute inset-x-0 top-4 z-20 flex justify-center">
            <span className="rounded-full bg-forest px-4 py-2 font-sans text-sm font-bold text-cream">
              Sunny side uncovered — 3 friends found!
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OtaButton variant="forest" size="sm" onClick={start} disabled={walking}>
          {walking ? "Walking…" : done ? "Walk it again" : "Take a walk"}
        </OtaButton>
        <OtaButton variant="paper" size="sm" onClick={reset}>
          Reset mist
        </OtaButton>
        <span className="ml-auto font-sans text-sm font-bold tracking-tight text-ink-charcoal/60">
          {pct}% uncovered
        </span>
      </div>
    </div>
  );
}
