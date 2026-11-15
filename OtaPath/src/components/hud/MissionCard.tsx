"use client";

/**
 * MissionCard — the current Photo-Hunt + Savoring mission, as a
 * progressive-disclosure bottom sheet. On phones it peeks as a single
 * row (tier + one line + chevron) so ≥65% of the map stays visible;
 * a tap springs it open. On ≥768px it renders fully expanded.
 * Nothing assigned → the world gently naps, never a warning.
 */

import { useState } from "react";
import { Camera, ChevronUp, Footprints, MoonStar, Stethoscope, UserPlus } from "lucide-react";
import { TIER_META } from "@/lib/poi";
import { useOtaStore } from "@/store/useOtaStore";
import { OtaButton } from "@/components/ui/OtaButton";

const TIER_BG = { nature: "bg-forest", culture: "bg-cobalt", sport: "bg-tangerine" } as const;

export function MissionCard() {
  const mission = useOtaStore((s) => s.activeMission);
  const poisLoading = useOtaStore((s) => s.poisLoading);
  const openCapture = useOtaStore((s) => s.openCapture);
  const difficulty = useOtaStore((s) => s.missionDifficulty);
  const dogName = useOtaStore((s) => s.dogName);
  const [open, setOpen] = useState(false);

  if (!mission) {
    return (
      <div className="card-tactile flex items-center gap-4 bg-butter p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-solar">
          <MoonStar className="h-5 w-5 text-ink-charcoal" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">
            The world is <em className="italic">napping</em> under the mist
          </p>
          <p className="font-sans text-sm font-medium text-ink-charcoal/60">
            {poisLoading
              ? "Listening for friendly places nearby…"
              : dogName
                ? `${dogName} is ready for a tiny step whenever you are.`
                : "Take a tiny step whenever you feel ready."}
          </p>
        </div>
      </div>
    );
  }

  const meta = TIER_META[mission.tier];
  const dist =
    mission.distanceM >= 950
      ? `${(mission.distanceM / 1000).toFixed(1)} km`
      : `${mission.distanceM} m`;

  return (
    <div className="card-tactile bg-butter px-4 py-3">
      {/* peek row — always visible, tap to spring open */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wide text-cream ${TIER_BG[mission.tier]}`}
        >
          <Footprints className="h-3.5 w-3.5" strokeWidth={2.75} />
          {meta.label} · {dist}
        </span>
        <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-semibold text-ink-charcoal/70">
          {mission.text}
        </span>
        {difficulty !== "standard" && (
          <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 font-sans text-[9px] font-extrabold uppercase tracking-wide text-ink-charcoal/50">
            {difficulty === "gentle" ? "gentler" : "stretch"}
          </span>
        )}
        {mission.assignedBy === "CLINICIAN_CUSTOM" && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-blush px-2 py-0.5 font-sans text-[9px] font-extrabold uppercase tracking-wide text-cream">
            <Stethoscope className="h-3 w-3" strokeWidth={3} />
            {mission.doctorName ?? "your doctor"}
          </span>
        )}
        <ChevronUp
          className={`h-4 w-4 shrink-0 text-ink-charcoal/45 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          strokeWidth={2.75}
        />
      </button>

      {/* expanded body — spring grid-rows */}
      <div className="mission-body" data-open={open}>
        <div>
          <p className="mt-3 font-sans text-[15px] font-semibold leading-snug text-ink-charcoal">
            {mission.text}
          </p>
          {mission.clinicianNote && (
            <p className="mt-2 rounded-2xl border-b-2 border-stone-900/10 bg-cream px-3.5 py-2.5 font-display text-[14px] italic leading-snug text-ink-charcoal/75">
              “{mission.clinicianNote}”
            </p>
          )}
          {(mission.photoPrompt || mission.voicePrompt) && (
            <div className="mt-2 space-y-1">
              {mission.photoPrompt && (
                <p className="font-sans text-[12px] font-semibold text-ink-charcoal/55">
                  📷 {mission.photoPrompt}
                </p>
              )}
              {mission.voicePrompt && (
                <p className="font-sans text-[12px] font-semibold text-ink-charcoal/55">
                  🎙 {mission.voicePrompt}
                </p>
              )}
            </div>
          )}
          <div className="mt-3.5 flex items-center gap-3">
            <OtaButton size="sm" onClick={() => openCapture()}>
              <Camera className="h-4 w-4" strokeWidth={2.75} />
              Complete mission
            </OtaButton>
            <button
              type="button"
              onClick={() => useOtaStore.getState().setShareOpen(true)}
              className="flex items-center gap-1.5 rounded-full px-2 py-1.5 font-sans text-[11px] font-bold text-ink-charcoal/50 underline underline-offset-4 transition-colors active:text-tangerine"
            >
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2.75} />
              invite a friend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
