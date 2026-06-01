import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const BASE_SELECT = `
  SELECT 
    s.id_solvencia,
    s.id_tramite,
    s.estado_solvencia,
    s.fecha_resolucion,
    s.fecha_solicitud,
    t.codigo_seguimiento,
    tt.nombre     AS nombre_tramite,
    tt.costo_base AS monto_tramite,
    u.nombres,
    u.apellidos,
    u.correo_institucional AS email,
    u.telefono,
    e.codigo_estudiante,
    e.semestre,
    c.nombre AS carrera,
    (
      SELECT td.nombre_archivo
      FROM univalle_tramites.tramite_documentos td
      WHERE td.id_tramite = t.id_tramite
      LIMIT 1
    ) AS factura_nombre
  FROM univalle_tramites.solvencias s
  JOIN univalle_tramites.tramites t          ON s.id_tramite       = t.id_tramite
  JOIN univalle_tramites.estudiantes e       ON s.id_estudiante    = e.id_estudiante
  JOIN univalle_tramites.usuarios u          ON e.id_usuario       = u.id_usuario
  JOIN univalle_tramites.tipos_tramite tt    ON t.id_tipo_tramite  = tt.id_tipo_tramite
  LEFT JOIN univalle_tramites.carreras c     ON e.id_carrera       = c.id_carrera
`;

export async function GET() {
  try {
    const [[stats], [pendientes], [verificados]]: any = await Promise.all([
      pool.query(`
        SELECT 
          SUM(CASE WHEN estado_solvencia = 'PENDIENTE_VERIFICACION' THEN 1 ELSE 0 END) AS pendientes,
          SUM(CASE WHEN estado_solvencia = 'SIN_DEUDAS'             THEN 1 ELSE 0 END) AS sinDeudas,
          SUM(CASE WHEN estado_solvencia = 'CON_DEUDAS'             THEN 1 ELSE 0 END) AS conDeudas
        FROM univalle_tramites.solvencias
      `),
      pool.query(BASE_SELECT + `WHERE s.estado_solvencia = 'PENDIENTE_VERIFICACION' ORDER BY s.fecha_solicitud DESC`),
      pool.query(BASE_SELECT + `WHERE s.estado_solvencia IN ('SIN_DEUDAS', 'CON_DEUDAS') ORDER BY s.fecha_resolucion DESC LIMIT 20`),
    ]);

    return NextResponse.json({
      stats: stats[0] || { pendientes: 0, sinDeudas: 0, conDeudas: 0 },
      pendientes: pendientes || [],
      verificados: verificados || [],
    });
  } catch (error: any) {
    console.error("Error en dashboard bibliotecario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
