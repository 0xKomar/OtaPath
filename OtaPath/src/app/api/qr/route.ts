import { NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * GET /api/qr — PNG QR code pointing judges' phones at the patient app.
 * The target is derived from the request's own Host header, so on a LAN
 * demo (e.g. http://192.168.x.x:3001/demo) the QR resolves to the same
 * reachable address — no config needed on stage.
 */

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const target = `${proto}://${host}/app`;
  try {
    const png = await QRCode.toBuffer(target, {
      width: 360,
      margin: 2,
      color: { dark: "#1C1917", light: "#FDF8EE" },
    });
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "qr failed" }, { status: 500 });
  }
}
