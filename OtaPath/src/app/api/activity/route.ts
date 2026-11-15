import { NextResponse, connection } from "next/server";
import { cohortStats, recentActivity } from "@/lib/db";

/** GET /api/activity — the cohort-wide "what's new" feed: newest
 *  memory capsules, mission assignments + completions, check-in
 *  nudges and patient joins across every patient, newest first —
 *  plus headline cohort counts for the rail's pulse tiles. */
export async function GET() {
  await connection(); // request-time only — never prerendered at build
  return NextResponse.json({
    events: await recentActivity(24),
    stats: await cohortStats(),
  });
}
