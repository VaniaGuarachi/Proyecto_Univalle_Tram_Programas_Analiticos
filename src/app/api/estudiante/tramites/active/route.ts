import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "UID faltante" }, { status: 400 });
    }

    const query = `
      SELECT t.id_tramite, t.codigo_seguimiento, t.paso_actual, t.id_tipo_tramite
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      WHERE e.id_usuario = ? 
        AND et.nombre NOT IN ('FINALIZADO', 'RECHAZADO')
        AND t.paso_actual < 5
      ORDER BY t.fecha_solicitud DESC
      LIMIT 1
    `;

    const [rows]: any = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      tramite: rows[0]
    });

  } catch (error) {
    console.error("Error fetching active progress:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
