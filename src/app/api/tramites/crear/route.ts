import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  let connection;
  try {
    const body = await request.json();
    const { userId, tipoTramiteId } = body;

    if (!userId || !tipoTramiteId) {
      return NextResponse.json({ error: "Faltan datos (userId o tipoTramiteId)" }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obtener id_estudiante
    const [studentRows]: any = await connection.query(
      'SELECT id_estudiante FROM univalle_tramites.estudiantes WHERE id_usuario = ?',
      [userId]
    );

    if (!studentRows || studentRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }
    const id_estudiante = studentRows[0].id_estudiante;

    // 2. Obtener id_estado_tramite para 'SOLICITUD_CREADA'
    const [statusRows]: any = await connection.query(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'SOLICITUD_CREADA'"
    );

    if (!statusRows || statusRows.length === 0) {
      // Si no existe, usamos el primero por orden como fallback seguro pero informamos en logs
      console.warn("Estado 'SOLICITUD_CREADA' no encontrado, usando respaldo.");
      const [fallbackRows]: any = await connection.query(
        "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite ORDER BY orden_flujo ASC LIMIT 1"
      );
      if (!fallbackRows || fallbackRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Configuración de estados no encontrada" }, { status: 500 });
      }
      statusRows.push(fallbackRows[0]);
    }
    const id_estado_actual = statusRows[0].id_estado_tramite;

    // 3. Generar código de seguimiento
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8);
    const random = Math.floor(1000 + Math.random() * 9000);
    const codigo_seguimiento = `TRAM-${timestamp}-${random}`;

    // 4. Insertar trámite
    const [tramiteResult]: any = await connection.query(
      `INSERT INTO univalle_tramites.tramites 
       (codigo_seguimiento, id_estudiante, id_tipo_tramite, id_estado_actual, paso_actual) 
       VALUES (?, ?, ?, ?, 1)`,
      [codigo_seguimiento, id_estudiante, tipoTramiteId, id_estado_actual]
    );
    const id_tramite = tramiteResult.insertId;

    // 5. Insertar en historial
    await connection.query(
      `INSERT INTO univalle_tramites.historial_estados_tramite 
       (id_tramite, id_estado_nuevo, id_usuario_accion, motivo_cambio) 
       VALUES (?, ?, ?, ?)`,
      [id_tramite, id_estado_actual, userId, 'Creación inicial del trámite']
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      id_tramite,
      codigo_seguimiento
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error al crear trámite:", error);
    return NextResponse.json(
      { error: "Error interno al crear el trámite." },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
