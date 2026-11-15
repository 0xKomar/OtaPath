/**
 * soundscape.ts — shared "AI soundscape" player used by the Memory
 * Atlas, Comfort Mode and SensoryPlayer.
 *
 * Priority: a capsule's cached soundscapeUrl plays straight from disk
 * (zero API credits); otherwise we POST /api/generate-soundscape which
 * returns {url} for a generated track; anything missing weaves the
 * on-device AmbientPad — audio always plays.
 */

import { AmbientPad } from "./ambientPad";
import type { EntrainmentMode } from "./entrainmentEngine";
import type { PatientState } from "./poi";
import type { MusicStyleId } from "./musicTaste";
import { useOtaStore } from "@/store/useOtaStore";

export interface SoundscapeHandle {
  source: "eleven" | "pad" | "disk";
  stop: () => void;
}

export interface SoundscapeOpts {
  /** capsule binding — enables disk cache + url write-back */
  memoryId?: string;
  /** already-cached MP3 on the capsule — play it directly */
  soundscapeUrl?: string;
  musicStyle?: MusicStyleId;
  energy?: PatientState;
  locationName?: string;
  themes?: string[];
}

export async function playSoundscape(
  ctx: AudioContext,
  prompt: string,
  mode: EntrainmentMode,
  patientState: PatientState,
  pad: AmbientPad,
  durationSeconds = 22,
  opts: SoundscapeOpts = {}
): Promise<SoundscapeHandle> {
  try {
    // 1 — a capsule that already carries its track plays instantly
    if (opts.soundscapeUrl) {
      const el = new Audio(opts.soundscapeUrl);
      el.loop = true;
      el.volume = 0.55;
      await Promise.race([
        el.play(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("play-timeout")), 4000)),
      ]);
      return {
        source: "disk",
        stop: () => el.pause(),
      };
    }
    // 2 — generate (or hit the disk cache) through the API
    const res = await fetch("/api/generate-soundscape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        durationSeconds,
        musicStyle: opts.musicStyle,
        memoryId: opts.memoryId,
        energy: opts.energy ?? patientState,
        locationName: opts.locationName,
        themes: opts.themes,
      }),
    });
    if (res.ok && res.status === 200) {
      const { url } = (await res.json()) as { url: string };
      // the server already wrote the row — mirror it into the local capsule
      if (opts.memoryId && url !== opts.soundscapeUrl)
        useOtaStore
          .getState()
          .setCapsuleSoundscape(opts.memoryId, url, opts.musicStyle ?? "piano");
      const el = new Audio(url);
      el.loop = true;
      el.volume = 0.55;
      await Promise.race([
        el.play(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("play-timeout")), 4000)),
      ]);
      return {
        source: "eleven",
        stop: () => el.pause(),
      };
    }
    throw new Error("no-api");
  } catch {
    pad.start(ctx, mode, patientState);
    return { source: "pad", stop: () => pad.stop() };
  }
}
