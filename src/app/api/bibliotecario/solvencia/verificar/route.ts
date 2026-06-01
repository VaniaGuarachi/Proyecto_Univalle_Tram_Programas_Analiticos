import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

interface SolvenciaRow extends RowDataPacket {
  id_tramite: number;
  id_usuario: number;
}

interface EstadoRow extends RowDataPacket {
  id_estado_tramite: number;
}

interface TramiteRow extends RowDataPacket {
  id_estado_actual: number;
}

interface RoleRow extends RowDataPacket {
  total: number;
}

export async function POST(request: Request) {
  try {
    const { id_solvencia, id_usuario_bibliotecario, resultado, comentario, deudas } = await request.json();

    if (!id_solvencia || !id_usuario_bibliotecario || !resultado) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [roleRows] = await connection.query<RoleRow[]>(
        `SELECT COUNT(*) AS total
         FROM univalle_tramites.usuario_roles ur
         JOIN univalle_tramites.roles r ON r.id_rol = ur.id_rol
         WHERE ur.id_usuario = ? AND r.nombre = 'BIBLIOTECARIO' AND ur.estado = 'ACTIVO'`,
        [id_usuario_bibliotecario]
      );
      if (!roleRows[0]?.total) {
        await connection.rollback();
        return NextResponse.json({ error: "Usuario no autorizado para verificación de biblioteca" }, { status: 403 });
      }

      await connection.query(
        `INSERT INTO univalle_tramites.estados_tramite
         (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
         VALUES ('FACTURA', 'Factura', 'Factura disponible', 5, FALSE, FALSE, 'ACTIVO')
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo)`
      );

      // 1. Insertar en verificaciones_solvencia
      await connection.query(`
        INSERT INTO univalle_tramites.verificaciones_solvencia 
        (id_solvencia, id_usuario_bibliotecario, resultado, comentario) 
        VALUES (?, ?, ?, ?)`,
        [id_solvencia, id_usuario_bibliotecario, resultado, comentario]
      );

      // 2. Insertar deudas si existen
      await connection.query(
        `UPDATE univalle_tramites.deudas_biblioteca
         SET estado_deuda = ?
         WHERE id_solvencia = ? AND estado_deuda = 'PENDIENTE'`,
        [resultado === 'SIN_DEUDAS' ? 'PAGADA' : 'ANULADA', id_solvencia]
      );

      if (resultado === 'CON_DEUDAS' && deudas && deudas.length > 0) {
        for (const deuda of deudas) {
          await connection.query(`
            INSERT INTO univalle_tramites.deudas_biblioteca 
            (id_solvencia, tipo_deuda, descripcion, monto, estado_deuda) 
            VALUES (?, ?, ?, ?, 'PENDIENTE')`,
            [id_solvencia, 'Pendiente de biblioteca', deuda.descripcion || comentario || 'Pendiente registrado por biblioteca', Number(deuda.monto) || 0]
          );
        }
      }

      // 3. Actualizar estado en solvencias
      await connection.query(`
        UPDATE univalle_tramites.solvencias 
        SET estado_solvencia = ?, observacion = ?, fecha_resolucion = NOW()
        WHERE id_solvencia = ?`,
        [
          resultado,
          resultado === 'SIN_DEUDAS'
            ? (comentario || 'Verificación aprobada por biblioteca')
            : (comentario || 'Tienes deudas pendientes en biblioteca. Debes solucionar los pendientes registrados antes de continuar con tu trámite.'),
          id_solvencia,
        ]
      );

      const [solvenciaRows] = await connection.query<SolvenciaRow[]>(
        `SELECT s.id_tramite, u.id_usuario
         FROM univalle_tramites.solvencias s
         JOIN univalle_tramites.estudiantes e ON s.id_estudiante = e.id_estudiante
         JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
         WHERE s.id_solvencia = ?`,
        [id_solvencia]
      );
      const idTramite = solvenciaRows[0]?.id_tramite;
      const idUsuarioEstudiante = solvenciaRows[0]?.id_usuario;

      if (idTramite) {
        const estadoCodigo = resultado === 'SIN_DEUDAS' ? 'FACTURA' : 'CON_DEUDAS';
        const [estadoRows] = await connection.query<EstadoRow[]>(
          `SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = ?`,
          [estadoCodigo]
        );

        const idEstadoNuevo = estadoRows[0]?.id_estado_tramite;
        if (idEstadoNuevo) {
          const [tramiteRows] = await connection.query<TramiteRow[]>(
            `SELECT id_estado_actual FROM univalle_tramites.tramites WHERE id_tramite = ?`,
            [idTramite]
          );
          const idEstadoAnterior = tramiteRows[0]?.id_estado_actual || idEstadoNuevo;

          await connection.query(
            `UPDATE univalle_tramites.tramites
             SET id_estado_actual = ?, paso_actual = ?
             WHERE id_tramite = ?`,
            [idEstadoNuevo, resultado === 'SIN_DEUDAS' ? 5 : 4, idTramite]
          );

          await connection.query(
            `INSERT INTO univalle_tramites.historial_estados_tramite
             (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio)
             VALUES (?, ?, ?, ?, ?)`,
            [
              idTramite,
              idEstadoAnterior,
              idEstadoNuevo,
              id_usuario_bibliotecario,
              resultado === 'SIN_DEUDAS'
                ? 'Biblioteca aprobó la solvencia. El estudiante puede continuar.'
                : `Biblioteca registró deudas pendientes.${comentario ? ` ${comentario}` : ''}`,
            ]
          );

          if (idUsuarioEstudiante) {
            await connection.query(
              `INSERT INTO univalle_tramites.notificaciones (id_usuario, titulo, mensaje, tipo)
               VALUES (?, ?, ?, ?)`,
              [
                idUsuarioEstudiante,
                resultado === 'SIN_DEUDAS' ? 'Biblioteca aprobó tu trámite' : 'Tienes deudas pendientes en biblioteca',
                resultado === 'SIN_DEUDAS'
                  ? 'Tu verificación de biblioteca fue aprobada. Ya puedes continuar con la factura.'
                  : 'No puedes continuar hasta resolver tus deudas pendientes en biblioteca.',
                resultado === 'SIN_DEUDAS' ? 'EXITO' : 'ALERTA',
              ]
            );
          }
        }
      }

      await connection.commit();
      return NextResponse.json({ message: "Verificación guardada exitosamente" });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error: unknown) {
    console.error("Error en verificación bibliotecario:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}
