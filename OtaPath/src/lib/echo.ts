/**
 * echo.ts — Memory Echo rules.
 * Capsules older than 7 days frost over on the map; tapping one opens
 * the zero-guilt recall challenge. Once echoed (or revealed), the pin
 * re-illuminates forever.
 */

import type { MemoryCapsule } from "@/store/useOtaStore";

export const ECHO_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function daysOld(m: MemoryCapsule, now = Date.now()): number {
  return Math.max(0, Math.floor((now - m.at) / 86_400_000));
}

/** true while the capsule is ≥7d old and hasn't been echoed yet */
export function isEcho(m: MemoryCapsule, now = Date.now()): boolean {
  return now - m.at >= ECHO_AGE_MS && !m.echoedAt;
}

/** context-anchored recall prompt built from the capsule's own data */
export function echoQuestion(m: MemoryCapsule, now = Date.now()): string {
  const d = Math.max(7, daysOld(m, now));
  const what =
    m.themes?.[0] ??
    (m.kind === "photo" ? "a photo" : m.kind === "voice" ? "a voice note" : "a moment");
  return `${d} days ago near ${m.poiName}, you captured ${what === "a photo" || what === "a voice note" || what === "a moment" ? what : `something about ${what}`} that caught your eye. Take 10 seconds to recall — what was it, or how did that place feel?`;
}

/** rough recall-overlap score: shared words between answer + original */
export function recallOverlap(answer: string, m: MemoryCapsule): number {
  const stop = new Set(["the", "a", "an", "and", "was", "is", "it", "of", "in", "to", "i", "my", "that", "so", "very", "with"]);
  const ws = (s: string) =>
    new Set((s.toLowerCase().match(/[a-zäöå']+/g) ?? []).filter((w) => w.length > 2 && !stop.has(w)));
  const a = ws(answer);
  const b = ws(`${m.transcript ?? ""} ${(m.themes ?? []).join(" ")} ${m.poiName}`);
  if (a.size === 0 || b.size === 0) return 0;
  let hit = 0;
  a.forEach((w) => b.has(w) && hit++);
  return Math.min(100, Math.round((hit / Math.min(a.size, 8)) * 100));
}
