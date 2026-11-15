import { NextResponse, connection } from "next/server";
import { listPatients, postTmsDay, findPatientByCode, createPatient } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";


/** GET /api/patients — the clinician caseload. */
export async function GET() {
  await connection(); // request-time only — never prerendered at build
  const patients = (await listPatients()).map((p) => ({
    id: p.id,
    name: p.name,
    initials: p.initials,
    note: p.note,
    hue: p.hue,
    postTmsDay: postTmsDay(p),
    energyState: p.currentEnergyState,
    triageStatus: p.triageStatus,
    override: JSON.parse(p.activeClinicianOverride || "{}"),
    preferredMusicStyle: p.preferredMusicStyle ?? "piano",
    authEmail: p.authEmail ?? null,
    updatedAt: p.updatedAt,
    lastSignalAt: p.lastSignalAt ?? null,
  }));
  return NextResponse.json({ patients });
}

/** POST /api/patients — two shapes:
 *
 *  { email, password?, name, note? } — clinician creates the patient's
 *    login (Supabase Auth user) AND their record. The patient never
 *    self-registers — the doctor hands them the credentials.
 *    Password is optional: omit it and the API generates a readable
 *    one-time password the clinician can print/screenshot once.
 *
 *  { code, name?, note? } — legacy OTA pairing-code enrollment
 *    (kept for compatibility; new accounts use the auth flow above). */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    code?: string;
    name?: string;
    note?: string;
    email?: string;
    password?: string;
  };
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();

  /* --- clinician-created account (the production path) ------------- */
  if (email) {
    if (!name)
      return NextResponse.json({ error: "patient name required" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "valid email required" }, { status: 400 });

    const password = body.password?.trim() || generatePassword();
    if (password.length < 6)
      return NextResponse.json(
        { error: "password must be at least 6 characters" },
        { status: 400 }
      );

    const sb = supabaseAdmin();
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // clinician vouches for the address — no inbox needed
    });
    if (authErr)
      return NextResponse.json(
        { error: authErr.message.includes("already") ? "that email already has an account" : authErr.message },
        { status: 409 }
      );

    const patient = await createPatient({
      name,
      note: body.note,
      authUserId: authData.user.id,
      authEmail: email,
    });
    return NextResponse.json(
      {
        patient: { id: patient.id, name: patient.name, email },
        // returned exactly once — the clinician hands it to the patient
        credentials: { email, password: body.password?.trim() ? undefined : password },
      },
      { status: 201 }
    );
  }

  /* --- legacy pairing-code enrollment ------------------------------ */
  const code = body.code?.trim();
  if (!code)
    return NextResponse.json({ error: "email or pairing code required" }, { status: 400 });

  const existing = await findPatientByCode(code);
  if (existing)
    return NextResponse.json({
      patient: { id: existing.id, name: existing.name },
      alreadyLinked: true,
    });

  if (!name)
    return NextResponse.json(
      { error: "code not recognized — enter the patient's name to create their record" },
      { status: 404 }
    );

  const patient = await createPatient({ name, code, note: body.note });
  return NextResponse.json(
    { patient: { id: patient.id, name: patient.name }, alreadyLinked: false },
    { status: 201 }
  );
}

/** readable one-time password the clinician can write down for the patient */
function generatePassword(): string {
  const words = ["birch", "harbor", "meadow", "lantern", "river", "sunlit", "forest", "willow"];
  const w = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 90) + 10;
  return `${w()}-${w()}-${n}`;
}
