import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface TramiteRow extends RowDataPacket {
  id_tramite: number;
  id_estado_actual: number;
  id_estudiante: number;
  id_usuario: number;
  estado_solvencia: string | null;
  rol: string;
}

interface EstadoRow extends RowDataPacket {
  id_estado_tramite: number;
}

export async function POST(request: Request) {
  let connection;
  try {
    const { id_tramite, userId } = await request.json();
    if (!id_tramite || !userId) {
      return NextResponse.json({ error: "id_tramite y userId son requeridos" }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query<TramiteRow[]>(
      `SELECT t.id_tramite, t.id_estado_actual, e.id_estudiante, u.id_usuario, s.estado_solvencia, r.nombre AS rol
       FROM univalle_tramites.tramites t
       JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       JOIN univalle_tramites.usuario_roles ur ON ur.id_usuario = u.id_usuario AND ur.estado = 'ACTIVO'
       JOIN univalle_tramites.roles r ON r.id_rol = ur.id_rol
       LEFT JOIN univalle_tramites.solvencias s ON s.id_tramite = t.id_tramite
       WHERE t.id_tramite = ? AND u.id_usuario = ?
       LIMIT 1`,
      [id_tramite, userId]
    );

    const tramite = rows[0];
    if (!tramite) {
      await connection.rollback();
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }
    if (tramite.rol !== "ESTUDIANTE") {
      await connection.rollback();
      return NextResponse.json({ error: "Usuario no autorizado" }, { status: 403 });
    }
    if (tramite.estado_solvencia !== "CON_DEUDAS") {
      await connection.rollback();
      return NextResponse.json({ error: "Solo puedes reenviar trámites observados por biblioteca." }, { status: 400 });
    }

    await connection.query(
      `INSERT INTO univalle_tramites.estados_tramite
       (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
       VALUES ('PENDIENTE_SOLVENCIA', 'Pendiente solvencia', 'Esperando verificación de biblioteca', 4, FALSE, TRUE, 'ACTIVO')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo), es_bloqueante = VALUES(es_bloqueante)`
    );

    const [estadoRows] = await connection.query<EstadoRow[]>(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'PENDIENTE_SOLVENCIA' LIMIT 1"
    );
    const idEstadoNuevo = estadoRows[0].id_estado_tramite;

    await connection.query(
      `UPDATE univalle_tramites.solvencias
       SET estado_solvencia = 'PENDIENTE_VERIFICACION',
           observacion = 'Solicitud reenviada a biblioteca. Esperando nueva verificación.',
           fecha_resolucion = NULL
       WHERE id_tramite = ?`,
      [id_tramite]
    );

    await connection.query(
      "UPDATE univalle_tramites.tramites SET id_estado_actual = ?, paso_actual = 4 WHERE id_tramite = ?",
      [idEstadoNuevo, id_tramite]
    );

    await connection.query(
      `INSERT INTO univalle_tramites.historial_estados_tramite
       (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio, observacion)
       VALUES (?, ?, ?, ?, 'Solicitud reenviada a Biblioteca', 'Solicitud reenviada a biblioteca. Esperando nueva verificación.')`,
      [id_tramite, tramite.id_estado_actual, idEstadoNuevo, userId]
    );

    await connection.query(
      `INSERT INTO univalle_tramites.notificaciones (id_usuario, titulo, mensaje, tipo)
       SELECT u.id_usuario, 'Solicitud reenviada a biblioteca', 'Un estudiante solicitó nueva verificación de pendientes.', 'ALERTA'
       FROM univalle_tramites.usuarios u
       JOIN univalle_tramites.usuario_roles ur ON ur.id_usuario = u.id_usuario
       JOIN univalle_tramites.roles r ON r.id_rol = ur.id_rol
       WHERE r.nombre = 'BIBLIOTECARIO' AND u.estado = 'ACTIVO'`
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error reenviando a biblioteca:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
