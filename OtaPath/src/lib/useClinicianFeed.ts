/**
 * useClinicianFeed.ts — subscribes to the patient app's LoopSnapshots.
 * Sources in priority order: BroadcastChannel (live) → localStorage
 * (cold start) → a seeded fallback so /clinician and /demo always
 * render a full, believable board even before the app first runs.
 */

"use client";

import { useEffect, useState } from "react";
import {
  CHANNEL,
  readStoredSnapshot,
  type LoopSnapshot,
} from "./broadcast";
import { FIXED_EPOCH } from "./useNow";
import { seedHistory } from "./biometricHistory";
import { computeTriage } from "./triage";
import { seededEngine } from "./closedLoopEngine";

export function seedFeed(now = Date.now()): LoopSnapshot {
  const history = seedHistory(now);
  return {
    v: 1,
    at: now,
    patientState: "LOW",
    biometrics: {
      hrv: 35,
      sleepRegularity: 50,
      voiceProsody: 43,
      nlpSavoring: 41,
      photoVibrancy: 52,
      photoLuminance: 44,
    },
    mobilityM: 140,
    memoryCount: 0,
    recentMemories: [],
    history,
    triage: computeTriage(history),
    insight: seededEngine(now).insight(),
    loopEvents: {},
    lastCapture: null,
  };
}

export function useClinicianFeed(): LoopSnapshot {
  // deterministic first paint (server & hydration agree); real data
  // lands on the first microtask from localStorage / BroadcastChannel
  const [snap, setSnap] = useState<LoopSnapshot>(() => seedFeed(FIXED_EPOCH));

  useEffect(() => {
    const stored = readStoredSnapshot();
    if (stored) queueMicrotask(() => setSnap(stored));
    if (!("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => {
      if (e.data?.type === "snapshot") setSnap(e.data.payload as LoopSnapshot);
    };
    return () => bc.close();
  }, []);

  return snap;
}
