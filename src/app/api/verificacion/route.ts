import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface DocumentoRow extends RowDataPacket {
  id_documento_emitido: number;
  numero_documento: string;
  codigo_verificacion: string;
  fecha_emision: string;
  estado_documento: string;
  ruta_pdf_firmado: string | null;
  tramite_nombre: string;
  estudiante_nombre: string;
  estudiante_matricula: string;
  carrera: string;
  observaciones: string | null;
}

interface FirmaRow extends RowDataPacket {
  nombre_firmante: string;
  cargo_firmante: string;
}

function uploadPath(path: string | null) {
  if (!path) return null;
  return path.startsWith("/") ? path : `/uploads/${path}`;
}

export async function GET(request: Request) {
  try {
    const codigo = new URL(request.url).searchParams.get("codigo");
    if (!codigo) {
      return NextResponse.json({ error: "Código no proporcionado" }, { status: 400 });
    }

    const [rows] = await pool.query<DocumentoRow[]>(
      `SELECT
        de.id_documento_emitido,
        de.numero_documento,
        de.codigo_verificacion,
        de.fecha_emision,
        de.estado_documento,
        de.ruta_pdf_firmado,
        tt.nombre AS tramite_nombre,
        CONCAT(u.nombres, ' ', u.apellidos) AS estudiante_nombre,
        u.codigo_login AS estudiante_matricula,
        c.nombre AS carrera,
        t.observaciones_generales AS observaciones
       FROM univalle_tramites.documentos_emitidos de
       JOIN univalle_tramites.tramites t ON de.id_tramite = t.id_tramite
       JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
       JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
       WHERE de.codigo_verificacion = ? AND de.estado_documento IN ('EMITIDO', 'FIRMADO')
       LIMIT 1`,
      [codigo]
    );

    const doc = rows[0];
    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado o no válido." }, { status: 404 });
    }

    const [firmas] = await pool.query<FirmaRow[]>(
      `SELECT nombre_firmante, cargo_firmante
       FROM univalle_tramites.firmas_documento
       WHERE id_documento_emitido = ?
       ORDER BY id_firma_documento`,
      [doc.id_documento_emitido]
    );

    return NextResponse.json({
      ...doc,
      ruta_pdf_firmado: uploadPath(doc.ruta_pdf_firmado),
      firma_responsable: firmas[0] ? `${firmas[0].nombre_firmante} - ${firmas[0].cargo_firmante}` : null,
      firma_autoridad: firmas[1] ? `${firmas[1].nombre_firmante} - ${firmas[1].cargo_firmante}` : null,
      firmas,
    });
  } catch (error) {
    console.error("Error en verificacion API:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
