import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search  = searchParams.get('search')  || '';
    const carrera = searchParams.get('carrera') || '';

    // 1. Stats globales
    const [statsRows]: any = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT t2.id_estudiante)
         FROM univalle_tramites.tramites t2
         JOIN univalle_tramites.estados_tramite et2 ON t2.id_estado_actual = et2.id_estado_tramite
         WHERE t2.estado_registro = 'ACTIVO'
           AND et2.codigo IN ('ENVIADO_TRAMITES','EN_PROCESO','EMITIDO','FINALIZADO','TRAMITE_COMPLETADO','DOCUMENTO_GENERADO')) AS totalEstudiantes,
        SUM(CASE WHEN et.codigo NOT IN ('FINALIZADO','COMPLETADO','EMITIDO') THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN et.codigo  IN ('FINALIZADO','COMPLETADO','EMITIDO')    THEN 1 ELSE 0 END) AS completados,
        SUM(CASE WHEN DATE(t.fecha_solicitud) = CURDATE()                    THEN 1 ELSE 0 END) AS actividadHoy
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      WHERE t.estado_registro = 'ACTIVO'
        AND et.codigo IN ('ENVIADO_TRAMITES','EN_PROCESO','EMITIDO','FINALIZADO','TRAMITE_COMPLETADO','DOCUMENTO_GENERADO')
    `);

    // 2. Lista de carreras para el filtro
    const [carreras]: any = await pool.query(`
      SELECT DISTINCT c.id_carrera, c.nombre
      FROM univalle_tramites.carreras c
      JOIN univalle_tramites.estudiantes e ON e.id_carrera = c.id_carrera
      JOIN univalle_tramites.tramites t   ON t.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      WHERE t.estado_registro = 'ACTIVO'
        AND et.codigo IN ('ENVIADO_TRAMITES','EN_PROCESO','EMITIDO','FINALIZADO','TRAMITE_COMPLETADO','DOCUMENTO_GENERADO')
      ORDER BY c.nombre
    `);

    // 3. Lista de estudiantes con resumen de sus trámites
    let estudiantesQuery = `
      SELECT
        e.id_estudiante,
        e.codigo_estudiante,
        u.nombres,
        u.apellidos,
        c.nombre AS carrera,
        COUNT(t.id_tramite)                                                                          AS total,
        SUM(CASE WHEN et.codigo NOT IN ('FINALIZADO','COMPLETADO','EMITIDO') THEN 1 ELSE 0 END)      AS pendientes,
        SUM(CASE WHEN et.codigo  IN ('FINALIZADO','COMPLETADO','EMITIDO')    THEN 1 ELSE 0 END)      AS completados,
        MAX(t.fecha_solicitud)                                                                        AS ultima_actividad
      FROM univalle_tramites.estudiantes e
      JOIN univalle_tramites.usuarios u       ON e.id_usuario    = u.id_usuario
      LEFT JOIN univalle_tramites.carreras c  ON e.id_carrera    = c.id_carrera
      JOIN univalle_tramites.tramites t       ON t.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      WHERE t.estado_registro = 'ACTIVO'
        AND et.codigo IN ('ENVIADO_TRAMITES','EN_PROCESO','EMITIDO','FINALIZADO','TRAMITE_COMPLETADO','DOCUMENTO_GENERADO')
    `;

    const params: any[] = [];

    if (search) {
      estudiantesQuery += ` AND (u.nombres LIKE ? OR u.apellidos LIKE ? OR e.codigo_estudiante LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (carrera) {
      estudiantesQuery += ` AND c.id_carrera = ?`;
      params.push(Number(carrera));
    }

    estudiantesQuery += ` GROUP BY e.id_estudiante ORDER BY ultima_actividad DESC`;

    const [estudiantes]: any = await pool.query(estudiantesQuery, params);

    const stats = statsRows[0] || { totalEstudiantes: 0, pendientes: 0, completados: 0, actividadHoy: 0 };

    return NextResponse.json({
      stats: {
        totalEstudiantes: Number(stats.totalEstudiantes) || 0,
        pendientes:        Number(stats.pendientes)       || 0,
        completados:       Number(stats.completados)      || 0,
        actividadHoy:      Number(stats.actividadHoy)     || 0,
      },
      carreras: carreras || [],
      estudiantes: estudiantes || [],
    });

  } catch (error: any) {
    console.error('Error en dashboard trámites API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
