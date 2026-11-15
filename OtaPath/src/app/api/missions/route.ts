import { NextResponse } from "next/server";
import { createMission, getPatient, listMissions, type MissionRow } from "@/lib/db";
import { haversineM } from "@/lib/geo";

/** hard guardrail — no mission may ever land farther than 3 km from the patient */
const MAX_MISSION_DIST_M = 3000;


/** GET /api/missions?patientId=&status= — the patient's mission queue. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId") ?? "matti";
  const status = url.searchParams.get("status") ?? undefined;
  return NextResponse.json({ missions: await listMissions(patientId, status) });
}

/** POST /api/missions — clinician prescription or closed-loop assignment.
 *  A new mission supersedes whatever was ACTIVE. */
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<MissionRow> & { patientId?: string };
  const patientId = body.patientId ?? "matti";
  if (!(await getPatient(patientId)))
    return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  if (!body.title || body.lat == null || body.lng == null || !body.poiName)
    return NextResponse.json({ error: "title, poiName, lat, lng required" }, { status: 400 });

  // 3 km sanity check — reject cross-country prescriptions outright when
  // the caller supplied the patient's live position (indoor quests exempt)
  const patientLat = (body as { patientLat?: number }).patientLat;
  const patientLng = (body as { patientLng?: number }).patientLng;
  if (
    patientLat != null && patientLng != null &&
    body.poiCategory !== "indoor" &&
    haversineM([patientLat, patientLng], [body.lat, body.lng]) > MAX_MISSION_DIST_M
  ) {
    return NextResponse.json(
      { error: "mission target is more than 3 km from the patient", rejected: true },
      { status: 422 }
    );
  }

  const mission = await createMission({
    id: body.id ?? `msn-${Date.now()}`,
    patientId,
    title: body.title,
    photoPrompt: body.photoPrompt ?? null,
    voicePrompt: body.voicePrompt ?? null,
    poiName: body.poiName,
    poiCategory: body.poiCategory ?? "nature",
    lat: body.lat,
    lng: body.lng,
    difficultyTier: body.difficultyTier ?? body.poiCategory ?? "nature",
    assignedBy: body.assignedBy ?? "CLINICIAN_CUSTOM",
    clinicianNote: body.clinicianNote ?? null,
    doctorName: body.doctorName ?? null,
    audioPairing: body.audioPairing ?? null,
    createdAt: Date.now(),
  });
  return NextResponse.json({ mission }, { status: 201 });
}
