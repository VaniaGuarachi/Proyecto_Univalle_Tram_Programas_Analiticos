import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    const query = `
      SELECT 
        s.id_solvencia,
        s.estado_solvencia,
        s.observacion
      FROM univalle_tramites.solvencias s
      JOIN univalle_tramites.estudiantes e ON s.id_estudiante = e.id_estudiante
      WHERE e.id_usuario = ?
      ORDER BY s.fecha_solicitud DESC
      LIMIT 1
    `;

    const [rows]: any = await pool.query(query, [userId]);

    if (rows.length === 0) {
      // Si no hay registro, asumimos que no tiene deudas para el demo pero informamos
      return NextResponse.json({ 
        estado_solvencia: 'SOLVENTE', 
        mensaje: 'No se encontraron registros de deuda.' 
      });
    }

    return NextResponse.json(rows[0]);

  } catch (error: any) {
    console.error("Error en solvencia student API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
