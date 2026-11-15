/**
 * savoring.ts — tiny client-side "savoring score" for reflection notes.
 * Rewards presence words + length, never punishes. 0–100.
 */

const SAVORING_WORDS = [
  "beautiful", "calm", "warm", "bright", "soft", "gentle", "light",
  "golden", "green", "blue", "quiet", "peace", "happy", "glad",
  "grateful", "lovely", "vivid", "color", "colour", "sun", "sky",
  "leaf", "flower", "bird", "water", "sea", "breeze", "smile",
  "noticed", "felt", "alive", "still", "slow", "breath", "moment",
];

export function savoringScore(note: string): number {
  const words = note.toLowerCase().match(/[a-zäöå']+/g) ?? [];
  if (words.length === 0) return 0;
  const hits = words.filter((w) => SAVORING_WORDS.includes(w)).length;
  const lengthPts = Math.min(50, words.length * 5);
  const savorPts = Math.min(50, hits * 18);
  return Math.min(100, lengthPts + savorPts);
}
