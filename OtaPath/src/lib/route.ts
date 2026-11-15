/**
 * route.ts — real walking routes via OSRM's public demo server.
 * `route/v1/foot` follows actual streets & paths through the
 * neighborhood — free, keyless, CORS-enabled. Any failure returns
 * null and the map falls back to its soft bezier suggestion.
 */

import type { LatLng } from "./geo";

const OSRM = "https://router.project-osrm.org/route/v1/foot";

export interface FootRoute {
  points: LatLng[];
  distanceM: number;
  durationS: number;
}

export async function fetchFootRoute(
  from: LatLng,
  to: LatLng
): Promise<FootRoute | null> {
  try {
    const url = `${OSRM}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      routes?: {
        distance: number;
        duration: number;
        geometry?: { coordinates?: [number, number][] };
      }[];
    };
    const r = j.routes?.[0];
    const coords = r?.geometry?.coordinates;
    if (!r || !coords || coords.length < 2) return null;
    return {
      points: coords.map(([lng, lat]) => [lat, lng] as LatLng),
      distanceM: r.distance,
      durationS: r.duration,
    };
  } catch {
    return null;
  }
}
