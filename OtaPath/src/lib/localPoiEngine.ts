/**
 * localPoiEngine.ts — strict-locality POI engine.
 *
 * Every candidate lives within walking distance of the user's REAL
 * position — never a hardcoded city. Three layers:
 *   1. Overpass API queried per tier around [lat,lng]
 *      (nature ≤500 m · culture ≤1500 m · sport ≤2500 m),
 *   2. procedural waypoints generated 150–900 m away on real bearings
 *      when Overpass is slow/empty/offline,
 *   3. a hard Haversine guardrail (≤3.0 km) applied everywhere.
 */

import { destPoint, haversineM, type LatLng } from "./geo";
import type { POI, PoiTier } from "./poi";

/** missions never target anything farther than this from the user */
export const MAX_POI_DIST_M = 3000;

/** per-tier search radii (walkable, not aspirational) */
const TIER_RADIUS: Record<PoiTier, number> = {
  nature: 500,
  culture: 1500,
  sport: 2500,
};

const TIER_QUERY: Record<PoiTier, string[]> = {
  nature: [
    `nwr["leisure"~"^(park|garden|nature_reserve|recreation_ground)$"]`,
    `nwr["natural"~"^(water|beach|wood)$"]`,
  ],
  culture: [
    `nwr["amenity"~"^(cinema|library|theatre|arts_centre|community_centre|cafe)$"]`,
    `nwr["tourism"~"^(museum|gallery)$"]`,
  ],
  sport: [
    `nwr["leisure"~"^(sports_centre|fitness_centre|swimming_pool|stadium)$"]`,
    `nwr["amenity"~"^(gym)$"]`,
  ],
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const TIER_FALLBACK_NAME: Record<PoiTier, string> = {
  nature: "Quiet green spot",
  culture: "Cultural spot",
  sport: "Sports place",
};

function classify(tags: Record<string, string>): PoiTier | null {
  const leisure = tags.leisure ?? "";
  const natural = tags.natural ?? "";
  const amenity = tags.amenity ?? "";
  const tourism = tags.tourism ?? "";
  if (/^(sports_centre|fitness_centre|swimming_pool|stadium)$/.test(leisure) || amenity === "gym")
    return "sport";
  if (/^(cinema|library|theatre|arts_centre|community_centre|cafe)$/.test(amenity) || /^(museum|gallery)$/.test(tourism))
    return "culture";
  if (/^(park|garden|nature_reserve|recreation_ground)$/.test(leisure) || /^(water|beach|wood)$/.test(natural))
    return "nature";
  return null;
}

/** one Overpass request, three tier-scoped around() clauses */
function tieredQuery(lat: number, lng: number) {
  const parts = (Object.keys(TIER_QUERY) as PoiTier[]).flatMap((tier) =>
    TIER_QUERY[tier].map((sel) => `${sel}(around:${TIER_RADIUS[tier]},${lat},${lng});`)
  );
  return `[out:json][timeout:12];(${parts.join("\n")});out center tags 60;`;
}

function toPois(elements: OverpassElement[]): POI[] {
  const seen = new Set<string>();
  const out: POI[] = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tier = el.tags ? classify(el.tags) : null;
    if (lat == null || lng == null || !tier) continue;
    const name = el.tags?.name ?? el.tags?.["name:en"] ?? TIER_FALLBACK_NAME[tier];
    const key = `${name}:${Math.round(lat * 500)}:${Math.round(lng * 500)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `${el.type}/${el.id}`, name, tier, lat, lng });
  }
  return out;
}

/** hard Haversine guardrail — drops anything >3.0 km from `from` */
export function guardNearby<T extends { lat: number; lng: number }>(
  items: T[],
  from: LatLng,
  maxM = MAX_POI_DIST_M
): T[] {
  return items.filter((p) => haversineM(from, [p.lat, p.lng]) <= maxM);
}

/**
 * Procedural nearby waypoints — used ONLY when Overpass can't answer.
 * Generated around the user's exact position (150–900 m out, spread on
 * different bearings), so a mission is always a real local stroll.
 */
export function proceduralPois(from: LatLng): POI[] {
  const defs: { name: string; tier: PoiTier; bearing: number; dist: number }[] = [
    { name: "Nearest green corner", tier: "nature", bearing: 30, dist: 240 },
    { name: "Quiet bench spot", tier: "nature", bearing: 160, dist: 420 },
    { name: "Sunny patch by the path", tier: "nature", bearing: 300, dist: 620 },
    { name: "Corner café window", tier: "culture", bearing: 80, dist: 520 },
    { name: "Neighborhood notice board", tier: "culture", bearing: 220, dist: 700 },
    { name: "Local storefront art", tier: "culture", bearing: 350, dist: 880 },
    { name: "Open courtyard stretch", tier: "sport", bearing: 120, dist: 480 },
    { name: "Long-block lap", tier: "sport", bearing: 260, dist: 840 },
  ];
  return defs.map((d, i) => {
    const [lat, lng] = destPoint(from, d.bearing, d.dist);
    return { id: `local-${i}-${Math.round(d.dist)}`, name: d.name, tier: d.tier, lat, lng };
  });
}

export type LocalPoiSource = "live" | "procedural";
export interface LocalPoiResult {
  pois: POI[];
  source: LocalPoiSource;
}

/**
 * Real POIs around [lat,lng] — tier-scoped Overpass query, ~7s budget,
 * then procedural local waypoints. Every result passes the 3 km guard.
 */
export async function fetchLocalPois(lat: number, lng: number): Promise<LocalPoiResult> {
  if (typeof window === "undefined")
    return { pois: proceduralPois([lat, lng]), source: "procedural" };

  const from: LatLng = [lat, lng];
  const q = tieredQuery(lat, lng);
  const attempt = async (endpoint: string): Promise<POI[] | null> => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(q)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const pois = guardNearby(
        toPois(json.elements ?? []).sort(
          (a, b) => haversineM(from, [a.lat, a.lng]) - haversineM(from, [b.lat, b.lng])
        ),
        from
      ).slice(0, 48);
      return pois.length ? pois : null;
    } catch {
      return null;
    }
  };

  const results = await Promise.all(ENDPOINTS.map(attempt));
  const pois = results.find((r) => r && r.length);
  if (pois) return { pois, source: "live" };
  return { pois: proceduralPois(from), source: "procedural" };
}
