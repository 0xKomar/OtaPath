/**
 * musicTaste.ts — the patient's musical agency layer.
 * Four taste presets feed the ElevenLabs Music API; `buildMusicPrompt`
 * composes a rich ≤400-char generation prompt from the chosen vibe,
 * the Memory Capsule's place/themes, and the patient's energy target.
 * Shared by the API route (server) and the player UIs (client).
 */

export type MusicStyleId = "lively" | "piano" | "lofi" | "nature";

export interface MusicStyle {
  id: MusicStyleId;
  label: string;
  /** short tag shown on the pill */
  tag: string;
  /** full genre fragment handed to the generator */
  prompt: string;
  bpm: number;
}

export const MUSIC_STYLES: MusicStyle[] = [
  {
    id: "lively",
    label: "Lively & Uplifting",
    tag: "indie acoustic",
    prompt:
      "Warm indie acoustic guitar, upbeat organic percussion, bright marimba, 108 BPM — energizing & hopeful",
    bpm: 108,
  },
  {
    id: "piano",
    label: "Calm Piano & Strings",
    tag: "felt piano",
    prompt:
      "Soft felt piano, warm cello harmonics, gentle breathing tempo, 72 BPM — grounding & peaceful",
    bpm: 72,
  },
  {
    id: "lofi",
    label: "Warm Lo-Fi & Ambient Synth",
    tag: "lo-fi & synth",
    prompt:
      "Lush analog synth pads, subtle vinyl warmth, mellow downtempo groove, 85 BPM — cozy & comforting",
    bpm: 85,
  },
  {
    id: "nature",
    label: "Pure Nature & Organic",
    tag: "forest breeze",
    prompt:
      "Binaural forest breeze, distant water stream, soft wind chimes — pure sensory immersion",
    bpm: 60,
  },
];

export const STYLE_BY_ID = Object.fromEntries(
  MUSIC_STYLES.map((s) => [s.id, s])
) as Record<MusicStyleId, MusicStyle>;

export function isMusicStyle(v: unknown): v is MusicStyleId {
  return typeof v === "string" && v in STYLE_BY_ID;
}

export interface MusicPromptInput {
  style: MusicStyleId;
  /** where the memory was captured (e.g. "Alvar Square Lawn") */
  locationName?: string;
  /** savoring themes from the capsule (e.g. ["light", "green", "warm"]) */
  themes?: string[];
  /** patient's energy tier — shapes the track's arc */
  energy?: "LOW" | "MODERATE" | "HIGH" | string;
  /** photo luminance 0–100 — nudges brightness words */
  luminance?: number;
}

/**
 * Compose the generator prompt: genre + place/context + energy arc,
 * hard-capped at 400 chars (ElevenLabs prompt ceiling comfort zone).
 */
export function buildMusicPrompt(i: MusicPromptInput): string {
  const s = STYLE_BY_ID[i.style] ?? STYLE_BY_ID.piano;
  const parts: string[] = [s.prompt];

  if (i.locationName) parts.push(`inspired by ${i.locationName}`);
  if (i.themes?.length)
    parts.push(`evoking ${i.themes.slice(0, 3).join(", ")}`);
  if (i.luminance != null)
    parts.push(i.luminance >= 60 ? "bright open air" : "soft shaded tones");

  const arc =
    i.energy === "LOW"
      ? "begins very gently and slowly blooms upward"
      : i.energy === "HIGH"
        ? "keeps a lively, walking-pace momentum throughout"
        : "flows evenly with a warm, easy sway";
  parts.push(arc);
  parts.push("instrumental only, seamless loop");

  return parts.join(", ").slice(0, 400);
}
