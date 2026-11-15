import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { buildMusicPrompt, isMusicStyle, type MusicStyleId } from "@/lib/musicTaste";
import { updateMemorySoundscape } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/generate-soundscape — personalized music engine.
 *
 * Body: {
 *   prompt?,                       // explicit prompt (legacy callers)
 *   durationSeconds?,              // default 30 for music, ≤22 for sfx
 *   kind?: "music" | "sfx",
 *   musicStyle?: MusicStyleId,     // patient's vibe → builds the prompt
 *   memoryId?, patientId?,         // binds the track to a capsule
 *   energy?, locationName?, themes?, luminance?,  // prompt context
 *   force?                         // regenerate even when cached
 * }
 *
 * Pipeline:
 *   1. cache — Supabase Storage object (prod) or
 *      data/generated-audio/<key>-<style>.mp3 (local dev) → {url}
 *   2. ElevenLabs Music API (/v1/music, music_v2, force_instrumental)
 *   3. → on failure / "nature" style → Sound Generation
 *        (/v1/sound-generation, eleven_text_to_sound_v3, loop:true)
 *   4. success → MP3 uploaded to the public `capsule-audio` bucket
 *      (or disk locally), URL stored on the capsule row
 *   5. no key / quota → 204 → client weaves the on-device pad instead
 */

const MUSIC_URL = "https://api.elevenlabs.io/v1/music";
const SFX_URL = "https://api.elevenlabs.io/v1/sound-generation";
const DIR = path.join(process.cwd(), "data", "generated-audio");

interface GenBody {
  prompt?: string;
  durationSeconds?: number;
  kind?: "music" | "sfx";
  musicStyle?: string;
  memoryId?: string;
  patientId?: string;
  energy?: string;
  locationName?: string;
  themes?: string[];
  luminance?: number;
  force?: boolean;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export async function POST(req: Request) {
  let body: GenBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const style: MusicStyleId = isMusicStyle(body.musicStyle)
    ? body.musicStyle
    : "piano";
  const prompt =
    body.prompt?.trim() ||
    buildMusicPrompt({
      style,
      locationName: body.locationName,
      themes: body.themes,
      energy: body.energy,
      luminance: body.luminance,
    });
  if (!prompt) return NextResponse.json({ error: "missing prompt" }, { status: 400 });

  // ── 1. cache — Supabase Storage (prod, serverless-safe) or
  //      local disk (dev without Supabase env) ──
  const cacheKey = body.memoryId ?? `s-${hash(style + prompt)}`;
  const fileName = `${cacheKey.replace(/[^\w-]/g, "")}-${style}.mp3`;
  const file = path.join(DIR, fileName);
  const BUCKET = "capsule-audio";
  const useStorage = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  const url = useStorage ? publicUrl : `/api/audio/${fileName}`;
  if (!body.force) {
    if (useStorage) {
      try {
        if ((await fetch(publicUrl, { method: "HEAD" })).ok)
          return NextResponse.json({ url, cached: true, source: "cache" });
      } catch { /* fall through to generation */ }
    } else if (fs.existsSync(file)) {
      return NextResponse.json({ url, cached: true, source: "cache" });
    }
  }

  // no key / quota — the client weaves the on-device pad instead
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new NextResponse(null, { status: 204 });

  const dur = Math.min(90, Math.max(4, body.durationSeconds ?? 30));
  const headers = {
    "Content-Type": "application/json",
    "xi-api-key": key,
  };

  const persist = async (res: Response) => {
    const audio = await res.arrayBuffer();
    if (audio.byteLength < 1024) return null;
    if (useStorage) {
      const { error } = await supabaseAdmin()
        .storage.from(BUCKET)
        .upload(fileName, audio, { contentType: "audio/mpeg", upsert: true });
      if (error) return null;
    } else {
      fs.mkdirSync(DIR, { recursive: true });
      fs.writeFileSync(file, Buffer.from(audio));
    }
    if (body.memoryId)
      await updateMemorySoundscape(body.patientId ?? "matti", body.memoryId, url, style);
    return NextResponse.json({ url, cached: false, source: "elevenlabs" });
  };

  try {
    // ── 2. ElevenLabs Music API — real composition, instrumental lock ──
    if ((body.kind ?? "music") === "music" && style !== "nature") {
      const res = await fetch(MUSIC_URL, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          prompt,
          model_id: "music_v2",
          music_length_ms: Math.round(dur * 1000),
          force_instrumental: true,
        }),
      });
      if (res.ok) {
        const out = await persist(res);
        if (out) return out;
      }
      // 403/404 (plan tier) or any failure → sound-generation fallback
    }

    // ── 3. Sound Generation API — ambient/organic soundscape ──
    const res = await fetch(SFX_URL, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        text: prompt,
        model_id: "eleven_text_to_sound_v3",
        duration_seconds: Math.min(22, dur),
        loop: true,
        prompt_influence: 0.45,
      }),
    });
    if (!res.ok) return new NextResponse(null, { status: 204 });
    const out = await persist(res);
    return out ?? new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
