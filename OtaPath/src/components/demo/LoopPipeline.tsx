"use client";

/**
 * LoopPipeline — SENSE → INFER → ACT → LEARN live diagram.
 * Each node lights for ~9s when its stage last fired (fed by the
 * patient's BroadcastChannel LoopSnapshot), with the latest event
 * label underneath. A 2s tick keeps the lighting honest.
 */

import { Ear, Brain, Footprints, TrendingUp } from "lucide-react";
import { useClinicianFeed } from "@/lib/useClinicianFeed";
import { useNow } from "@/lib/useNow";
import type { LoopStage } from "@/lib/broadcast";

const STAGES: { id: LoopStage; icon: typeof Ear; label: string; sub: string }[] = [
  { id: "SENSE", icon: Ear, label: "SENSE", sub: "voice · photo · GPS" },
  { id: "INFER", icon: Brain, label: "INFER", sub: "biometric blend" },
  { id: "ACT", icon: Footprints, label: "ACT", sub: "missions · sound" },
  { id: "LEARN", icon: TrendingUp, label: "LEARN", sub: "bandit outcome" },
];

const LIT_MS = 9000;

export function LoopPipeline() {
  const snap = useClinicianFeed();
  const now = useNow(2000);

  return (
    <div className="rounded-xl border border-[#E6E6E3] bg-white p-4">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
        Closed-loop brain
      </p>
      <div className="mt-3 flex items-stretch gap-1.5">
        {STAGES.map((s, i) => {
          const ev = snap.loopEvents[s.id];
          const lit = ev != null && now - ev.at < LIT_MS;
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-1.5">
              <div className="flex-1">
                <div
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-500 ${
                    lit
                      ? "border-[#FF6B2B]/40 bg-[#FFF4EC]"
                      : "border-[#E6E6E3] bg-[#FAFAF9]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ${
                      lit
                        ? "bg-[#FF6B2B] text-white"
                        : "border border-[#E6E6E3] bg-white text-zinc-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`font-sans text-[11px] font-extrabold tracking-wide transition-colors duration-500 ${
                        lit ? "text-zinc-900" : "text-zinc-600"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p
                      className={`truncate font-sans text-[9px] font-bold transition-colors duration-500 ${
                        lit ? "text-[#FF6B2B]" : "text-zinc-400"
                      }`}
                    >
                      {lit && ev ? ev.label : s.sub}
                    </p>
                  </div>
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <span
                  className={`font-sans text-sm font-bold transition-colors duration-500 ${
                    lit ? "text-[#FF6B2B]" : "text-zinc-300"
                  }`}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
