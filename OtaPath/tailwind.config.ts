import type { Config } from "tailwindcss";

/**
 * OtaPath Design System — "Warm Solar & Organic Earth"
 * ---------------------------------------------------
 * Canonical design-token file. Loaded by `globals.css` via the
 * `@config` directive (Tailwind v4 legacy-config bridge).
 *
 * Mirrors of these colors also live in `globals.css :root` as CSS
 * custom properties (var(--solar), var(--tangerine), …) for use in
 * SVG fills, masks and inline styles where a utility won't reach.
 *
 * STRICT RULES — do not add: dark-mode palettes, neon/purple-cyan
 * gradients, glassmorphism, pure #000000 ink.
 */

const palette = {
  /** Warm paper & sunlight backgrounds */
  cream: "#FDF8EE", // main warm off-white paper canvas
  butter: "#FBE8A6", // soft warm card surface
  solar: "#FFCE32", // vibrant Headspace-style sun yellow / fog-of-war mist
  /** Joyful & grounding accents */
  tangerine: "#FF6B2B", // active missions, voice record, energy
  forest: "#1E8E5A", // botanical green — nature POIs, completed states
  cobalt: "#2563EB", // playful cobalt — cultural / cinema POIs
  sky: "#38BDF8", // sky blue — calm breathers, CloudWalker
  blush: "#F472B6", // soft coral pink — memory capsules
  /** Ink */
  charcoal: "#1C1917", // deep warm charcoal — never pure black
} as const;

const config: Config = {
  theme: {
    extend: {
      colors: {
        // Flat aliases → bg-cream, bg-solar, text-tangerine …
        ...palette,
        // Spec aliases → bg-accent-tangerine, text-ink-charcoal, bg-paper-cream
        accent: {
          tangerine: palette.tangerine,
          forest: palette.forest,
          cobalt: palette.cobalt,
          sky: palette.sky,
          blush: palette.blush,
        },
        ink: { charcoal: palette.charcoal },
        paper: { cream: palette.cream, butter: palette.butter },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        sans: [
          "var(--font-jakarta)",
          "Plus Jakarta Sans",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        blob: "28px",
        "4xl": "2rem",
      },
      keyframes: {
        /** Rubber-sticker squish — SunBlob breathing / press feedback */
        squish: {
          "0%, 100%": { transform: "scale(1, 1)" },
          "30%": { transform: "scale(1.07, 0.9)" },
          "55%": { transform: "scale(0.95, 1.06)" },
          "75%": { transform: "scale(1.02, 0.98)" },
        },
        /** Gentle walk bob — CloudWalker */
        bob: {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-7%) rotate(2.5deg)" },
        },
        /** SproutPin attention wiggle */
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        /** Slow golden mist drift — FogOverlay shimmer */
        drift: {
          from: { transform: "translateX(-6%)" },
          to: { transform: "translateX(6%)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "peel-pulse": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "0.72" },
        },
      },
      animation: {
        squish: "squish 2.6s ease-in-out infinite",
        "squish-fast": "squish 1.1s ease-in-out infinite",
        bob: "bob 1.8s ease-in-out infinite",
        wiggle: "wiggle 0.9s ease-in-out infinite",
        drift: "drift 16s ease-in-out infinite alternate",
        "spin-slow": "spin-slow 26s linear infinite",
        "peel-pulse": "peel-pulse 5s ease-in-out infinite",
      },
    },
  },
};

export default config;
