import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario no proporcionado" }, { status: 400 });
    }

    const [rows]: any = await pool.query(`
      SELECT
        u.nombres,
        u.apellidos,
        u.ci,
        u.complemento_ci,
        u.correo_institucional,
        e.codigo_estudiante,
        e.tipo_estudiante,
        e.anio_titulacion,
        e.id_carrera,
        c.nombre AS carrera
      FROM univalle_tramites.usuarios u
      JOIN univalle_tramites.estudiantes e ON e.id_usuario = u.id_usuario
      LEFT JOIN univalle_tramites.carreras c ON c.id_carrera = e.id_carrera
      WHERE u.id_usuario = ?
      LIMIT 1
    `, [userId]);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ perfil: rows[0] });
  } catch (error: any) {
    console.error("Error en perfil estudiante:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
