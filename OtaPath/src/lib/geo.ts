/**
 * geo.ts — small geodesy helpers for the fog-of-war engine.
 * Grid cell math is latitude-aware (Otaniemi ~60.18°N).
 */

export type LatLng = [number, number];

export const DEFAULT_CENTER: LatLng = [60.1849, 24.825]; // Otaniemi, Espoo — matches the walk route start so the dog, the map and the sim all begin in the same spot

/** Meters between two [lat,lng] points (haversine). */
export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Destination point `distM` meters from `from` along `bearingDeg`. */
export function destPoint(from: LatLng, bearingDeg: number, distM: number): LatLng {
  const R = 6371000;
  const b = (bearingDeg * Math.PI) / 180;
  const d = distM / R;
  const lat1 = (from[0] * Math.PI) / 180;
  const lng1 = (from[1] * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(b) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

/** "280 m" under a kilometer, "1.4 km" above — one decimal, no trailing zeros. */
export function fmtDistM(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/* --- exploration grid ------------------------------------------- */
export const CELL_M = 28; // coverage grid cell size
export const COVER_RADIUS_M = 24; // each step clears cells within this radius
export const NEIGHBORHOOD_M = 550; // "the neighborhood" disc radius

const M_PER_DEG_LAT = 111320;

function metersPerDegLng(lat: number) {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Cell indices containing a point. */
export function cellOf(lat: number, lng: number): [number, number] {
  const mLng = metersPerDegLng(lat);
  return [
    Math.floor((lat * M_PER_DEG_LAT) / CELL_M),
    Math.floor((lng * mLng) / CELL_M),
  ];
}

/**
 * All grid cells covered by a step at `lat,lng`
 * (the cell itself + any neighbor within COVER_RADIUS_M).
 */
export function cellsCoveredBy(lat: number, lng: number): string[] {
  const [ci, cj] = cellOf(lat, lng);
  const keys: string[] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const ni = ci + i;
      const nj = cj + j;
      // distance from the step to the center of this cell
      const cellLat = ((ni + 0.5) * CELL_M) / M_PER_DEG_LAT;
      const cellLng = ((nj + 0.5) * CELL_M) / metersPerDegLng(lat);
      if (haversineM([lat, lng], [cellLat, cellLng]) <= COVER_RADIUS_M + CELL_M / 2) {
        keys.push(`${ni}:${nj}`);
      }
    }
  }
  return keys;
}

/** Total cells in the neighborhood disc (analytic — no enumeration needed). */
export function totalNeighborhoodCells(): number {
  return Math.round((Math.PI * NEIGHBORHOOD_M * NEIGHBORHOOD_M) / (CELL_M * CELL_M));
}
