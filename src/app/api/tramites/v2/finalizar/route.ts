import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { pool } from "@/lib/db";
import { generateFinalDocumentPdf, type FinalDocumentAttachment } from "@/lib/finalDocumentPdf";

interface TramiteRow extends RowDataPacket {
  id_estado_actual: number;
  id_usuario: number;
  estado_pago: string | null;
  estado_solvencia: string | null;
  estudiante_nombre: string;
  codigo_estudiante: string;
  carrera: string;
  tipo_tramite: string;
  detalle_tramite: string | null;
}

interface DocumentoRow extends RowDataPacket {
  id_documento_emitido: number;
}

type FirmaPayload = {
  nombre: string;
  cargo: string;
  unidad?: string | null;
  tipo?: "DIGITAL" | "FISICA";
  imagen?: string | null;
  x: number;
  y: number;
};

interface PdfRow extends RowDataPacket {
  nombre_archivo: string;
  ruta_archivo: string;
}

async function ensureSchema() {
  const estados = [
    ["EMITIDO", "Emitido", "Documento emitido", 7, 0, 0],
    ["FINALIZADO", "Finalizado", "Trámite finalizado", 8, 1, 0],
  ];
  for (const estado of estados) {
    await pool.query(
      `INSERT INTO univalle_tramites.estados_tramite
       (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo), es_final = VALUES(es_final), es_bloqueante = VALUES(es_bloqueante)`,
      estado
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS univalle_tramites.documentos_adjuntos_emision (
      id_adjunto INT AUTO_INCREMENT PRIMARY KEY,
      id_tramite INT NOT NULL,
      nombre_archivo VARCHAR(255) NOT NULL,
      ruta_archivo VARCHAR(255) NOT NULL,
      tamano_archivo BIGINT,
      fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_adjuntos_emision_tramite FOREIGN KEY (id_tramite) REFERENCES univalle_tramites.tramites(id_tramite)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS univalle_tramites.documentos_emision_logs (
      id_log INT AUTO_INCREMENT PRIMARY KEY,
      id_tramite INT NOT NULL,
      accion VARCHAR(120) NOT NULL,
      detalle TEXT NULL,
      fecha_log TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const [cols] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'firmas_documento'
       AND COLUMN_NAME IN ('posicion_x','posicion_y','unidad_firmante')`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has("posicion_x")) await pool.query("ALTER TABLE univalle_tramites.firmas_documento ADD COLUMN posicion_x INT NULL");
  if (!names.has("posicion_y")) await pool.query("ALTER TABLE univalle_tramites.firmas_documento ADD COLUMN posicion_y INT NULL");
  if (!names.has("unidad_firmante")) await pool.query("ALTER TABLE univalle_tramites.firmas_documento ADD COLUMN unidad_firmante VARCHAR(150) NULL");
}

async function savePdf(file: File, idTramite: string) {
  if (file.type !== "application/pdf") throw new Error("Solo se permiten archivos PDF.");
  const uploadDir = join(process.cwd(), "public", "uploads", "emision");
  await mkdir(uploadDir, { recursive: true });
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const fileName = `${Date.now()}-${idTramite}-${safeName}`;
  await writeFile(join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return { name: file.name, path: `emision/${fileName}`, size: file.size };
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const formData = await request.formData();
    const idTramite = String(formData.get("id_tramite") || "");
    const codigo = String(formData.get("codigo") || "");
    const numero = String(formData.get("nroCertificacion") || "");
    const observaciones = String(formData.get("observaciones") || "");
    const verificationUrl = String(formData.get("verificationUrl") || "");
    const firmas = JSON.parse(String(formData.get("firmas") || "[]")) as FirmaPayload[];
    const pdfs = formData.getAll("pdfs").filter((item): item is File => item instanceof File && item.size > 0);

    if (!idTramite || !codigo || !numero) {
      return NextResponse.json({ error: "id_tramite, codigo y nroCertificacion son requeridos" }, { status: 400 });
    }
    if (firmas.length < 2) {
      return NextResponse.json({ error: "Debes aplicar al menos dos firmas digitales requeridas antes de emitir." }, { status: 400 });
    }
    if (pdfs.length > 8) {
      return NextResponse.json({ error: "Máximo 8 PDFs permitidos." }, { status: 400 });
    }

    const [tramiteRows] = await pool.query<TramiteRow[]>(
      `SELECT
        t.id_estado_actual,
        u.id_usuario,
        p.estado_pago,
        s.estado_solvencia,
        CONCAT(u.nombres, ' ', u.apellidos) AS estudiante_nombre,
        e.codigo_estudiante,
        c.nombre AS carrera,
        tt.nombre AS tipo_tramite,
        tt.descripcion AS detalle_tramite
       FROM univalle_tramites.tramites t
       JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
       JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
       LEFT JOIN univalle_tramites.pagos p ON t.id_tramite = p.id_tramite
       LEFT JOIN univalle_tramites.solvencias s ON t.id_tramite = s.id_tramite
       WHERE t.id_tramite = ?`,
      [idTramite]
    );

    if (!tramiteRows[0]) return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    if (tramiteRows[0].estado_pago && tramiteRows[0].estado_pago !== "PAGADO") {
      return NextResponse.json({ error: "El trámite no tiene pago aprobado" }, { status: 400 });
    }
    if (tramiteRows[0].estado_solvencia && !["SIN_DEUDAS", "SOLVENTE"].includes(tramiteRows[0].estado_solvencia)) {
      return NextResponse.json({ error: "El trámite no tiene solvencia aprobada" }, { status: 400 });
    }

    const savedPdfs = [];
    for (const pdf of pdfs) savedPdfs.push(await savePdf(pdf, idTramite));
    const [existingAdjuntos] = await pool.query<PdfRow[]>(
      `SELECT nombre_archivo, ruta_archivo
       FROM univalle_tramites.documentos_adjuntos_emision
       WHERE id_tramite = ?
       ORDER BY fecha_subida ASC, id_adjunto ASC`,
      [idTramite]
    );
    const attachments: FinalDocumentAttachment[] = [
      ...existingAdjuntos.map((pdf) => ({ name: pdf.nombre_archivo, path: pdf.ruta_archivo })),
      ...savedPdfs.map((pdf) => ({ name: pdf.name, path: pdf.path })),
    ];

    const finalPdf = await generateFinalDocumentPdf({
      idTramite,
      numero,
      codigo,
      verificationUrl,
      observaciones,
      estudianteNombre: tramiteRows[0].estudiante_nombre,
      codigoEstudiante: tramiteRows[0].codigo_estudiante,
      carrera: tramiteRows[0].carrera,
      tipoTramite: tramiteRows[0].tipo_tramite,
      detalleTramite: tramiteRows[0].detalle_tramite,
      firmas,
      attachments,
    });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<DocumentoRow[]>(
        "SELECT id_documento_emitido FROM univalle_tramites.documentos_emitidos WHERE id_tramite = ?",
        [idTramite]
      );

      let documentoId = existing[0]?.id_documento_emitido;
      if (documentoId) {
        await connection.query(
          `UPDATE univalle_tramites.documentos_emitidos
           SET numero_documento = ?, codigo_verificacion = ?, qr_verificacion = ?, ruta_pdf_firmado = ?, estado_documento = 'BORRADOR'
           WHERE id_documento_emitido = ?`,
          [numero, codigo, verificationUrl, finalPdf.path, documentoId]
        );
      } else {
        const [inserted] = await connection.query<ResultSetHeader>(
          `INSERT INTO univalle_tramites.documentos_emitidos
           (id_tramite, numero_documento, codigo_verificacion, qr_verificacion, ruta_pdf_firmado, estado_documento, id_usuario_emisor)
           VALUES (?, ?, ?, ?, ?, 'BORRADOR', 4)`,
          [idTramite, numero, codigo, verificationUrl, finalPdf.path]
        );
        documentoId = inserted.insertId;
      }

      await connection.query("DELETE FROM univalle_tramites.firmas_documento WHERE id_documento_emitido = ?", [documentoId]);
      for (const firma of firmas) {
        await connection.query(
          `INSERT INTO univalle_tramites.firmas_documento
           (id_documento_emitido, nombre_firmante, cargo_firmante, unidad_firmante, tipo_firma, ruta_archivo_firma, estado, fecha_firma, posicion_x, posicion_y)
           VALUES (?, ?, ?, ?, ?, ?, 'FIRMADO', NOW(), ?, ?)`,
          [documentoId, firma.nombre, firma.cargo, firma.unidad || "Tr\u00e1mites Acad\u00e9micos", firma.tipo || "DIGITAL", firma.imagen || null, Math.round(firma.x), Math.round(firma.y)]
        );
      }

      await connection.query("DELETE FROM univalle_tramites.documentos_adjuntos_emision WHERE id_tramite = ?", [idTramite]);
      for (const pdf of attachments) {
        await connection.query(
          `INSERT INTO univalle_tramites.documentos_adjuntos_emision
           (id_tramite, nombre_archivo, ruta_archivo, tamano_archivo)
           VALUES (?, ?, ?, ?)`,
          [idTramite, pdf.name, pdf.path, null]
        );
      }

      await connection.query(
        `INSERT INTO univalle_tramites.documentos_emision_logs (id_tramite, accion, detalle)
         VALUES
         (?, 'DOCUMENTO_GENERADO', ?),
         (?, 'FIRMAS_APLICADAS', ?),
         (?, 'VISTA_PREVIA_LISTA', ?)`,
        [
          idTramite,
          `Documento generado correctamente: ${finalPdf.path}`,
          idTramite,
          `Firmas digitales aplicadas: ${firmas.length}`,
          idTramite,
          `Vista previa lista con ${attachments.length} adjunto(s).`,
        ]
      );

      await connection.commit();
      return NextResponse.json({
        success: true,
        codigo,
        id_documento_emitido: documentoId,
        ruta_pdf_final: finalPdf.publicUrl,
        mensajes: [
          "Documento consolidado generado correctamente.",
          "Firmas digitales aplicadas.",
          "Vista previa lista.",
        ],
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error al finalizar trámite:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}
