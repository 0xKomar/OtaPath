import { NextResponse } from "next/server";
import {
  getPatient,
  patientDetail,
  updatePatient,
  getOverride,
  type ClinicianOverride,
} from "@/lib/db";


type Params = { params: Promise<{ id: string }> };

/** GET /api/patients/[id] — profile + 14-day biometrics + missions + capsules. */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const p = await getPatient(id);
  if (!p) return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  return NextResponse.json(await patientDetail(p));
}

/** PATCH /api/patients/[id] — clinician guardrails + state fields. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const p = await getPatient(id);
  if (!p) return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  const body = (await req.json()) as {
    override?: ClinicianOverride;
    currentEnergyState?: string;
    contextFlag?: string;
    iafHz?: number;
    preferredMusicStyle?: string;
  };
  if (body.override) {
    const merged = { ...(await getOverride(id)), ...body.override };
    await updatePatient(id, { activeClinicianOverride: JSON.stringify(merged) });
    if (body.override.iafHz)
      await updatePatient(id, { iafHz: Math.min(12.5, Math.max(8, body.override.iafHz)) });
  }
  if (body.currentEnergyState)
    await updatePatient(id, { currentEnergyState: body.currentEnergyState });
  if (body.contextFlag && ["auto", "sick", "housebound"].includes(body.contextFlag))
    await updatePatient(id, { contextFlag: body.contextFlag });
  if (typeof body.iafHz === "number")
    await updatePatient(id, { iafHz: Math.min(12.5, Math.max(8, body.iafHz)) });
  if (typeof body.preferredMusicStyle === "string" && body.preferredMusicStyle)
    await updatePatient(id, { preferredMusicStyle: body.preferredMusicStyle });
  return NextResponse.json({ ok: true, override: await getOverride(id) });
}
