import { NextResponse } from "next/server";
import { getPatient, listBanditArms, updateBanditArm } from "@/lib/db";

/** GET /api/bandit?patientId= — learned arm weights for the loop display. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId") ?? "matti";
  if (!(await getPatient(patientId)))
    return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  return NextResponse.json({ arms: await listBanditArms(patientId) });
}

/** POST /api/bandit — record a real mission outcome.
 *  body: { patientId, arm, reward }  reward ∈ −1…+1 */
export async function POST(req: Request) {
  const body = (await req.json()) as { patientId?: string; arm?: string; reward?: number };
  const patientId = body.patientId ?? "matti";
  if (!(await getPatient(patientId)))
    return NextResponse.json({ error: "unknown patient" }, { status: 404 });
  if (!body.arm || typeof body.reward !== "number")
    return NextResponse.json({ error: "arm and numeric reward required" }, { status: 400 });
  const reward = Math.max(-1, Math.min(1, body.reward));
  const row = await updateBanditArm(patientId, body.arm, reward);
  return NextResponse.json({ arm: row }, { status: 201 });
}
