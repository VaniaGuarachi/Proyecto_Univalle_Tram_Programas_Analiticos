import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export type FinalDocumentData = {
  idTramite: string;
  numero: string;
  codigo: string;
  verificationUrl: string;
  observaciones: string;
  estudianteNombre: string;
  codigoEstudiante: string;
  carrera: string;
  tipoTramite: string;
  detalleTramite: string | null;
  firmas: FinalDocumentFirma[];
  attachments: FinalDocumentAttachment[];
};

export type FinalDocumentFirma = {
  nombre: string;
  cargo: string;
  unidad?: string | null;
  tipo?: "DIGITAL" | "FISICA";
  imagen?: string | null;
  x: number;
  y: number;
};

export type FinalDocumentAttachment = {
  name: string;
  path: string;
};

const pageWidth = 595.28;
const pageHeight = 841.89;

function wrapText(text: string, maxChars: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function publicFilePath(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("data:")) return null;
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("uploads/")) return join(process.cwd(), "public", normalized);
  if (normalized.startsWith("emision/")) return join(process.cwd(), "public", "uploads", normalized);
  if (normalized.startsWith("facturas/")) return join(process.cwd(), "public", normalized);
  if (normalized.startsWith("img/")) return join(process.cwd(), "public", normalized);
  return join(process.cwd(), "public", "uploads", normalized);
}

async function imageBytesFromSource(source: string | null | undefined) {
  if (!source) return null;
  if (source.startsWith("data:")) {
    const [, base64] = source.split(",");
    return base64 ? Buffer.from(base64, "base64") : null;
  }
  const filePath = publicFilePath(source);
  if (!filePath || !existsSync(filePath)) return null;
  return readFile(filePath);
}

async function drawImageIfPossible(pdfDoc: PDFDocument, page: ReturnType<PDFDocument["addPage"]>, source: string | null | undefined, x: number, y: number, maxWidth: number, maxHeight: number) {
  const bytes = await imageBytesFromSource(source);
  if (!bytes) return false;
  try {
    const image = source?.toLowerCase().includes("jpg") || source?.toLowerCase().includes("jpeg")
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);
    const scaled = image.scale(Math.min(maxWidth / image.width, maxHeight / image.height));
    page.drawImage(image, {
      x: x + (maxWidth - scaled.width) / 2,
      y: y + (maxHeight - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
    return true;
  } catch {
    return false;
  }
}

async function appendPdf(pdfDoc: PDFDocument, attachment: FinalDocumentAttachment) {
  const filePath = publicFilePath(attachment.path);
  if (!filePath || !existsSync(filePath)) {
    throw new Error(`No se encontr\u00f3 el PDF adjunto: ${attachment.name}`);
  }
  const sourceDoc = await PDFDocument.load(await readFile(filePath));
  const pages = await pdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
  pages.forEach((page) => pdfDoc.addPage(page));
}

export async function generateFinalDocumentPdf(data: FinalDocumentData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoPath = join(process.cwd(), "public", "img", "Logo_Doc.png");
  if (existsSync(logoPath)) {
    await drawImageIfPossible(pdfDoc, page, "/img/Logo_Doc.png", 225, 735, 145, 55);
  }

  page.drawText("UNIVERSIDAD PRIVADA DEL VALLE", { x: 160, y: 715, size: 14, font: bold, color: rgb(0.08, 0.1, 0.14) });
  page.drawText("Departamento de Registro y Tr\u00e1mites Acad\u00e9micos", { x: 170, y: 695, size: 9, font: sans, color: rgb(0.32, 0.36, 0.42) });
  page.drawLine({ start: { x: 55, y: 680 }, end: { x: 540, y: 680 }, thickness: 1.2, color: rgb(0.12, 0.14, 0.18) });

  page.drawText("CERTIFICACI\u00d3N ACAD\u00c9MICA", { x: 177, y: 635, size: 18, font: bold, color: rgb(0.08, 0.1, 0.14) });
  page.drawText(`N\u00b0 ${data.numero}`, { x: 255, y: 615, size: 9, font: sans, color: rgb(0.35, 0.39, 0.45) });

  let y = 570;
  const body = [
    "Por el presente documento se certifica que el/la estudiante:",
    data.estudianteNombre.toUpperCase(),
    `Con c\u00f3digo/matr\u00edcula ${data.codigoEstudiante}, perteneciente a la carrera ${data.carrera}, solicit\u00f3 el tr\u00e1mite ${data.tipoTramite}.`,
    `Detalle de la solicitud: ${data.observaciones || data.detalleTramite || "Sin observaciones registradas."}`,
    `Emitido en fecha ${new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.`,
  ];

  body.forEach((paragraph, index) => {
    const lines = wrapText(paragraph, index === 1 ? 42 : 88);
    lines.forEach((line) => {
      page.drawText(line, {
        x: index === 1 ? Math.max(70, (pageWidth - bold.widthOfTextAtSize(line, 14)) / 2) : 70,
        y,
        size: index === 1 ? 14 : 11,
        font: index === 1 ? bold : font,
        color: rgb(0.12, 0.14, 0.18),
      });
      y -= index === 1 ? 18 : 15;
    });
    y -= 13;
  });

  const signedAt = new Date().toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  for (const [index, firma] of data.firmas.entries()) {
    const scaledX = Math.max(60, Math.min(415, 55 + (firma.x / 620) * 485));
    const scaledY = Math.max(125, Math.min(285, pageHeight - 55 - (firma.y / 860) * pageHeight));
    const blockY = index > 1 ? scaledY - 72 : scaledY;
    const imageDrawn = await drawImageIfPossible(pdfDoc, page, firma.imagen, scaledX + 25, blockY + 55, 110, 34);
    if (!imageDrawn) {
      page.drawText(firma.nombre.split(" ")[0] || "Firma", { x: scaledX + 38, y: blockY + 62, size: 18, font: italic, color: rgb(0.05, 0.18, 0.45) });
    }
    page.drawLine({ start: { x: scaledX, y: blockY + 50 }, end: { x: scaledX + 165, y: blockY + 50 }, thickness: 0.7, color: rgb(0.35, 0.39, 0.45) });
    page.drawText(firma.nombre.toUpperCase(), { x: scaledX, y: blockY + 36, size: 7.5, font: sansBold, color: rgb(0.08, 0.1, 0.14) });
    page.drawText(firma.cargo.toUpperCase(), { x: scaledX, y: blockY + 25, size: 7, font: sans, color: rgb(0.29, 0.33, 0.39) });
    page.drawText((firma.unidad || "Tr\u00e1mites Acad\u00e9micos").toUpperCase(), { x: scaledX, y: blockY + 14, size: 7, font: sans, color: rgb(0.29, 0.33, 0.39) });
    page.drawText(`Firmado: ${signedAt}`, { x: scaledX, y: blockY + 3, size: 6.5, font: sans, color: rgb(0.45, 0.5, 0.57) });
  }

  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl || data.codigo, { margin: 1, width: 220 });
  await drawImageIfPossible(pdfDoc, page, qrDataUrl, 455, 70, 74, 74);
  page.drawText(`C\u00f3digo de validaci\u00f3n: ${data.codigo}`, { x: 65, y: 105, size: 8, font: sansBold, color: rgb(0.1, 0.12, 0.16) });
  page.drawText("Verificable en l\u00ednea mediante QR", { x: 65, y: 92, size: 7.5, font: sans, color: rgb(0.45, 0.5, 0.57) });
  page.drawLine({ start: { x: 55, y: 160 }, end: { x: 540, y: 160 }, thickness: 0.4, color: rgb(0.86, 0.88, 0.91) });

  for (const attachment of data.attachments) {
    await appendPdf(pdfDoc, attachment);
  }

  const finalDir = join(process.cwd(), "public", "uploads", "emision");
  await mkdir(finalDir, { recursive: true });
  const fileName = `final-${data.idTramite}-${Date.now()}.pdf`;
  await writeFile(join(finalDir, fileName), await pdfDoc.save());
  return {
    path: `emision/${fileName}`,
    publicUrl: `/uploads/emision/${fileName}`,
  };
}
