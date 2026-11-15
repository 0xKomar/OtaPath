import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/**
 * GET /api/audio/[name] — streams a generated MP3 from the persistent
 * audio cache (data/generated-audio/). Stored here rather than public/
 * because files added to public/ after `next build` are NOT served —
 * this route works identically in dev and `next start`.
 */

const DIR = path.join(process.cwd(), "data", "generated-audio");
const SAFE = /^[\w-]+\.mp3$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!SAFE.test(name))
    return NextResponse.json({ error: "bad name" }, { status: 400 });
  const file = path.join(DIR, name);
  if (!file.startsWith(DIR) || !fs.existsSync(file))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = fs.readFileSync(file);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
