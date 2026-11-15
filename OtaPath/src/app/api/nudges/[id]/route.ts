import { NextResponse } from "next/server";
import { ackNudge } from "@/lib/db";


/** PATCH /api/nudges/[id] — acknowledge on the patient's device. */
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ackNudge((await params).id);
  return NextResponse.json({ ok: true });
}
