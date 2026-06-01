import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface TramiteBusquedaRow extends RowDataPacket {
  id_tramite: number;
  codigo_seguimiento: string;
  fecha_solicitud: Date;
  fecha_cierre: Date | null;
  paso_actual: number | null;
  tramite: string;
  descripcion: string | null;
  estado: string;
  estado_codigo: string;
  estado_descripcion: string | null;
  estudiante: string;
  codigo_estudiante: string | null;
  carrera: string | null;
  estado_pago: string | null;
  estado_solvencia: string | null;
  numero_documento: string | null;
  codigo_verificacion: string | null;
  ruta_pdf_firmado: string | null;
}

function uploadPath(path: string | null) {
  if (!path) return null;
  return path.startsWith("/") ? path : `/uploads/${path}`;
}

export async function GET(request: Request) {
  try {
    const codigo = new URL(request.url).searchParams.get("codigo")?.trim();

    if (!codigo) {
      return NextResponse.json(
        { error: "Ingresa un número de trámite para buscar." },
        { status: 400 }
      );
    }

    const normalizedCodigo = codigo.toUpperCase();

    const [rows] = await pool.query<TramiteBusquedaRow[]>(
      `
        SELECT
          t.id_tramite,
          t.codigo_seguimiento,
          t.fecha_solicitud,
          t.fecha_cierre,
          t.paso_actual,
          tt.nombre AS tramite,
          tt.descripcion,
          et.nombre AS estado,
          et.codigo AS estado_codigo,
          et.descripcion AS estado_descripcion,
          CONCAT(u.nombres, ' ', u.apellidos) AS estudiante,
          e.codigo_estudiante,
          c.nombre AS carrera,
          p.estado_pago,
          s.estado_solvencia,
          de.numero_documento,
          de.codigo_verificacion,
          de.ruta_pdf_firmado
        FROM univalle_tramites.tramites t
        JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
        JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
        JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
        JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
        LEFT JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
        LEFT JOIN univalle_tramites.pagos p ON p.id_tramite = t.id_tramite
        LEFT JOIN univalle_tramites.solvencias s ON s.id_tramite = t.id_tramite
        LEFT JOIN univalle_tramites.documentos_emitidos de
          ON de.id_tramite = t.id_tramite
          AND de.estado_documento IN ('EMITIDO', 'FIRMADO')
        WHERE UPPER(t.codigo_seguimiento) = ?
           OR UPPER(de.numero_documento) = ?
           OR UPPER(de.codigo_verificacion) = ?
        ORDER BY de.fecha_emision DESC, t.fecha_solicitud DESC
        LIMIT 1
      `,
      [normalizedCodigo, normalizedCodigo, normalizedCodigo]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { found: false, message: "No se encontró ningún trámite con ese código." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      tramite: {
        ...rows[0],
        ruta_pdf_firmado: uploadPath(rows[0].ruta_pdf_firmado),
      },
    });
  } catch (error) {
    console.error("Error al buscar trámite público:", error);
    return NextResponse.json(
      { error: "No se pudo consultar la base de datos. Intenta nuevamente en unos minutos." },
      { status: 500 }
    );
  }
}
