import { NextResponse } from "next/server";

/**
 * POST /api/narrate — ElevenLabs Text-to-Speech for the spoken layer:
 * Comfort Mode's guided journey, Memory Echo retellings, gentle
 * walk-along stories. Body: { text, voiceId? } → audio/mpeg.
 * Returns 204 without ELEVENLABS_API_KEY — callers then simply
 * skip the voice track and keep the experience silent-but-warm.
 *
 * ELEVENLABS_VOICE_ID may pin a preferred voice; default is a calm,
 * warm preset voice good for bedside English.
 */

const TTS = (voice: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel — calm, warm

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new NextResponse(null, { status: 204 });

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const text = (body.text ?? "").trim().slice(0, 1400);
  if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });
  const voice = body.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE;

  try {
    const res = await fetch(TTS(voice), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": key,
        Accept: "audio/mpeg",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.72,
          similarity_boost: 0.75,
          style: 0.35,
          speed: 0.92,
        },
      }),
    });
    if (!res.ok) return new NextResponse(null, { status: 204 });
    const audio = await res.arrayBuffer();
    if (audio.byteLength < 512) return new NextResponse(null, { status: 204 });
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
