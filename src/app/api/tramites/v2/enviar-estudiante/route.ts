import { existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface EstadoRow extends RowDataPacket {
  id_estado_tramite: number;
}

interface DocumentoRow extends RowDataPacket {
  id_documento_emitido: number;
  numero_documento: string;
  codigo_verificacion: string;
  ruta_pdf_firmado: string | null;
  id_estado_actual: number;
  id_usuario: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

function publicFilePath(path: string) {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized.startsWith("uploads/")
    ? join(process.cwd(), "public", normalized)
    : join(process.cwd(), "public", "uploads", normalized);
}

async function ensureSchema() {
  await pool.query(
    `INSERT INTO univalle_tramites.estados_tramite
     (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
     VALUES ('FINALIZADO', 'Finalizado', 'Trámite finalizado', 8, 1, 0, 'ACTIVO')
     ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo), es_final = VALUES(es_final), es_bloqueante = VALUES(es_bloqueante)`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS univalle_tramites.documentos_emision_logs (
      id_log INT AUTO_INCREMENT PRIMARY KEY,
      id_tramite INT NOT NULL,
      accion VARCHAR(120) NOT NULL,
      detalle TEXT NULL,
      fecha_log TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

export async function POST(request: Request) {
  let connection;
  try {
    await ensureSchema();
    const { id_tramite } = await request.json();
    if (!id_tramite) {
      return NextResponse.json({ error: "id_tramite es requerido" }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [documentos] = await connection.query<DocumentoRow[]>(
      `SELECT
        de.id_documento_emitido,
        de.numero_documento,
        de.codigo_verificacion,
        de.ruta_pdf_firmado,
        t.id_estado_actual,
        u.id_usuario
       FROM univalle_tramites.documentos_emitidos de
       JOIN univalle_tramites.tramites t ON de.id_tramite = t.id_tramite
       JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       WHERE de.id_tramite = ?
       LIMIT 1
       FOR UPDATE`,
      [id_tramite]
    );

    const documento = documentos[0];
    if (!documento?.ruta_pdf_firmado) {
      await connection.rollback();
      return NextResponse.json({ error: "Primero debes generar el PDF consolidado y revisar la vista previa." }, { status: 400 });
    }

    const pdfPath = publicFilePath(documento.ruta_pdf_firmado);
    if (!existsSync(pdfPath)) {
      await connection.rollback();
      return NextResponse.json({ error: "El PDF consolidado no se generó correctamente." }, { status: 400 });
    }

    const [firmaRows] = await connection.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM univalle_tramites.firmas_documento WHERE id_documento_emitido = ? AND estado = 'FIRMADO'",
      [documento.id_documento_emitido]
    );
    if ((firmaRows[0]?.total || 0) < 2) {
      await connection.rollback();
      return NextResponse.json({ error: "No se puede enviar: faltan firmas digitales aplicadas." }, { status: 400 });
    }

    const [estadoRows] = await connection.query<EstadoRow[]>(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'FINALIZADO' LIMIT 1"
    );
    const estadoNuevo = estadoRows[0]?.id_estado_tramite;
    if (!estadoNuevo) {
      await connection.rollback();
      return NextResponse.json({ error: "No se encontró el estado FINALIZADO." }, { status: 500 });
    }

    await connection.query(
      "UPDATE univalle_tramites.documentos_emitidos SET estado_documento = 'EMITIDO', fecha_emision = NOW() WHERE id_documento_emitido = ?",
      [documento.id_documento_emitido]
    );
    await connection.query(
      "UPDATE univalle_tramites.tramites SET id_estado_actual = ?, fecha_cierre = NOW(), paso_actual = GREATEST(paso_actual, 5) WHERE id_tramite = ?",
      [estadoNuevo, id_tramite]
    );
    await connection.query(
      `INSERT INTO univalle_tramites.historial_estados_tramite
       (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio, observacion)
       VALUES (?, ?, ?, 4, ?, ?)`,
      [
        id_tramite,
        documento.id_estado_actual,
        estadoNuevo,
        `Documento emitido: ${documento.numero_documento}`,
        `Código de verificación: ${documento.codigo_verificacion}. Enviado al estudiante: ${new Date().toISOString()}`,
      ]
    );
    await connection.query(
      `INSERT INTO univalle_tramites.notificaciones (id_usuario, titulo, mensaje, tipo)
       VALUES (?, 'Documento emitido', 'Su documento final consolidado ya está disponible en historial.', 'EXITO')`,
      [documento.id_usuario]
    );
    await connection.query(
      `INSERT INTO univalle_tramites.documentos_emision_logs (id_tramite, accion, detalle)
       VALUES (?, 'PDF_CONSOLIDADO_ENVIADO', ?)`,
      [id_tramite, `Documento enviado correctamente al estudiante: ${documento.ruta_pdf_firmado}`]
    );

    await connection.commit();
    return NextResponse.json({
      success: true,
      codigo: documento.codigo_verificacion,
      ruta_pdf_final: documento.ruta_pdf_firmado.startsWith("/") ? documento.ruta_pdf_firmado : `/uploads/${documento.ruta_pdf_firmado}`,
      mensaje: "Documento enviado correctamente al estudiante.",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error enviando documento al estudiante:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
