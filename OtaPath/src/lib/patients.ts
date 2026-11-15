/**
 * patients.ts — the clinician caseload cohort for /clinician.
 * Five post-TMS patients; the live demo user (Matti) is pinned first
 * and synced via BroadcastChannel — the rest are deterministic,
 * believable arcs so a clinician sees a real workload view.
 */

import { daySnap, type DaySnapshot } from "./biometricHistory";
import { computeTriage, type Triage, type TriageLevel } from "./triage";

export interface CohortPatient {
  id: string;
  name: string;
  initials: string;
  postTmsDay: number;
  note: string;
  /** avatar color — warm palette only */
  hue: "solar" | "forest" | "cobalt" | "blush" | "tangerine";
  history: DaySnapshot[];
  triage: Triage;
  live?: boolean;
}

export const TRIAGE_ORDER: Record<TriageLevel, number> = {
  INTERVENTION: 0,
  DRIFT: 1,
  STABLE: 2,
};

/** clinician-facing labels per the portal spec */
export const TRIAGE_LABEL: Record<TriageLevel, string> = {
  INTERVENTION: "NEEDS CHECK-IN",
  DRIFT: "EARLY DRIFT",
  STABLE: "STABLE",
};

type ArcShape = "crash" | "drift" | "stable-up" | "steady";

/** deterministic 14-day arc shaped per patient story */
function makeArc(shape: ArcShape, now: number): DaySnapshot[] {
  const mk = (d: number, p: Partial<Omit<DaySnapshot, "day" | "at">>) =>
    daySnap(now, d, p);
  switch (shape) {
    // sharp recent decline — needs a check-in call
    case "crash":
      return [
        mk(13, { prosody: 52, savoring: 60, mobility: 700, hrv: 43, luminance: 55, sleep: 60 }),
        mk(12, { prosody: 55, savoring: 64, mobility: 760, hrv: 44, luminance: 57, sleep: 61 }),
        mk(11, { prosody: 57, savoring: 66, mobility: 800, hrv: 44, luminance: 58, sleep: 62 }),
        mk(10, { prosody: 58, savoring: 68, mobility: 840, hrv: 45, luminance: 59, sleep: 62 }),
        mk(9, { prosody: 56, savoring: 66, mobility: 780, hrv: 44, luminance: 57, sleep: 61 }),
        mk(8, { prosody: 54, savoring: 63, mobility: 700, hrv: 43, luminance: 55, sleep: 60 }),
        mk(7, { prosody: 52, savoring: 60, mobility: 620, hrv: 42, luminance: 52, sleep: 58 }),
        mk(6, { prosody: 48, savoring: 54, mobility: 480, hrv: 40, luminance: 48, sleep: 55 }),
        mk(5, { prosody: 43, savoring: 46, mobility: 340, hrv: 37, luminance: 44, sleep: 51 }),
        mk(4, { prosody: 38, savoring: 39, mobility: 240, hrv: 34, luminance: 40, sleep: 48 }),
        mk(3, { prosody: 33, savoring: 33, mobility: 170, hrv: 31, luminance: 36, sleep: 45 }),
        mk(2, { prosody: 30, savoring: 28, mobility: 120, hrv: 29, luminance: 33, sleep: 43 }),
        mk(1, { prosody: 27, savoring: 24, mobility: 90, hrv: 27, luminance: 30, sleep: 41 }),
        mk(0, { prosody: 25, savoring: 21, mobility: 70, hrv: 26, luminance: 28, sleep: 40 }),
      ];
    // gentle softening — watch list
    case "drift":
      return [
        mk(13, { prosody: 50, savoring: 58, mobility: 640, hrv: 41, luminance: 52, sleep: 59 }),
        mk(12, { prosody: 53, savoring: 62, mobility: 700, hrv: 42, luminance: 55, sleep: 60 }),
        mk(11, { prosody: 56, savoring: 66, mobility: 760, hrv: 43, luminance: 58, sleep: 61 }),
        mk(10, { prosody: 58, savoring: 70, mobility: 820, hrv: 44, luminance: 60, sleep: 63 }),
        mk(9, { prosody: 60, savoring: 72, mobility: 860, hrv: 45, luminance: 62, sleep: 64 }),
        mk(8, { prosody: 61, savoring: 74, mobility: 880, hrv: 46, luminance: 63, sleep: 65 }),
        mk(7, { prosody: 60, savoring: 73, mobility: 850, hrv: 45, luminance: 62, sleep: 64 }),
        mk(6, { prosody: 58, savoring: 70, mobility: 790, hrv: 44, luminance: 60, sleep: 63 }),
        mk(5, { prosody: 56, savoring: 66, mobility: 690, hrv: 43, luminance: 57, sleep: 61 }),
        mk(4, { prosody: 53, savoring: 61, mobility: 560, hrv: 41, luminance: 54, sleep: 59 }),
        mk(3, { prosody: 50, savoring: 55, mobility: 420, hrv: 41, luminance: 50, sleep: 57 }),
        mk(2, { prosody: 48, savoring: 50, mobility: 330, hrv: 40, luminance: 47, sleep: 55 }),
        mk(1, { prosody: 46, savoring: 46, mobility: 260, hrv: 39, luminance: 45, sleep: 53 }),
        mk(0, { prosody: 45, savoring: 44, mobility: 230, hrv: 39, luminance: 44, sleep: 52 }),
      ];
    // improving steadily — remission holding
    case "stable-up":
      return [
        mk(13, { prosody: 44, savoring: 50, mobility: 480, hrv: 37, luminance: 46, sleep: 55 }),
        mk(12, { prosody: 47, savoring: 54, mobility: 540, hrv: 39, luminance: 49, sleep: 57 }),
        mk(11, { prosody: 51, savoring: 58, mobility: 610, hrv: 41, luminance: 52, sleep: 59 }),
        mk(10, { prosody: 55, savoring: 63, mobility: 700, hrv: 43, luminance: 56, sleep: 61 }),
        mk(9, { prosody: 58, savoring: 68, mobility: 780, hrv: 45, luminance: 59, sleep: 63 }),
        mk(8, { prosody: 61, savoring: 72, mobility: 860, hrv: 46, luminance: 62, sleep: 65 }),
        mk(7, { prosody: 63, savoring: 76, mobility: 940, hrv: 47, luminance: 64, sleep: 66 }),
        mk(6, { prosody: 64, savoring: 78, mobility: 980, hrv: 48, luminance: 65, sleep: 67 }),
        mk(5, { prosody: 66, savoring: 80, mobility: 1050, hrv: 49, luminance: 67, sleep: 68 }),
        mk(4, { prosody: 67, savoring: 82, mobility: 1120, hrv: 50, luminance: 68, sleep: 69 }),
        mk(3, { prosody: 68, savoring: 83, mobility: 1180, hrv: 50, luminance: 69, sleep: 70 }),
        mk(2, { prosody: 69, savoring: 84, mobility: 1240, hrv: 51, luminance: 70, sleep: 70 }),
        mk(1, { prosody: 70, savoring: 85, mobility: 1300, hrv: 52, luminance: 71, sleep: 71 }),
        mk(0, { prosody: 71, savoring: 86, mobility: 1360, hrv: 52, luminance: 72, sleep: 72 }),
      ];
    // flat healthy band — quietly steady
    case "steady":
      return [
        mk(13, { prosody: 60, savoring: 70, mobility: 900, hrv: 46, luminance: 62, sleep: 66 }),
        mk(12, { prosody: 62, savoring: 72, mobility: 940, hrv: 47, luminance: 63, sleep: 67 }),
        mk(11, { prosody: 59, savoring: 69, mobility: 870, hrv: 45, luminance: 61, sleep: 65 }),
        mk(10, { prosody: 61, savoring: 71, mobility: 920, hrv: 46, luminance: 62, sleep: 66 }),
        mk(9, { prosody: 63, savoring: 73, mobility: 960, hrv: 47, luminance: 64, sleep: 67 }),
        mk(8, { prosody: 62, savoring: 72, mobility: 930, hrv: 46, luminance: 63, sleep: 66 }),
        mk(7, { prosody: 61, savoring: 71, mobility: 910, hrv: 46, luminance: 62, sleep: 66 }),
        mk(6, { prosody: 63, savoring: 74, mobility: 980, hrv: 47, luminance: 64, sleep: 68 }),
        mk(5, { prosody: 64, savoring: 75, mobility: 1020, hrv: 48, luminance: 65, sleep: 68 }),
        mk(4, { prosody: 62, savoring: 73, mobility: 950, hrv: 47, luminance: 63, sleep: 67 }),
        mk(3, { prosody: 61, savoring: 72, mobility: 900, hrv: 46, luminance: 62, sleep: 66 }),
        mk(2, { prosody: 63, savoring: 74, mobility: 970, hrv: 47, luminance: 64, sleep: 68 }),
        mk(1, { prosody: 64, savoring: 75, mobility: 1010, hrv: 48, luminance: 65, sleep: 69 }),
        mk(0, { prosody: 63, savoring: 74, mobility: 990, hrv: 47, luminance: 64, sleep: 68 }),
      ];
  }
}

/** the 5-patient caseload; Matti is the live-synced demo patient */
export function cohort(): Omit<CohortPatient, "history" | "triage" | "live">[] {
  return [
    { id: "matti", name: "Matti Virtanen", initials: "MV", postTmsDay: 18, note: "rTMS · DLPFC protocol", hue: "solar" },
    { id: "eero", name: "Eero Niemi", initials: "EN", postTmsDay: 11, note: "iTBS · week 2", hue: "tangerine" },
    { id: "sofia", name: "Sofia Ranta", initials: "SR", postTmsDay: 9, note: "rTMS · week 2", hue: "blush" },
    { id: "aino", name: "Aino Laine", initials: "AL", postTmsDay: 24, note: "rTMS · maintenance", hue: "forest" },
    { id: "vilho", name: "Vilho Kettunen", initials: "VK", postTmsDay: 31, note: "rTMS · maintenance", hue: "cobalt" },
  ];
}

const SHAPE: Record<string, ArcShape> = {
  eero: "crash",
  sofia: "drift",
  aino: "stable-up",
  vilho: "steady",
};

/** full patient rows (history + triage) for everyone except the live user */
export function staticPatients(now: number): CohortPatient[] {
  return cohort()
    .filter((p) => p.id !== "matti")
    .map((p) => {
      const history = makeArc(SHAPE[p.id], now);
      return { ...p, history, triage: computeTriage(history) };
    });
}

/** plain-language clinical brief per triage level */
export function clinicalBrief(p: CohortPatient): string {
  const base = p.triage.summary;
  if (p.triage.level === "INTERVENTION")
    return `Early Relapse Drift Detected (72h trend): ${base.replace(/^3-day negative drift detected: /, "").replace(/\.$/, "")}. Recommend a 5-minute supportive check-in call.`;
  if (p.triage.level === "STABLE") {
    const latest = p.history[p.history.length - 1];
    return `Post-TMS Remission Sustained: regular outdoor exploration (${(latest.mobility / 1000).toFixed(1)}km radius), rich sensory descriptions, and steady 14-day signal. ${base}`;
  }
  return `Watch list — ${base}`;
}
