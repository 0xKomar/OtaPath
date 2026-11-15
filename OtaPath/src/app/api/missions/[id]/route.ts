import { NextResponse } from "next/server";
import { patchMission } from "@/lib/db";


/** PATCH /api/missions/[id] — status transitions + prompt edits. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Parameters<typeof patchMission>[1];
  const mission = await patchMission(id, body);
  if (!mission) return NextResponse.json({ error: "unknown mission" }, { status: 404 });
  return NextResponse.json({ mission });
}
