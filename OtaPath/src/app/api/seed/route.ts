import { NextResponse } from "next/server";
import { wipeAll, seedAll, countPatients } from "@/lib/db";


/** POST /api/seed — wipe + reseed the demo cohort (patients, biometrics,
 *  memories). Auth users are seeded by supabase/schema.sql, not here —
 *  this resets clinical data only. Requires SUPABASE_SERVICE_ROLE_KEY. */
export async function POST() {
  try {
    await wipeAll();
    await seedAll();
    return NextResponse.json({ ok: true, patients: await countPatients() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "seed failed" },
      { status: 500 }
    );
  }
}
