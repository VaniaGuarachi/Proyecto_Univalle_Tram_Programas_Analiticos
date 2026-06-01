import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const data = new URL(request.url).searchParams.get("data");
  if (!data) return NextResponse.json({ error: "data requerido" }, { status: 400 });

  const svg = await QRCode.toString(data, {
    type: "svg",
    margin: 1,
    width: 180,
    color: { dark: "#111827", light: "#ffffff" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
