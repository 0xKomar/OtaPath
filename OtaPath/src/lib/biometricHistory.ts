/**
 * biometricHistory.ts — 14-day longitudinal signal snapshots feeding
 * the clinician dashboard. Seeded with a believable post-TMS arc:
 * strong early recovery after discharge, a plateau, then the current
 * 3-day dip that triage flags. Today's bucket gets live-blended as
 * real captures happen.
 */

import type { Biometrics } from "@/store/useOtaStore";

export interface DaySnapshot {
  /** day label like "Mon" */
  day: string;
  at: number;
  prosody: number; // voice pitch-variance & energy composite
  savoring: number; // NLP savoring + recall index
  mobility: number; // exploration radius in meters
  hrv: number;
  luminance: number;
  sleep: number;
}

const DAY = 86_400_000;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const HISTORY_DAYS = 14;

/** build one DaySnapshot `daysAgo` back from `now` */
export function daySnap(
  now: number,
  daysAgo: number,
  p: Partial<Omit<DaySnapshot, "day" | "at">>
): DaySnapshot {
  const at = now - daysAgo * DAY;
  return {
    day: DOW[new Date(at).getDay()],
    at,
    prosody: 0,
    savoring: 0,
    mobility: 0,
    hrv: 0,
    luminance: 0,
    sleep: 0,
    ...p,
  };
}

/** seeded 14-day arc — post-discharge recovery, plateau, current 3-day dip */
export function seedHistory(now = Date.now()): DaySnapshot[] {
  const mk = (d: number, p: Partial<Omit<DaySnapshot, "day" | "at">>) =>
    daySnap(now, d, p);
  return [
    mk(13, { prosody: 41, savoring: 48, mobility: 420, hrv: 36, luminance: 44, sleep: 58 }),
    mk(12, { prosody: 46, savoring: 55, mobility: 520, hrv: 38, luminance: 48, sleep: 60 }),
    mk(11, { prosody: 51, savoring: 62, mobility: 640, hrv: 41, luminance: 54, sleep: 62 }),
    mk(10, { prosody: 54, savoring: 66, mobility: 710, hrv: 42, luminance: 57, sleep: 63 }),
    mk(9, { prosody: 57, savoring: 71, mobility: 790, hrv: 44, luminance: 60, sleep: 65 }),
    mk(8, { prosody: 59, savoring: 74, mobility: 830, hrv: 45, luminance: 62, sleep: 66 }),
    mk(7, { prosody: 60, savoring: 76, mobility: 880, hrv: 45, luminance: 62, sleep: 67 }),
    mk(6, { prosody: 58, savoring: 74, mobility: 860, hrv: 44, luminance: 61, sleep: 66 }),
    mk(5, { prosody: 61, savoring: 78, mobility: 940, hrv: 45, luminance: 64, sleep: 68 }),
    mk(4, { prosody: 57, savoring: 72, mobility: 720, hrv: 43, luminance: 60, sleep: 64 }),
    mk(3, { prosody: 52, savoring: 63, mobility: 480, hrv: 40, luminance: 55, sleep: 58 }),
    mk(2, { prosody: 47, savoring: 52, mobility: 310, hrv: 38, luminance: 49, sleep: 55 }),
    mk(1, { prosody: 44, savoring: 45, mobility: 210, hrv: 36, luminance: 46, sleep: 52 }),
    mk(0, { prosody: 43, savoring: 41, mobility: 140, hrv: 35, luminance: 44, sleep: 50 }),
  ];
}

/** discharge-baseline composite — mean of the first 3 days */
export function dischargeBaseline(h: DaySnapshot[]) {
  const d = h.slice(0, 3);
  const avg = (k: keyof Omit<DaySnapshot, "day" | "at">) =>
    Math.round(d.reduce((a, x) => a + x[k], 0) / Math.max(1, d.length));
  return {
    prosody: avg("prosody"),
    savoring: avg("savoring"),
    mobility: avg("mobility"),
    hrv: avg("hrv"),
    luminance: avg("luminance"),
    sleep: avg("sleep"),
  };
}

/** blend today's live biometrics + mobility into the last snapshot */
export function mergeToday(
  history: DaySnapshot[],
  b: Biometrics,
  mobilityM: number,
  now = Date.now()
): DaySnapshot[] {
  const last = history[history.length - 1];
  const sameDay = last && new Date(last.at).toDateString() === new Date(now).toDateString();
  const snap: DaySnapshot = {
    day: DOW[new Date(now).getDay()],
    at: now,
    prosody: Math.round(b.voiceProsody),
    savoring: Math.round(b.nlpSavoring),
    mobility: Math.round(mobilityM),
    hrv: Math.round(b.hrv),
    luminance: Math.round(b.photoLuminance),
    sleep: Math.round(b.sleepRegularity),
  };
  if (sameDay) return [...history.slice(0, -1), snap];
  return [...history.slice(-(HISTORY_DAYS - 1)), snap];
}

/** max pairwise distance across the walked path — mobility radius proxy */
export function mobilityRadiusM(path: [number, number][], seed = 140): number {
  if (path.length < 2) return seed;
  let max = 0;
  for (let i = 0; i < path.length; i++)
    for (let j = i + 1; j < path.length; j++) {
      const dy = (path[i][0] - path[j][0]) * 111_320;
      const dx = (path[i][1] - path[j][1]) * 111_320 * Math.cos((path[i][0] * Math.PI) / 180);
      const d = Math.hypot(dx, dy);
      if (d > max) max = d;
    }
  return Math.max(seed, Math.round(max));
}
