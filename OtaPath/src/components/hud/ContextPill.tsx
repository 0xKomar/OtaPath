"use client";

/**
 * ContextPill — "Today's Context" on the patient home screen.
 * Real life happens: flu, rain, a bed-bound morning. One tap tells
 * the app (and the care team) that today's low mobility is illness,
 * not relapse — and swaps the outdoor quest for a gentle window task.
 * Zero guilt, always reversible.
 */

import { useEffect, useRef, useState } from "react";
import { Home, Thermometer, Sun, ChevronDown } from "lucide-react";
import { useOtaStore, type TodayContext } from "@/store/useOtaStore";

const OPTIONS: { id: TodayContext; icon: typeof Sun; label: string; hint: string }[] = [
  { id: "auto", icon: Sun, label: "Up for a stroll", hint: "outdoor quests, as usual" },
  { id: "sick", icon: Thermometer, label: "Feeling unwell", hint: "rest day · window quest" },
  { id: "housebound", icon: Home, label: "Can't go out", hint: "daylight at the window" },
];

const LABEL: Record<TodayContext, string> = {
  auto: "today: outdoor",
  sick: "today: resting",
  housebound: "today: indoors",
};

export function ContextPill() {
  const ctx = useOtaStore((s) => s.todayContext);
  const setCtx = useOtaStore((s) => s.setTodayContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const Cur = OPTIONS.find((o) => o.id === ctx)!;

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="card-tactile flex items-center gap-1.5 bg-cream px-3 py-1.5"
      >
        <Cur.icon
          className={`h-3.5 w-3.5 ${ctx === "auto" ? "text-forest" : "text-tangerine"}`}
          strokeWidth={2.75}
        />
        <span className="font-sans text-[10px] font-extrabold uppercase tracking-wide text-ink-charcoal/55">
          {LABEL[ctx]}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-ink-charcoal/40 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={3}
        />
      </button>
      {open && (
        <div className="toast-in card-tactile absolute left-0 top-full z-[1150] mt-1.5 w-52 bg-cream p-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setCtx(o.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                ctx === o.id ? "bg-butter" : "active:bg-butter/50"
              }`}
            >
              <o.icon
                className={`h-4 w-4 shrink-0 ${o.id === "auto" ? "text-forest" : "text-tangerine"}`}
                strokeWidth={2.5}
              />
              <span className="min-w-0">
                <span className="block font-sans text-[12px] font-bold text-ink-charcoal">
                  {o.label}
                </span>
                <span className="block truncate font-sans text-[9.5px] font-semibold text-ink-charcoal/45">
                  {o.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
