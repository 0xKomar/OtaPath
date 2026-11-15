"use client";

/**
 * OtaShapes — OtaPath's custom illustrated mascots & map shapes.
 * Hand-drawn, warm, flat-block SVGs with cute minimalist faces.
 * No stock icons, no thin line-art — soft wobbly geometry only.
 *
 * Palette is read from globals.css custom properties so the shapes
 * stay perfectly in sync with the design tokens.
 */

import { useId } from "react";

const C = {
  cream: "var(--cream)",
  butter: "var(--butter)",
  solar: "var(--solar)",
  tangerine: "var(--tangerine)",
  forest: "var(--forest)",
  cobalt: "var(--cobalt)",
  sky: "var(--sky)",
  blush: "var(--blush)",
  charcoal: "var(--charcoal)",
} as const;

/* ------------------------------------------------------------------ */
/* SunBlob — wobbly sun buddy. Squishes when you record or finish a     */
/* mission. Moods: idle (sleepy-happy), joy, recording (excited).       */
/* ------------------------------------------------------------------ */

export type SunMood = "idle" | "joy" | "recording";

export function SunBlob({
  size = 120,
  mood = "idle",
  animate = true,
  withRays = false,
  className = "",
}: {
  size?: number;
  mood?: SunMood;
  animate?: boolean;
  withRays?: boolean;
  className?: string;
}) {
  const squish =
    mood === "recording" ? "animate-squish-fast" : "animate-squish";

  return (
    <svg
      viewBox="0 0 148 148"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`SunBlob feeling ${mood}`}
    >
      {withRays && (
        <g
          className="animate-spin-slow"
          style={{ transformOrigin: "74px 74px" }}
          stroke={C.tangerine}
          strokeWidth={8}
          strokeLinecap="round"
        >
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (Math.PI / 4) * i;
            return (
              <line
                key={i}
                x1={74 + 64 * Math.cos(a)}
                y1={74 + 64 * Math.sin(a)}
                x2={74 + 71 * Math.cos(a)}
                y2={74 + 71 * Math.sin(a)}
              />
            );
          })}
        </g>
      )}
      <g transform="translate(14 14)">
        <g
          className={animate ? squish : undefined}
          style={{ transformBox: "fill-box", transformOrigin: "50% 88%" }}
        >
          {/* wobbly disc */}
          <path
            d="M60 10 C76 7 92 16 100 30 C110 46 108 70 96 86 C84 102 62 110 44 104 C24 98 10 80 12 58 C14 38 30 14 60 10 Z"
            fill={C.solar}
          />
          {/* cheeks */}
          <ellipse cx="34" cy="68" rx="6.5" ry="4.5" fill={C.tangerine} opacity="0.5" />
          <ellipse cx="86" cy="68" rx="6.5" ry="4.5" fill={C.tangerine} opacity="0.5" />
          {/* face */}
          {mood === "idle" && (
            <g stroke={C.charcoal} strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M42 56 q6 -7 12 0" />
              <path d="M68 56 q6 -7 12 0" />
              <path d="M50 72 q10 9 20 0" />
            </g>
          )}
          {mood === "joy" && (
            <g>
              <circle cx="48" cy="54" r="4.5" fill={C.charcoal} />
              <circle cx="72" cy="54" r="4.5" fill={C.charcoal} />
              <path d="M48 70 Q60 84 72 70 Q60 77 48 70 Z" fill={C.charcoal} />
            </g>
          )}
          {mood === "recording" && (
            <g>
              <circle cx="48" cy="52" r="4.5" fill={C.charcoal} />
              <circle cx="72" cy="52" r="4.5" fill={C.charcoal} />
              <ellipse cx="60" cy="74" rx="5.5" ry="7.5" fill={C.charcoal} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* CloudWalker — the little you. A rounded cloud/pebble avatar that     */
/* bobs across the map as you walk.                                     */
/* ------------------------------------------------------------------ */

export function CloudWalker({
  size = 140,
  tone = "cream",
  animate = true,
  className = "",
}: {
  size?: number;
  tone?: "cream" | "sky";
  animate?: boolean;
  className?: string;
}) {
  const skyTone = tone === "sky";
  const body = skyTone ? C.sky : C.cream;
  const face = skyTone ? C.cream : C.charcoal;
  const blush = skyTone ? C.cream : C.sky;
  const feet = skyTone ? C.cream : C.sky;

  return (
    <svg
      viewBox="0 0 150 120"
      width={size}
      height={size * 0.8}
      className={className}
      role="img"
      aria-label="CloudWalker — your walking buddy"
    >
      <g
        className={animate ? "animate-bob" : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      >
        {/* little walker feet */}
        <ellipse cx="52" cy="97" rx="10" ry="6" fill={feet} />
        <ellipse cx="92" cy="97" rx="10" ry="6" fill={feet} />
        {/* puffy body */}
        <path
          d="M40 92 C22 92 12 80 15 66 C18 54 28 48 38 46 C40 32 54 22 70 24 C80 12 100 14 108 28 C126 26 140 40 138 58 C136 76 122 90 104 90 C90 96 56 96 40 92 Z"
          fill={body}
          stroke={C.charcoal}
          strokeOpacity="0.07"
          strokeWidth="3"
        />
        {/* blush */}
        <ellipse cx="46" cy="68" rx="6" ry="4" fill={blush} opacity="0.45" />
        <ellipse cx="98" cy="68" rx="6" ry="4" fill={blush} opacity="0.45" />
        {/* face */}
        <circle cx="58" cy="60" r="4" fill={face} />
        <circle cx="86" cy="60" r="4" fill={face} />
        <path
          d="M64 70 q8 6 16 0"
          stroke={face}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* SproutPin — illustrated map pins. One plump droplet, three moods:    */
/* park (forest + solar sprout), cinema (cobalt + cream star),          */
/* sport (tangerine + solar spark bolt).                                */
/* ------------------------------------------------------------------ */

export type PinKind = "park" | "cinema" | "sport";

const PIN_FILL: Record<PinKind, string> = {
  park: C.forest,
  cinema: C.cobalt,
  sport: C.tangerine,
};

export function SproutPin({
  kind = "park",
  size = 72,
  wiggle = false,
  className = "",
}: {
  kind?: PinKind;
  size?: number;
  wiggle?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 112"
      width={size}
      height={size * 1.17}
      className={className}
      role="img"
      aria-label={`${kind} pin`}
    >
      {/* soft ground shadow */}
      <ellipse cx="48" cy="106" rx="18" ry="4.5" fill={C.charcoal} opacity="0.1" />
      <g
        className={wiggle ? "animate-wiggle" : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "50% 95%" }}
      >
        {/* plump droplet */}
        <path
          d="M48 10 C70 10 84 26 84 48 C84 72 62 88 48 102 C34 88 12 72 12 48 C12 26 26 10 48 10 Z"
          fill={PIN_FILL[kind]}
        />
        {/* kind emblem */}
        {kind === "park" && (
          <g fill={C.solar}>
            <ellipse cx="40" cy="7" rx="8" ry="4.5" transform="rotate(-32 40 7)" />
            <ellipse cx="56" cy="7" rx="8" ry="4.5" transform="rotate(32 56 7)" />
            <rect x="46.5" y="6" width="3" height="10" rx="1.5" />
          </g>
        )}
        {kind === "cinema" && (
          <path
            d="M48 20 L51.5 28.5 L60 32 L51.5 35.5 L48 44 L44.5 35.5 L36 32 L44.5 28.5 Z"
            fill={C.cream}
          />
        )}
        {kind === "sport" && (
          <path d="M51 22 L44 38 h6.5 L46 52 L58 34 h-7.5 Z" fill={C.solar} />
        )}
        {/* face — eyes blink gently, staggered by kind */}
        <g
          className="pin-eyes"
          style={{ animationDelay: `${{ park: 0.8, cinema: 2.1, sport: 3.4 }[kind]}s` }}
        >
          <circle cx="40" cy="54" r="4" fill={C.cream} />
          <circle cx="56" cy="54" r="4" fill={C.cream} />
        </g>
        <path
          d="M42 66 q6 5 12 0"
          stroke={C.cream}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* FogOverlay — the golden-cream paper mist. Not a gloomy dark fog: a   */
/* warm butter/solar veil with organic grain that peels away in soft    */
/* circles (like a scratch-off card) wherever the user has walked.      */
/*                                                                      */
/* `reveals` are holes in 0–100 viewBox units; `softness` feathers the  */
/* peeled edges (Gaussian blur inside the mask).                        */
/* ------------------------------------------------------------------ */

export type FogReveal = { x: number; y: number; r: number };

export function FogOverlay({
  reveals = [],
  softness = 5,
  grain = true,
  className = "",
}: {
  reveals?: FogReveal[];
  softness?: number;
  grain?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const maskId = `fog-mask-${uid}`;
  const blurId = `fog-blur-${uid}`;
  const grainId = `fog-grain-${uid}`;
  const glowId = `fog-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <defs>
        <filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={softness} />
        </filter>
        <filter id={grainId} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.72  0 0 0 0 0.61  0 0 0 0 0.3  0 0 0 0.9 0"
          />
        </filter>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          <g filter={`url(#${blurId})`}>
            {reveals.map((rv, i) => (
              <circle key={i} cx={rv.x} cy={rv.y} r={rv.r} fill="black" />
            ))}
          </g>
        </mask>
        <radialGradient id={glowId} cx="35%" cy="35%" r="85%">
          <stop offset="0%" stopColor={C.solar} stopOpacity="0.65" />
          <stop offset="55%" stopColor={C.solar} stopOpacity="0.22" />
          <stop offset="100%" stopColor={C.solar} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g mask={`url(#${maskId})`}>
        {/* warm butter mist at 85% */}
        <rect width="100" height="100" fill={C.butter} opacity="0.85" />
        {/* slow-drifting solar shimmer */}
        <rect width="100" height="100" fill={`url(#${glowId})`}>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-8 0; 8 0; -8 0"
            dur="16s"
            repeatCount="indefinite"
          />
        </rect>
        {/* organic paper grain */}
        {grain && <rect width="100" height="100" filter={`url(#${grainId})`} opacity="0.5" />}
      </g>
    </svg>
  );
}
