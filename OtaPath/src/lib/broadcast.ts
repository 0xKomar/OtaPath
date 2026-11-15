/**
 * broadcast.ts — cross-tab closed-loop bridge.
 * The patient app (same tab, iframe, or a separate browser tab/window)
 * publishes compact LoopSnapshots over BroadcastChannel + a
 * localStorage copy for cold-start paints. /clinician and /demo
 * subscribe — that's the real-time "loop proof" for the stage.
 */

import type { Biometrics, MemoryCapsule } from "@/store/useOtaStore";
import type { DaySnapshot } from "./biometricHistory";
import type { Triage } from "./triage";
import type { PatientState } from "./poi";

export const CHANNEL = "otapath-loop";
export const STORAGE_KEY = "otapath-snapshot";
/** clinician → patient direction: warm check-ins + mission difficulty */
export const NUDGE_CHANNEL = "otapath-nudge";
/** stage-demo → patient direction: simulator commands from /demo */
export const DEMO_CHANNEL = "otapath-demo";

export type DemoMsg =
  | { t: "walk" }
  | { t: "reset" }
  | { t: "seed" }
  | { t: "baseline" }
  | { t: "state"; s: "LOW" | "MODERATE" | "HIGH" }
  | { t: "dog"; name: string }
  | { t: "motion"; v: "full" | "soft" }
  | { t: "theme"; v: "day" | "candle" }
  | { t: "locate" }
  | { t: "context"; v: "auto" | "sick" | "housebound" }
  | { t: "iaf"; hz: number }
  | { t: "sensory"; open: boolean }
  | { t: "capture"; open: boolean; step?: 1 | 2 };

export function publishDemo(msg: DemoMsg) {
  if (typeof window === "undefined") return;
  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(DEMO_CHANNEL);
    bc.postMessage(msg);
    bc.close();
  }
}

export interface NudgeMsg {
  type: "checkin" | "difficulty";
  level?: "gentle" | "standard" | "stretch";
  patientId?: string;
  at: number;
}

export function publishNudge(msg: Omit<NudgeMsg, "at">) {
  if (typeof window === "undefined") return;
  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(NUDGE_CHANNEL);
    bc.postMessage({ ...msg, at: Date.now() });
    bc.close();
  }
}

export type LoopStage = "SENSE" | "INFER" | "ACT" | "LEARN";

export interface LoopEvent {
  stage: LoopStage;
  label: string;
  at: number;
}

export interface LastCapture {
  transcript?: string;
  savoringScore?: number;
  valence?: number;
  themes?: string[];
  acousticScore?: number;
  luminance?: number;
  vibrancy?: number;
}

export interface LoopSnapshot {
  v: 1;
  at: number;
  patientState: PatientState;
  biometrics: Biometrics;
  mobilityM: number;
  memoryCount: number;
  recentMemories: Pick<
    MemoryCapsule,
    "id" | "poiName" | "at" | "kind" | "themes" | "savoringScore"
  >[];
  history: DaySnapshot[];
  triage: Triage;
  insight: string | null;
  loopEvents: Partial<Record<LoopStage, LoopEvent>>;
  lastCapture: LastCapture | null;
  /** discharge-day baseline from the calibration modal (may be absent) */
  baseline?: {
    prosody: number;
    savoring: number;
    mobility: number;
    hrv: number;
    luminance: number;
    sleep: number;
    at: number;
  } | null;
  /** stage-demo readbacks — let the /demo control panel mirror the app */
  simRunning?: boolean;
  dogName?: string | null;
  comfortMotion?: "full" | "soft";
  comfortTheme?: "day" | "candle";
  exploredPct?: number;
  activeMissionName?: string | null;
  /** patient's live [lat,lng] + fix source — clinician map tools anchor here */
  userPosition?: [number, number];
  locationSource?: "demo" | "gps" | "ip";
  /** "sick" | "housebound" when the patient paused outdoor quests today */
  contextFlag?: "auto" | "sick" | "housebound";
  /** Individual Alpha Frequency — clinician-tunable binaural beat */
  iafHz?: number;
}

export function publishSnapshot(snap: LoopSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* quota — snapshot is best-effort */
  }
  if ("BroadcastChannel" in window) {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: "snapshot", payload: snap });
    bc.close();
  }
}

export function readStoredSnapshot(): LoopSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoopSnapshot) : null;
  } catch {
    return null;
  }
}
