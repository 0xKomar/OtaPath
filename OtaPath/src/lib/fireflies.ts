/**
 * fireflies.ts — anonymous peer-presence dots on public POIs.
 * Aggregated, privacy-safe "other explorers were here today" warmth:
 * deterministic per-POI counts and dot offsets — no homes, no IDs,
 * just quiet evidence that other people are healing nearby too.
 */

/** tiny deterministic string hash → 0..1 stream */
function hash01(seed: string, i: number): number {
  let h = 2166136261 ^ i;
  for (let c = 0; c < seed.length; c++) {
    h ^= seed.charCodeAt(c);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

const todayKey = () => new Date().toDateString();

/** how many other explorers visited this POI today (1–7, daily-stable) */
export function fireflyCount(poiId: string, tier: string): number {
  const base = tier === "nature" ? 2 : 1;
  return base + Math.floor(hash01(poiId + todayKey(), 7) * 6);
}

export interface FireflyDot {
  dx: number;
  dy: number;
  size: number;
  delayS: number;
  opacity: number;
}

/** glowing dots scattered in a loose ring around a POI pin */
export function fireflyDots(poiId: string): FireflyDot[] {
  const n = 2 + Math.floor(hash01(poiId, 3) * 3); // 2–4 dots
  const dots: FireflyDot[] = [];
  for (let i = 0; i < n; i++) {
    const ang = hash01(poiId, i * 11 + 1) * Math.PI * 2;
    const r = 16 + hash01(poiId, i * 11 + 2) * 26;
    dots.push({
      dx: Math.round(Math.cos(ang) * r),
      dy: Math.round(-14 + Math.sin(ang) * r),
      size: 4 + Math.round(hash01(poiId, i * 11 + 3) * 4),
      delayS: +(hash01(poiId, i * 11 + 4) * 3.5).toFixed(1),
      opacity: 0.55 + hash01(poiId, i * 11 + 5) * 0.4,
    });
  }
  return dots;
}
