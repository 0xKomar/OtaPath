/**
 * seedMemories.ts — demo seed for Memory Echo.
 * Three rich capsules around Otaniemi so the 7-day echo flow works
 * on stage: today @ a park, 3 days @ sports hall, 7 days @ cinema
 * (the last one frosts into an Echo pin). Photos are flat warm SVG
 * scenes — consistent with the papery art direction, always offline-safe.
 */

import type { MemoryCapsule } from "@/store/useOtaStore";
import { DEFAULT_CENTER, destPoint, type LatLng } from "./geo";

const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">${body}</svg>`
  )}`;

const PARK_SCENE = svg(`
  <rect width="320" height="240" fill="#FBE8A6"/>
  <circle cx="70" cy="60" r="34" fill="#FFCE32"/>
  <g fill="#FF6B2B"><rect x="38" y="28" width="6" height="14" rx="3"/><rect x="96" y="28" width="6" height="14" rx="3"/><rect x="28" y="56" width="14" height="6" rx="3"/><rect x="98" y="56" width="14" height="6" rx="3"/></g>
  <path d="M0 160 Q80 120 160 150 T320 140 V240 H0 Z" fill="#1E8E5A"/>
  <path d="M0 190 Q90 155 180 185 T320 175 V240 H0 Z" fill="#156e46"/>
  <rect x="205" y="120" width="8" height="60" rx="4" fill="#8a5a2b"/>
  <ellipse cx="209" cy="112" rx="30" ry="24" fill="#1E8E5A"/>
  <ellipse cx="226" cy="100" rx="18" ry="14" fill="#2ba86e"/>
  <g fill="#F472B6"><circle cx="60" cy="205" r="5"/><circle cx="95" cy="215" r="4"/><circle cx="140" cy="208" r="5"/></g>
  <g fill="#FDF8EE"><ellipse cx="230" cy="50" rx="22" ry="10"/><ellipse cx="252" cy="44" rx="16" ry="8"/></g>
`);

const SPORT_SCENE = svg(`
  <rect width="320" height="240" fill="#FF6B2B"/>
  <path d="M0 200 Q160 170 320 195 V240 H0 Z" fill="#d84f14"/>
  <circle cx="160" cy="70" r="30" fill="#FDF8EE"/>
  <circle cx="160" cy="70" r="30" fill="none" stroke="#FFCE32" stroke-width="6" stroke-dasharray="10 8"/>
  <g fill="#FFCE32"><path d="M60 120 l14 -34 h-16 l14 -26 -20 36 h16 Z"/><path d="M250 130 l12 -30 h-14 l12 -24 -18 32 h14 Z"/></g>
  <rect x="120" y="180" width="80" height="10" rx="5" fill="#1C1917" opacity="0.15"/>
  <g fill="#FDF8EE"><circle cx="80" cy="205" r="4"/><circle cx="240" cy="212" r="4"/></g>
`);

const CINEMA_SCENE = svg(`
  <rect width="320" height="240" fill="#1d3fae"/>
  <rect x="52" y="40" width="80" height="120" rx="8" fill="#F472B6" transform="rotate(-4 92 100)"/>
  <rect x="150" y="30" width="90" height="130" rx="8" fill="#FDF8EE" transform="rotate(3 195 95)"/>
  <path d="M195 55 l7 14 15 2 -11 10 3 15 -14 -8 -14 8 3 -15 -11 -10 15 -2 Z" fill="#2563EB"/>
  <rect x="60" y="130" width="62" height="8" rx="4" fill="#FDF8EE" opacity="0.85" transform="rotate(-4 91 134)"/>
  <rect x="165" y="140" width="66" height="8" rx="4" fill="#F472B6" transform="rotate(3 198 144)"/>
  <path d="M0 190 Q160 175 320 190 V240 H0 Z" fill="#1C1917"/>
  <g fill="#FFCE32"><circle cx="40" cy="200" r="4"/><circle cx="70" cy="202" r="4"/><circle cx="100" cy="203" r="4"/><circle cx="130" cy="204" r="4"/><circle cx="160" cy="205" r="4"/><circle cx="190" cy="204" r="4"/><circle cx="220" cy="203" r="4"/><circle cx="250" cy="202" r="4"/><circle cx="280" cy="200" r="4"/></g>
`);

const DAY = 86_400_000;

/**
 * Seeded capsules are generated 200–800 m around the user's ACTUAL
 * position — never a fixed city. Three staggered bearings land the
 * pins in plausible nearby spots wherever in the world they are.
 */
export function buildSeedMemories(
  center: LatLng = DEFAULT_CENTER,
  now = Date.now()
): MemoryCapsule[] {
  const park = destPoint(center, 40, 260);
  const sport = destPoint(center, 150, 520);
  const cinema = destPoint(center, 285, 740);
  return [
    {
      id: `seed-${now}-park`,
      lat: park[0],
      lng: park[1],
      poiName: "the green corner nearby",
      kind: "photo",
      at: now - 2 * 60 * 60 * 1000, // ~2h ago today
      photoUrl: PARK_SCENE,
      transcript:
        "the way the low sun caught the birch leaves — everything was gold and green and the air smelled like rain",
      luminance: 74,
      vibrancy: 82,
      acousticScore: 63,
      savoringScore: 88,
      valence: 0.6,
      themes: ["nature", "light", "color"],
      soundscapePrompt:
        "Warm and uplifting ambient piece — soft piano with distant birdsong and a light park breeze, ~76 BPM",
    },
    {
      id: `seed-${now}-sport`,
      lat: sport[0],
      lng: sport[1],
      poiName: "the neighborhood sports court",
      kind: "photo",
      at: now - 3 * DAY,
      photoUrl: SPORT_SCENE,
      transcript:
        "someone's serve froze mid-air for a second — pure energy, the squeak of shoes and everyone laughing",
      luminance: 68,
      vibrancy: 90,
      acousticScore: 71,
      savoringScore: 79,
      valence: 0.5,
      themes: ["movement", "energy"],
      soundscapePrompt:
        "Upbeat playful piece — marimba pulses, brushed drums and a springy bass line, ~92 BPM",
    },
    {
      id: `seed-${now}-cinema`,
      lat: cinema[0],
      lng: cinema[1],
      poiName: "the little cinema on the corner",
      kind: "photo",
      at: now - (7 * DAY + 5 * 60 * 60 * 1000), // 7d 5h — echo-ready
      photoUrl: CINEMA_SCENE,
      transcript:
        "a faded teal and pink poster for a film I'd never heard of — couldn't stop staring at the little lights under the marquee",
      luminance: 46,
      vibrancy: 77,
      acousticScore: 58,
      savoringScore: 84,
      valence: 0.4,
      themes: ["cinema", "color", "light"],
      soundscapePrompt:
        "Nostalgic hushed piece — reverb-soaked piano, warm tape hiss and distant marquee hum, ~64 BPM",
    },
  ];
}
