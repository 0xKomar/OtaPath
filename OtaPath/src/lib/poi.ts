/**
 * poi.ts — POI model, graded-exposure tiers, mission templates,
 * and the offline Otaniemi fallback set.
 *
 * Tiers map to patient state (closed-loop graded exposure):
 *   LOW      → nature  (parks, water — gentle drift)
 *   MODERATE → culture (cinema, library, museum — passive social presence)
 *   HIGH     → sport   (gyms, pools — physical activation)
 */

import { fmtDistM, haversineM, type LatLng } from "./geo";

export type PatientState = "LOW" | "MODERATE" | "HIGH";
export type PoiTier = "nature" | "culture" | "sport";

export interface POI {
  id: string;
  name: string;
  tier: PoiTier;
  lat: number;
  lng: number;
}

export interface Mission {
  poiId: string;
  poiName: string;
  tier: PoiTier;
  distanceM: number;
  text: string;
  lat?: number;
  lng?: number;
  /** persistence + clinician-prescription metadata */
  dbId?: string;
  assignedBy?: "AI_CLOSED_LOOP" | "CLINICIAN_CUSTOM";
  clinicianNote?: string;
  doctorName?: string;
  photoPrompt?: string;
  voicePrompt?: string;
  audioPairing?: string;
}

export const STATE_TO_TIER: Record<PatientState, PoiTier> = {
  LOW: "nature",
  MODERATE: "culture",
  HIGH: "sport",
};

export const TIER_META: Record<
  PoiTier,
  { label: string; stateLabel: string; pin: "park" | "cinema" | "sport"; hex: string }
> = {
  nature: {
    label: "Calm nature",
    stateLabel: "Low energy",
    pin: "park",
    hex: "#1E8E5A",
  },
  culture: {
    label: "Quiet company",
    stateLabel: "Balanced",
    pin: "cinema",
    hex: "#2563EB",
  },
  sport: {
    label: "Get moving",
    stateLabel: "High energy",
    pin: "sport",
    hex: "#FF6B2B",
  },
};

/* --- mission templates ------------------------------------------- */

type Quest = { text: (poi: string, dist: string) => string; photo: string; voice: string };

/** savoring micro-quests — graded per tier, rotated by place id so each
    location keeps its own flavor while different spots feel different */
const QUESTS: Record<PoiTier, Quest[]> = {
  nature: [
    {
      text: (p, d) => `Take a gentle ${d} walk to ${p}. Find one vivid color in nature — a red flower, a bright leaf — and capture it.`,
      photo: "one vivid color that caught your eye",
      voice: "why did that exact color stop you?",
    },
    {
      text: (p, d) => `Wander ${d} to ${p}. Find one interesting texture — bark, stone, moss — and photograph it up close.`,
      photo: "a texture worth touching, up close",
      voice: "what would this feel like under your fingers?",
    },
    {
      text: (p, d) => `A soft ${d} to ${p}. Find the calmest corner you can — sit with it for a breath, then keep the view.`,
      photo: "the calmest view you found",
      voice: "what went quiet in you, standing here?",
    },
    {
      text: (p, d) => `Stroll ${d} to ${p}. Catch light doing something nice — through leaves, on water, on a wall.`,
      photo: "light doing something nice",
      voice: "where did the light land that you liked most?",
    },
    {
      text: (p, d) => `Drift ${d} to ${p}. Listen for one natural sound — wind, water, a bird — then capture where you heard it.`,
      photo: "the spot where the sound found you",
      voice: "hum or name the sound you caught",
    },
  ],
  culture: [
    {
      text: (p, d) => `Visit ${p} — a short ${d}. Find a poster or an architectural detail that catches your eye and snap a photo of it.`,
      photo: "a poster or detail that caught your eye",
      voice: "what pulled you toward it?",
    },
    {
      text: (p, d) => `Drop by ${p} — ${d} away. Find a doorway, window, or corner that feels like it has a story.`,
      photo: "a doorway or window with a story",
      voice: "invent one line of its story — anything goes",
    },
    {
      text: (p, d) => `Step into ${p} — just ${d}. Notice one person doing something ordinary and kind — keep the place, not the face.`,
      photo: "the place where you noticed it",
      voice: "what small kindness did you witness?",
    },
    {
      text: (p, d) => `Wander ${d} to ${p}. Find one object older than you — a bench, a plaque, a brick — and give it a nod.`,
      photo: "something older than you",
      voice: "what has it watched over the years?",
    },
  ],
  sport: [
    {
      text: (p, d) => `Head to ${p} — ${d} of easy movement. Capture something that represents movement, strength, or energy.`,
      photo: "movement, strength, or energy",
      voice: "what did your body feel ready for?",
    },
    {
      text: (p, d) => `Move ${d} to ${p}. Find someone mid-play or a space built for it — freeze one frame of energy.`,
      photo: "one frozen frame of energy",
      voice: "what did that energy wake up in you?",
    },
    {
      text: (p, d) => `Take ${d} at your own pace to ${p}. On the way, match your breath to your steps for ten counts.`,
      photo: "the view when you finished the ten counts",
      voice: "how did ten matched breaths land?",
    },
  ],
};

/** deterministic rotation — the same POI always offers its own quest */
function questFor(poi: POI): Quest {
  const pool = QUESTS[poi.tier];
  let h = 0;
  for (const ch of poi.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return pool[Math.abs(h) % pool.length];
}

export function missionFor(poi: POI, from: LatLng): Mission {
  const d = Math.round(haversineM(from, [poi.lat, poi.lng]) / 10) * 10;
  const dist = fmtDistM(d);
  const q = questFor(poi);
  return {
    poiId: poi.id,
    poiName: poi.name,
    tier: poi.tier,
    distanceM: d,
    text: q.text(poi.name, dist),
    lat: poi.lat,
    lng: poi.lng,
    assignedBy: "AI_CLOSED_LOOP",
    photoPrompt: q.photo,
    voicePrompt: q.voice,
  };
}

/** indoor quests — real-life contexts where going out isn't the task.
 *  Sick days and bed-bound mornings get light-and-window micro-quests:
 *  still savoring practice, zero mobility pressure, zero guilt. */
export function indoorMission(from: LatLng, kind: "sick" | "housebound"): Mission {
  const base = {
    poiId: `indoor-${kind}`,
    tier: "nature" as PoiTier,
    distanceM: 0,
    lat: from[0],
    lng: from[1],
    assignedBy: "AI_CLOSED_LOOP" as const,
  };
  return kind === "sick"
    ? {
        ...base,
        poiName: "your window",
        text: "Rest day — the world can come to you. Look out your window for 60 seconds and snap the sky, a tree, or the light outside.",
        photoPrompt: "the sky, trees, or light through your window",
        voicePrompt: "one detail you notice that you might have missed before",
      }
    : {
        ...base,
        poiName: "the nearest daylight",
        text: "No leaving the house today — and that's okay. Open a window or step onto the balcony: capture the daylight and 10s of outside sounds.",
        photoPrompt: "natural daylight — window, balcony, doorstep",
        voicePrompt: "the sounds coming in from outside",
      };
}

export function nearestPoi(pois: POI[], tier: PoiTier, from: LatLng): POI | null {
  let best: POI | null = null;
  let bestD = Infinity;
  for (const p of pois) {
    if (p.tier !== tier) continue;
    const d = haversineM(from, [p.lat, p.lng]);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/* --- Otaniemi fallback set (used when Overpass is unreachable) ----- */

export const OTANIEMI_FALLBACK_POIS: POI[] = [
  // nature — calm drift tier
  { id: "fb-park-1", name: "Otaranta Shore Path", tier: "nature", lat: 60.1817, lng: 24.8296 },
  { id: "fb-park-2", name: "Alvar Square Lawn", tier: "nature", lat: 60.1845, lng: 24.8268 },
  { id: "fb-park-3", name: "Teekkarikylä Green", tier: "nature", lat: 60.1869, lng: 24.836 },
  { id: "fb-park-4", name: "Laajalahti Bay Meadow", tier: "nature", lat: 60.1894, lng: 24.8403 },
  // culture — passive social presence tier
  { id: "fb-cul-1", name: "Harald Herlin Learning Centre", tier: "culture", lat: 60.1842, lng: 24.8272 },
  { id: "fb-cul-2", name: "Dipoli", tier: "culture", lat: 60.1849, lng: 24.8322 },
  { id: "fb-cul-3", name: "Kinopoli Cinema", tier: "culture", lat: 60.1872, lng: 24.8116 },
  { id: "fb-cul-4", name: "Aalto Design Factory", tier: "culture", lat: 60.1879, lng: 24.8398 },
  // sport — physical activation tier
  { id: "fb-sport-1", name: "Otahalli Sports Hall", tier: "sport", lat: 60.1834, lng: 24.8336 },
  { id: "fb-sport-2", name: "UniSport Otaniemi", tier: "sport", lat: 60.1828, lng: 24.8344 },
  { id: "fb-sport-3", name: "Otaranta Beach Volley", tier: "sport", lat: 60.1804, lng: 24.8287 },
  { id: "fb-sport-4", name: "Ratsupolku Outdoor Gym", tier: "sport", lat: 60.1886, lng: 24.8235 },
];
