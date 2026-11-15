import { NextResponse } from "next/server";
import { getPatientByAuthUser, patientDetail } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/patients/me — the signed-in patient's own record.
 *  Reads `Authorization: Bearer <supabase-access-token>` → resolves the
 *  auth user → their linked patient row → same payload as [id]. */
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "").trim();
  if (!token) return NextResponse.json({ error: "bearer token required" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user)
    return NextResponse.json({ error: "invalid session" }, { status: 401 });

  const patient = await getPatientByAuthUser(data.user.id);
  if (!patient)
    return NextResponse.json({ error: "no patient linked to this account" }, { status: 404 });
  return NextResponse.json(await patientDetail(patient));
}
