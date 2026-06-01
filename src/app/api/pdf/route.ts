import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join, normalize } from "path";
import { NextResponse } from "next/server";

function localPublicPath(src: string) {
  const normalized = normalize(src.replace(/\\/g, "/").replace(/^\/+/, ""));
  const publicRoot = join(process.cwd(), "public");
  const filePath = join(publicRoot, normalized);
  return filePath.startsWith(publicRoot) ? filePath : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const src = url.searchParams.get("src");
    const shouldDownload = url.searchParams.get("download") === "1";
    const rawFilename = url.searchParams.get("filename") || "documento.pdf";
    const filename = rawFilename
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/\.pdf$/i, "") + ".pdf";
    if (!src) {
      return NextResponse.json({ error: "PDF no especificado" }, { status: 400 });
    }

    let bytes: Buffer;
    if (/^https?:\/\//i.test(src)) {
      const url = new URL(src);
      if (url.hostname !== "res.cloudinary.com") {
        return NextResponse.json({ error: "Origen de PDF no permitido" }, { status: 400 });
      }
      const response = await fetch(src);
      if (!response.ok) {
        return NextResponse.json({ error: "No se pudo cargar el PDF" }, { status: response.status });
      }
      bytes = Buffer.from(await response.arrayBuffer());
    } else {
      const filePath = localPublicPath(src);
      if (!filePath || !existsSync(filePath)) {
        return NextResponse.json({ error: "PDF no encontrado" }, { status: 404 });
      }
      bytes = await readFile(filePath);
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error sirviendo PDF:", error);
    return NextResponse.json({ error: "Error interno al cargar PDF" }, { status: 500 });
  }
}
