import { NextResponse } from "next/server";
import {
  insertMemory,
  blendTodayLog,
  completeActiveMissions,
  getPatient,
  updatePatient,
  updateMemorySoundscape,
  bioHistory,
  type MemoryRow,
} from "@/lib/db";
import { computeTriage } from "@/lib/triage";


interface MemoryBody {
  id: string;
  patientId?: string;
  lat: number;
  lng: number;
  locationName?: string;
  poiType?: string;
  kind?: string;
  photoUrl?: string;   // data URL — persisted directly
  audioUrl?: string;   // data URL — persisted directly
  audioDurS?: number;
  transcript?: string;
  acousticScore?: number;
  savoringScore?: number;
  luminance?: number;
  vibrancy?: number;
  valence?: number;
  themes?: string[];
  soundscapePrompt?: string;
  palette?: string[];   // dominant hex swatches from real pixel analysis
  f0Hz?: number;
  f0SdHz?: number;
  acousticDelta?: number; // −100…+100 vs discharge baseline
  soundscapeUrl?: string; // cached ElevenLabs MP3 — /api/audio/<file>
  musicStyle?: string;    // MusicStyleId that generated the track
  mobility?: number;   // patient's current exploration radius
  createdAt?: number;
}

/** POST /api/memories — persist a capsule, blend today's biometrics,
 *  complete the active mission, refresh triage. */
export async function POST(req: Request) {
  const body = (await req.json()) as MemoryBody;
  const patientId = body.patientId ?? "matti";
  const p = await getPatient(patientId);
  if (!p) return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  if (body.lat == null || body.lng == null)
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });

  const row = await insertMemory({
    id: body.id || `mem-${Date.now()}`,
    patientId,
    lat: body.lat,
    lng: body.lng,
    locationName: body.locationName ?? "a quiet spot",
    poiType: body.poiType ?? "photo",
    kind: body.kind ?? "moment",
    photoUrl: body.photoUrl ?? null,
    audioUrl: body.audioUrl ?? null,
    audioDurS: body.audioDurS ?? null,
    transcript: body.transcript ?? null,
    acousticScore: body.acousticScore ?? null,
    savoringScore: body.savoringScore ?? null,
    luminanceScore: body.luminance ?? null,
    vibrancyScore: body.vibrancy ?? null,
    valence: body.valence ?? null,
    themes: JSON.stringify(body.themes ?? []),
    soundscapePrompt: body.soundscapePrompt ?? null,
    palette: body.palette?.length ? JSON.stringify(body.palette) : null,
    f0Hz: body.f0Hz ?? null,
    f0SdHz: body.f0SdHz ?? null,
    acousticDelta: body.acousticDelta ?? null,
    soundscapeUrl: body.soundscapeUrl ?? null,
    musicStyle: body.musicStyle ?? null,
    createdAt: body.createdAt ?? Date.now(),
  });

  await blendTodayLog(patientId, {
    prosody: body.acousticScore,
    savoring: body.savoringScore,
    mobility: body.mobility,
    luminance: body.luminance,
  });
  await completeActiveMissions(patientId);
  await updatePatient(patientId, {
    triageStatus: computeTriage(await bioHistory(patientId), p.contextFlag).level,
  });

  return NextResponse.json({ memory: row as MemoryRow }, { status: 201 });
}

/** PATCH /api/memories — bind a generated soundscape to a capsule. */
export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    patientId?: string;
    soundscapeUrl?: string;
    musicStyle?: string;
  };
  if (!body.id || !body.soundscapeUrl || !body.musicStyle)
    return NextResponse.json(
      { error: "id, soundscapeUrl, musicStyle required" },
      { status: 400 }
    );
  await updateMemorySoundscape(
    body.patientId ?? "matti",
    body.id,
    body.soundscapeUrl,
    body.musicStyle
  );
  return NextResponse.json({ ok: true });
}
