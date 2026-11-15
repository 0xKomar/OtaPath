"use client";

/**
 * MapScreen — OtaPath Phase 1 shell.
 * Full-bleed map + floating HUD: explored badge, wordmark, demo drawer,
 * unlock toasts, and the mission card. Mobile-first, warm paper chrome.
 */

import Link from "next/link";
import { useEffect } from "react";
import { HeartHandshake } from "lucide-react";
import MapLoader from "@/components/map/MapLoader";
import { MissionCard } from "@/components/hud/MissionCard";
import { CaptureModal } from "@/components/hud/CaptureModal";
import { MemorySheet } from "@/components/hud/MemorySheet";
import { MemoryEchoModal } from "@/components/hud/MemoryEchoModal";
import { ShareSheet } from "@/components/hud/ShareSheet";
import { BaselineModal } from "@/components/hud/BaselineModal";
import { DogNameSheet } from "@/components/hud/DogNameSheet";
import { SensoryPlayer } from "@/components/hud/SensoryPlayer";
import { BottomNav } from "@/components/hud/BottomNav";
import { useOtaStore } from "@/store/useOtaStore";
import { useSensoryComfort } from "@/lib/useSensoryComfort";
import { useBackendSync } from "@/lib/useBackendSync";
import { useUserLocation } from "@/lib/useUserLocation";
import { ContextPill } from "@/components/hud/ContextPill";

function ExploredBadge() {
  const pct = useOtaStore((s) => s.exploredPct);
  const discovered = useOtaStore((s) => s.discoveredIds.size);
  const memories = useOtaStore((s) => s.memories.length);
  return (
    <div className="card-tactile bg-cream px-4 py-2.5">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-charcoal/45">
        Neighborhood explored
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-display text-xl font-semibold tracking-tight tabular-nums">
          {pct.toFixed(1)}%
        </span>
        <div className="h-2 w-20 overflow-hidden rounded-full bg-butter">
          <div
            className="h-full rounded-full bg-tangerine transition-all duration-700"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      {(discovered > 0 || memories > 0) && (
        <p className="mt-0.5 font-sans text-[11px] font-bold text-forest">
          {discovered} found ·{" "}
          <Link href="/app/memories" className="underline underline-offset-2">
            {memories} memories →
          </Link>
        </p>
      )}
    </div>
  );
}

function Toasts() {
  const toasts = useOtaStore((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute bottom-48 left-1/2 z-[1200] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in rounded-full bg-ink-charcoal px-4 py-2 font-sans text-[13px] font-bold text-cream"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Sheets() {
  const captureOpen = useOtaStore((s) => s.captureOpen);
  const viewingMemoryId = useOtaStore((s) => s.viewingMemoryId);
  const echoMemoryId = useOtaStore((s) => s.echoMemoryId);
  return (
    <>
      {captureOpen && <CaptureModal />}
      {echoMemoryId && !captureOpen && <MemoryEchoModal />}
      <ShareSheet />
      <BaselineModal />
      {viewingMemoryId && !captureOpen && !echoMemoryId && (
        <div className="absolute inset-x-3 bottom-[86px] z-[1300]">
          <MemorySheet />
        </div>
      )}
    </>
  );
}

/** clinician → patient warm check-in chip, fades on its own */
function CareBadge() {
  const nudge = useOtaStore((s) => s.careNudge);
  if (!nudge) return null;
  return (
    <div className="toast-in card-tactile mt-2 flex items-center gap-2 bg-butter px-3.5 py-2">
      <HeartHandshake className="h-4 w-4 text-tangerine" strokeWidth={2.5} />
      <p className="font-sans text-[11px] font-bold text-ink-charcoal/75">
        care team · thinking of you — no reply needed
      </p>
    </div>
  );
}

export default function MapScreen() {
  useSensoryComfort();
  useBackendSync();
  useUserLocation();
  // persisted prefs (dog name, comfort toggles) read post-mount — keeps
  // the SSR paint and the client's first render identical
  useEffect(() => {
    useOtaStore.getState().hydrateFromStorage();
  }, []);
  return (
    <div className="app-nunito relative h-dvh w-full overflow-hidden">
      <MapLoader />

      {/* top-left: exploration badge (+ clinician care chip) — sits below
          the phone status bar / notch via safe-area inset */}
      <div className="absolute left-3 top-[max(12px,calc(env(safe-area-inset-top)+6px))] z-[1100]">
        <ExploredBadge />
        <CareBadge />
        <ContextPill />
      </div>

      <Toasts />

      {/* bottom: mission sheet peeks above the thumb nav on phones,
          floats above the sensory dock on ≥md */}
      <div className="absolute inset-x-3 bottom-[84px] z-[1100]">
        <MissionCard />
      </div>

      {/* persistent sensory player dock (md+) / thumb nav (mobile) */}
      <SensoryPlayer />
      <BottomNav />

      {/* capture + memory capsule + echo sheets */}
      <Sheets />
      <DogNameSheet />
    </div>
  );
}
