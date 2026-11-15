/**
 * overpass.ts — real-world POI engine (position-strict).
 * Delegates to localPoiEngine: tiered Overpass queries around the
 * user's actual [lat,lng] (~150m-bucket localStorage cache, 6h TTL),
 * procedural local waypoints when the API can't answer. The Otaniemi
 * fallback set was removed — a POI must always be within 3 km of the
 * person holding the phone.
 */

import { fetchLocalPois } from "./localPoiEngine";
import type { POI } from "./poi";

const CACHE_TTL_MS = 6 * 3600 * 1000;

export type PoiSource = "live" | "procedural";
export interface PoiResult {
  pois: POI[];
  source: PoiSource;
}

function cacheKey(lat: number, lng: number) {
  // ~150m buckets → walking around the neighborhood reuses one fetch
  return `otapath:pois:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function readCache(lat: number, lng: number): POI[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const { at, pois } = JSON.parse(raw) as { at: number; pois: POI[] };
    if (Date.now() - at > CACHE_TTL_MS || !Array.isArray(pois)) return null;
    return pois;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, pois: POI[]) {
  try {
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify({ at: Date.now(), pois }));
  } catch {
    /* storage full / private mode — ignore */
  }
}

export async function fetchPois(lat: number, lng: number): Promise<PoiResult> {
  const cached = readCache(lat, lng);
  if (cached?.length) return { pois: cached, source: "live" };

  const { pois, source } = await fetchLocalPois(lat, lng);
  if (source === "live") writeCache(lat, lng, pois);
  return { pois, source };
}
