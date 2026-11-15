/**
 * analyzeImageMood.ts — hidden visual mood biomarker engine.
 * Real pixel metrics on an off-screen canvas, computed client-side:
 *   1. meanLuminance — Rec.601 perceived brightness, 0–100
 *      (depressive drift often shows up as darker, downward shots)
 *   2. vibrancy — Hasler–Süsstrunk colorfulness → saturation richness
 * Both silently feed the biometrics store; the user only ever sees a
 * warm, encouraging message.
 */

export interface ImageMood {
  luminance: number; // 0–100
  vibrancy: number; // 0–100
  /** dominant hex colors (largest share first) — shown as swatches on the capsule */
  palette: string[];
  feedback: string;
}

function feedbackFor(luminance: number, vibrancy: number): string {
  if (vibrancy >= 70 && luminance >= 55) return "Beautiful contrast captured!";
  if (vibrancy >= 70) return "Such rich, vivid color!";
  if (luminance >= 70) return "So much lovely light in this one!";
  if (vibrancy >= 45) return "What a lovely splash of color!";
  if (luminance >= 45) return "Soft and warm — a gentle frame.";
  return "Quiet tones — the world has those too.";
}

export async function analyzeImageMood(file: File): Promise<ImageMood> {
  const bmp = await createImageBitmap(file);
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const side = Math.min(bmp.width, bmp.height);
  ctx.drawImage(
    bmp,
    (bmp.width - side) / 2,
    (bmp.height - side) / 2,
    side,
    side,
    0,
    0,
    S,
    S
  );
  const { data } = ctx.getImageData(0, 0, S, S);

  const n = S * S;
  let lumaSum = 0;
  let sRg = 0, sYb = 0, mRg = 0, mYb = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    mRg += rg;
    mYb += yb;
    sRg += rg * rg;
    sYb += yb * yb;
  }
  mRg /= n;
  mYb /= n;
  const stdRg = Math.sqrt(sRg / n - mRg * mRg);
  const stdYb = Math.sqrt(sYb / n - mYb * mYb);
  const colorfulness =
    Math.sqrt(stdRg * stdRg + stdYb * stdYb) + 0.3 * Math.sqrt(mRg * mRg + mYb * mYb);

  const luminance = Math.round(((lumaSum / n) / 255) * 100);
  const vibrancy = Math.round(Math.min(100, colorfulness * 1.15));
  const palette = dominantPalette(data);
  return { luminance, vibrancy, palette, feedback: feedbackFor(luminance, vibrancy) };
}

/**
 * Dominant-palette extraction — tiny k-means over the downscaled pixels
 * (5 clusters, 8 iterations). Returns hex strings ordered by pixel share;
 * near-duplicate clusters are merged so swatches stay distinct.
 */
function dominantPalette(data: Uint8ClampedArray, k = 5): string[] {
  const px: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 16)
    px.push([data[i], data[i + 1], data[i + 2]]);
  if (px.length === 0) return [];

  // seed with spread-out pixels
  const centers = Array.from({ length: k }, (_, i) => [
    ...px[Math.floor((i + 0.5) * px.length / k)],
  ] as [number, number, number]);
  const counts = new Array<number>(k).fill(0);

  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => [0, 0, 0]);
    counts.fill(0);
    for (const p of px) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d =
          (p[0] - centers[c][0]) ** 2 +
          (p[1] - centers[c][1]) ** 2 +
          (p[2] - centers[c][2]) ** 2;
        if (d < bd) { bd = d; bi = c; }
      }
      sums[bi][0] += p[0]; sums[bi][1] += p[1]; sums[bi][2] += p[2];
      counts[bi]++;
    }
    for (let c = 0; c < k; c++)
      if (counts[c] > 0)
        centers[c] = [
          sums[c][0] / counts[c],
          sums[c][1] / counts[c],
          sums[c][2] / counts[c],
        ];
  }

  const toHex = (c: [number, number, number]) =>
    "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  return centers
    .map((c, i) => ({ hex: toHex(c), share: counts[i] / px.length, c }))
    .sort((a, b) => b.share - a.share)
    .filter((v, i, arr) => {
      if (v.share < 0.04) return false;
      return !arr.slice(0, i).some(
        (o) =>
          (o.c[0] - v.c[0]) ** 2 + (o.c[1] - v.c[1]) ** 2 + (o.c[2] - v.c[2]) ** 2 <
          900 // merge near-identical swatches
      );
    })
    .map((v) => v.hex);
}

/** Downscale a captured photo to a storable data URL (max edge ~900px). */
export async function photoToDataUrl(file: File, maxEdge = 900, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
