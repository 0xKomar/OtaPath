/**
 * triage.ts — zero-workload clinician triage.
 * Computes a 3-level status + a single human-readable "why" sentence
 * from the 7-day biomarker arc. Psychological-safety note: the patient
 * UI never shows this — it's clinician-facing only.
 */

import type { DaySnapshot } from "./biometricHistory";

export type TriageLevel = "STABLE" | "DRIFT" | "INTERVENTION";

export interface Triage {
  level: TriageLevel;
  label: string;
  cls: string; // tailwind classes for the pill
  summary: string;
}

const pct = (a: number, b: number) => (a === 0 ? 0 : Math.round(((b - a) / a) * 100));

export function computeTriage(h: DaySnapshot[], contextFlag?: string): Triage {
  // patient marked themselves unwell/housebound — low mobility today is
  // illness, not psychiatric relapse. Drop mobility from the drift score.
  const resting = contextFlag === "sick" || contextFlag === "housebound";
  if (h.length < 4)
    return {
      level: "STABLE",
      label: "STABLE · GREEN",
      cls: "bg-forest text-cream",
      summary: "Not enough signal yet — baseline still forming.",
    };

  const last3 = h.slice(-3);
  const prev3 = h.slice(-6, -3);
  const avg = (xs: DaySnapshot[], k: keyof Omit<DaySnapshot, "day" | "at">) =>
    xs.reduce((a, d) => a + d[k], 0) / xs.length;

  const dProsody = pct(avg(prev3, "prosody"), avg(last3, "prosody"));
  const dSavoring = pct(avg(prev3, "savoring"), avg(last3, "savoring"));
  const dHrv = pct(avg(prev3, "hrv"), avg(last3, "hrv"));
  const mobilityNow = last3[last3.length - 1].mobility;
  const savoringFrom = Math.round(prev3[prev3.length - 1]?.savoring ?? 0);
  const savoringTo = Math.round(last3[last3.length - 1].savoring);

  const negatives = [
    dProsody < -12 && `vocal pitch variance ${dProsody}%`,
    dSavoring < -15 && `sensory savoring dropped from ${savoringFrom} to ${savoringTo}`,
    !resting && mobilityNow < 200 && `mobility radius shrunk to <200m`,
    dHrv < -8 && `HRV down ${dHrv}%`,
  ].filter(Boolean) as string[];

  const score =
    (dProsody < -12 ? 1 : 0) +
    (dSavoring < -15 ? 1 : 0) +
    (!resting && mobilityNow < 200 ? 1 : 0) +
    (dHrv < -8 ? 1 : 0);

  if (score >= 3)
    return {
      level: "INTERVENTION",
      label: "INTERVENTION NEEDED · RED",
      cls: "bg-tangerine text-cream",
      summary: `3-day negative drift detected: ${negatives.slice(0, 3).join(", ")}. Recommend a 5-minute check-in call.`,
    };
  if (score >= 1)
    return {
      level: "DRIFT",
      label: "EARLY DRIFT · YELLOW",
      cls: "bg-solar text-ink-charcoal",
      summary: `Early drift forming: ${negatives.slice(0, 2).join(", ") || "signal softening"}. Watch this week — gentle check-in if it continues.`,
    };
  const ups = [
    dSavoring > 8 && `savoring ${dSavoring > 0 ? "+" : ""}${dSavoring}%`,
    dProsody > 8 && `vocal energy +${dProsody}%`,
    mobilityNow > 600 && `exploring ${mobilityNow}m+`,
  ].filter(Boolean) as string[];
  return {
    level: "STABLE",
    label: "STABLE · GREEN",
    cls: "bg-forest text-cream",
    summary: ups.length
      ? `Holding steady, with bright spots: ${ups.slice(0, 2).join(", ")}.`
      : "Signals steady across the week — no drift detected.",
  };
}
