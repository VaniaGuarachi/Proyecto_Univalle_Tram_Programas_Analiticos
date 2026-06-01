import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    // Historial de verificaciones realizadas por este bibliotecario con deudas incluidas
    const [historial]: any = await pool.query(`
      SELECT 
        vs.id_verificacion_solvencia,
        vs.fecha_verificacion,
        vs.resultado,
        vs.comentario,
        s.id_solvencia,
        t.codigo_seguimiento,
        tt.nombre AS nombre_tramite,
        tt.costo_base AS monto_tramite,
        u_est.nombres AS nombres_estudiante,
        u_est.apellidos AS apellidos_estudiante,
        e.codigo_estudiante,
        (
          SELECT td.nombre_archivo
          FROM univalle_tramites.tramite_documentos td
          WHERE td.id_tramite = t.id_tramite
          LIMIT 1
        ) AS factura_nombre
      FROM univalle_tramites.verificaciones_solvencia vs
      JOIN univalle_tramites.solvencias s ON vs.id_solvencia = s.id_solvencia
      JOIN univalle_tramites.tramites t ON s.id_tramite = t.id_tramite
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      JOIN univalle_tramites.estudiantes e ON s.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.usuarios u_est ON e.id_usuario = u_est.id_usuario
      WHERE vs.id_usuario_bibliotecario = ?
      ORDER BY vs.fecha_verificacion DESC
    `, [userId]);

    // Para cada registro, obtener sus deudas si tiene
    const historialConDeudas = await Promise.all(
      (historial || []).map(async (reg: any) => {
        if (reg.resultado === 'CON_DEUDAS') {
          const [deudas]: any = await pool.query(`
            SELECT tipo_deuda, descripcion, monto, estado_deuda
            FROM univalle_tramites.deudas_biblioteca
            WHERE id_solvencia = ?
            ORDER BY monto DESC
          `, [reg.id_solvencia]);
          return { ...reg, deudas: deudas || [] };
        }
        return { ...reg, deudas: [] };
      })
    );

    return NextResponse.json({ historial: historialConDeudas });

  } catch (error: any) {
    console.error("Error en historial bibliotecario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
