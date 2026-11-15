/**
 * blobPath.ts — shared organic-blob spline math for the voice
 * visualizers (VoiceBlob recorder + capture sheet mini blob).
 */

export interface BlobPoint {
  x: number;
  y: number;
}

/** Catmull-Rom spline → closed cubic-bezier path string. */
export function blobPath(pts: BlobPoint[]): string {
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + " Z";
}

/** Evenly-spaced base ring of blob points around a center. */
export function blobRing(cx: number, cy: number, r: number, n = 10): BlobPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}
