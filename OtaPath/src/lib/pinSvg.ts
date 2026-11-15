/**
 * pinSvg.ts — string renderers of the OtaShapes art for Leaflet divIcons.
 * Same plump droplet + cute faces as SproutPin, plus a glowing beacon
 * ring for the active tier and the CloudWalker user marker.
 */

export type PinKind = "park" | "cinema" | "sport";

const PIN_FILL: Record<PinKind, string> = {
  park: "var(--forest)",
  cinema: "var(--cobalt)",
  sport: "var(--tangerine)",
};

export function pinSvgString(kind: PinKind, active: boolean): string {
  const emblem =
    kind === "park"
      ? `<g fill="var(--solar)"><ellipse cx="40" cy="7" rx="8" ry="4.5" transform="rotate(-32 40 7)"/><ellipse cx="56" cy="7" rx="8" ry="4.5" transform="rotate(32 56 7)"/><rect x="46.5" y="6" width="3" height="10" rx="1.5"/></g>`
      : kind === "cinema"
        ? `<path d="M48 20 L51.5 28.5 L60 32 L51.5 35.5 L48 44 L44.5 35.5 L36 32 L44.5 28.5 Z" fill="var(--cream)"/>`
        : `<path d="M51 22 L44 38 h6.5 L46 52 L58 34 h-7.5 Z" fill="var(--solar)"/>`;

  const beacon = active
    ? `<circle cx="48" cy="106" r="10" fill="${PIN_FILL[kind]}" class="pin-beacon"/>`
    : "";

  return `<svg viewBox="0 0 96 112" xmlns="http://www.w3.org/2000/svg" class="pin-svg${active ? " pin-active" : ""}">
    ${beacon}
    <ellipse cx="48" cy="106" rx="18" ry="4.5" fill="var(--charcoal)" opacity="0.1"/>
    <path d="M48 10 C70 10 84 26 84 48 C84 72 62 88 48 102 C34 88 12 72 12 48 C12 26 26 10 48 10 Z" fill="${PIN_FILL[kind]}"/>
    ${emblem}
    <g class="pin-eyes">
      <circle cx="40" cy="54" r="4" fill="var(--cream)"/>
      <circle cx="56" cy="54" r="4" fill="var(--cream)"/>
    </g>
    <path d="M42 66 q6 5 12 0" stroke="var(--cream)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  </svg>`;
}

/** CloudWalker user marker — cream cloud on a soft solar halo. */
export function walkerSvgString(): string {
  return `<svg viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg" class="walker-svg">
    <circle cx="73" cy="60" r="46" fill="var(--solar)" opacity="0.25" class="walker-halo"/>
    <ellipse cx="52" cy="97" rx="10" ry="6" fill="var(--sky)"/>
    <ellipse cx="92" cy="97" rx="10" ry="6" fill="var(--sky)"/>
    <path d="M40 92 C22 92 12 80 15 66 C18 54 28 48 38 46 C40 32 54 22 70 24 C80 12 100 14 108 28 C126 26 140 40 138 58 C136 76 122 90 104 90 C90 96 56 96 40 92 Z"
      fill="var(--cream)" stroke="var(--charcoal)" stroke-opacity="0.12" stroke-width="3"/>
    <ellipse cx="46" cy="68" rx="6" ry="4" fill="var(--sky)" opacity="0.45"/>
    <ellipse cx="98" cy="68" rx="6" ry="4" fill="var(--sky)" opacity="0.45"/>
    <g class="walker-blink">
      <g class="walker-eyes">
        <circle cx="58" cy="60" r="4" fill="var(--charcoal)"/>
        <circle cx="86" cy="60" r="4" fill="var(--charcoal)"/>
      </g>
    </g>
    <path d="M64 70 q8 6 16 0" stroke="var(--charcoal)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  </svg>`;
}

/** Memory capsule droplet — glowing amber pin left at a saved spot.
 *  `echo` → frosted, dimmed 7-day variant that pulses for attention. */
export function memorySvgString(echo = false): string {
  if (echo)
    return `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg" class="mem-svg mem-echo">
    <circle cx="32" cy="38" r="24" fill="var(--sky)" opacity="0.5" class="echo-pulse"/>
    <ellipse cx="32" cy="75" rx="12" ry="3.5" fill="var(--charcoal)" opacity="0.08"/>
    <path d="M32 6 C48 6 58 18 58 34 C58 52 42 62 32 74 C22 62 6 52 6 34 C6 18 16 6 32 6 Z" fill="var(--butter)"/>
    <path d="M32 6 C48 6 58 18 58 34 C58 52 42 62 32 74 C22 62 6 52 6 34 C6 18 16 6 32 6 Z" fill="var(--cream)" opacity="0.45"/>
    <circle cx="32" cy="32" r="9" fill="var(--cream)"/>
    <circle cx="32" cy="32" r="4" fill="var(--sky)" opacity="0.8"/>
    <path d="M28 14 q4 -3 8 0" stroke="var(--cream)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9"/>
  </svg>`;
  return `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg" class="mem-svg">
    <circle cx="32" cy="38" r="26" fill="var(--solar)" opacity="0.45" class="walker-halo"/>
    <ellipse cx="32" cy="75" rx="12" ry="3.5" fill="var(--charcoal)" opacity="0.1"/>
    <path d="M32 6 C48 6 58 18 58 34 C58 52 42 62 32 74 C22 62 6 52 6 34 C6 18 16 6 32 6 Z" fill="var(--solar)"/>
    <circle cx="32" cy="32" r="9" fill="var(--cream)"/>
    <circle cx="32" cy="32" r="4.5" fill="var(--tangerine)"/>
  </svg>`;
}
