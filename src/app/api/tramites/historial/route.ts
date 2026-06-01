import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // Todos los trámites completados/finalizados con info del estudiante
    const [rows]: any = await pool.query(`
      SELECT
        t.id_tramite,
        t.codigo_seguimiento,
        t.fecha_solicitud,
        u.nombres,
        u.apellidos,
        e.codigo_estudiante,
        c.nombre AS carrera,
        tt.nombre AS tipo_tramite,
        et.nombre AS estado,
        et.codigo AS estado_codigo
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.tipos_tramite tt     ON t.id_tipo_tramite    = tt.id_tipo_tramite
      JOIN univalle_tramites.estados_tramite et   ON t.id_estado_actual   = et.id_estado_tramite
      JOIN univalle_tramites.estudiantes e        ON t.id_estudiante      = e.id_estudiante
      JOIN univalle_tramites.usuarios u           ON e.id_usuario         = u.id_usuario
      LEFT JOIN univalle_tramites.carreras c      ON e.id_carrera         = c.id_carrera
      WHERE et.codigo IN ('FINALIZADO','COMPLETADO','EMITIDO')
        AND t.estado_registro = 'ACTIVO'
      ORDER BY t.fecha_solicitud DESC
    `);

    return NextResponse.json({ historial: rows || [] });

  } catch (error: any) {
    console.error('Error en historial trámites API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
