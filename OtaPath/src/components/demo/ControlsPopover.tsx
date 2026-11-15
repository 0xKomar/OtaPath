"use client";

/**
 * ControlsPopover — the demo remote, parked in the /demo header next to
 * the portal links. Click toggles a floating panel with DemoControls so
 * the phone + deck keep the whole stage.
 */

import { useEffect, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { DemoControls } from "./DemoControls";

export function ControlsPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-[11px] font-bold transition-colors ${
          open
            ? "bg-[#1C1917] text-white"
            : "border border-[#E6E6E3] text-zinc-600 hover:border-[#D1D1CD] hover:bg-[#FAFAF9]"
        }`}
      >
        <Gamepad2 className="h-3.5 w-3.5" strokeWidth={2.25} />
        Demo controls
      </button>
      {open && (
        <div className="ota-pop-in absolute right-0 top-[calc(100%+10px)] z-50 w-[min(88vw,560px)]">
          <div className="max-h-[72dvh] overflow-y-auto rounded-xl shadow-[0_24px_60px_-16px_rgba(28,25,23,0.4)]">
            <DemoControls />
          </div>
        </div>
      )}
    </div>
  );
}
