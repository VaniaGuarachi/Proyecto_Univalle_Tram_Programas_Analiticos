import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario no proporcionado" }, { status: 400 });
    }

    // 1. Datos del estudiante
    const studentQuery = `
      SELECT u.nombres, u.apellidos, c.nombre as carrera, e.semestre, e.estado_academico, e.id_estudiante
      FROM univalle_tramites.usuarios u
      JOIN univalle_tramites.estudiantes e ON u.id_usuario = e.id_usuario
      JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
      WHERE u.id_usuario = ?
    `;
    const [studentRows]: any = await pool.query(studentQuery, [userId]);
    
    if (!studentRows || studentRows.length === 0) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }
    const student = studentRows[0];

    // 2. Trámites recientes (5 últimos)
    const proceduresQuery = `
      SELECT t.id_tramite, t.codigo_seguimiento, tt.nombre as tramite, et.nombre as estado, t.fecha_solicitud
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      WHERE t.id_estudiante = ?
      ORDER BY t.fecha_solicitud DESC
      LIMIT 5
    `;
    const paymentsQuery = `
      SELECT COUNT(*) as pendientes
      FROM univalle_tramites.pagos p
      JOIN univalle_tramites.tramites t ON p.id_tramite = t.id_tramite
      WHERE t.id_estudiante = ? AND p.estado_pago = 'PENDIENTE'
    `;
    const [[procedures], [paymentRows]]: any = await Promise.all([
      pool.query(proceduresQuery, [student.id_estudiante]),
      pool.query(paymentsQuery, [student.id_estudiante]),
    ]);
    const pendingPayments = paymentRows[0].pendientes;

    return NextResponse.json({
      student: {
        nombres: student.nombres,
        apellidos: student.apellidos,
        carrera: student.carrera,
        semestre: student.semestre,
        estado_academico: student.estado_academico
      },
      recentProcedures: procedures,
      pendingPaymentsCount: pendingPayments
    });

  } catch (error) {
    console.error("Error en dashboard API:", error);
    return NextResponse.json(
      { error: "Error al obtener datos del dashboard." },
      { status: 500 }
    );
  }
}
