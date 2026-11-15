import { NextResponse } from "next/server";
import { insertNudge, listNudges, getPatient } from "@/lib/db";


/** GET /api/nudges?patientId=&unack=1 — the patient's check-in feed. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId") ?? "matti";
  const unack = url.searchParams.get("unack") === "1";
  return NextResponse.json({ nudges: await listNudges(patientId, unack) });
}

/** POST /api/nudges — a warm check-in from the care team. */
export async function POST(req: Request) {
  const body = (await req.json()) as { patientId?: string; doctorName?: string; message?: string };
  const patientId = body.patientId ?? "matti";
  if (!(await getPatient(patientId)))
    return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  if (!body.message?.trim())
    return NextResponse.json({ error: "message required" }, { status: 400 });
  const nudge = await insertNudge({
    id: `nud-${Date.now()}`,
    patientId,
    doctorName: body.doctorName?.trim() || "Dr. Lindqvist",
    message: body.message.trim(),
    createdAt: Date.now(),
  });
  return NextResponse.json({ nudge }, { status: 201 });
}
