/**
 * walkRoute.ts — the ~550 m demo stroll, generated around the user's
 * ACTUAL position. An 8-waypoint loop on staggered bearings (~150–300 m
 * legs) reads like a real neighborhood wander wherever they stand.
 * The simulator interpolates ~10 m steps along it.
 */

import { destPoint, haversineM, type LatLng } from "./geo";

/** leg bearings + distances — a wiggly out-and-back loop, ~550 m */
const LEGS: [number, number][] = [
  [20, 90],
  [70, 110],
  [110, 85],
  [150, 95],
  [200, 80],
  [250, 100],
  [300, 85],
];

export function buildWalkLoop(center: LatLng): LatLng[] {
  const pts: LatLng[] = [center];
  let cur = center;
  for (const [bearing, dist] of LEGS) {
    cur = destPoint(cur, bearing, dist);
    pts.push(cur);
  }
  return pts;
}

/** Interpolate a route into evenly-spaced steps (~10m). */
export function interpolatedSteps(route: LatLng[], stepM = 10): LatLng[] {
  const out: LatLng[] = [route[0]];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const d = haversineM(a, b);
    const n = Math.max(1, Math.round(d / stepM));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
