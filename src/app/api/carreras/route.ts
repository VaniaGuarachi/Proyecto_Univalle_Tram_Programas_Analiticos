import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      "SELECT id_carrera, nombre FROM univalle_tramites.carreras WHERE estado = 'ACTIVO' ORDER BY nombre ASC"
    );
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error: any) {
    console.error("Error fetching carreras:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
