import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

// Same families the OtaPath app ships with (Fraunces display + Plus Jakarta Sans).
const fraunces = loadFraunces("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
loadFraunces("italic", { weights: ["500", "600"], subsets: ["latin"] });
const jakarta = loadJakarta("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });

export const FONT = {
  display: `${fraunces.fontFamily}, Georgia, serif`,
  sans: `${jakarta.fontFamily}, system-ui, sans-serif`,
};

/** OtaPath's own palette — "Warm Solar & Organic Earth" (src/app/globals.css). */
export const C = {
  cream: "#FDF8EE",
  butter: "#FBE8A6",
  solar: "#FFCE32",
  tangerine: "#FF6B2B",
  tangerineDeep: "#C64F00",
  forest: "#1E8E5A",
  forestDeep: "#14684A",
  cobalt: "#2563EB",
  sky: "#38BDF8",
  blush: "#F472B6",
  ink: "#1C1917",
  inkSoft: "#292524",
  stone: "#78716C",
  paper: "#EFE7D2",
};

/** Master timeline, in seconds. Everything else is expressed relative to these. */
export const SECTION = {
  hook: { from: 0, to: 12 },
  solution: { from: 12, to: 25 },
  feature1: { from: 25, to: 47 },
  feature2: { from: 47, to: 71 },
  feature3: { from: 71, to: 95 },
  difference: { from: 95, to: 110 },
  ending: { from: 110, to: 120 },
} as const;

export const TOTAL_SECONDS = 120;
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
