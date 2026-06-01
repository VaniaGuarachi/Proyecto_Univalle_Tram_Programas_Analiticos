import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface EstadoRow extends RowDataPacket {
  id_estado_tramite: number;
}

interface TramiteRow extends RowDataPacket {
  id_tramite: number;
  codigo_seguimiento: string;
  id_estado_actual: number;
  estado_codigo: string;
  estado_nombre: string;
  id_usuario: number;
  estado_pago: string | null;
  numero_factura: string | null;
  estado_factura: string | null;
  estado_solvencia: string | null;
  rol: string;
}

async function ensureWorkflowStates() {
  const estados = [
    ["INICIO", "Inicio", "Solicitud iniciada", 1, 0, 0],
    ["PAGO", "Pago", "Pago registrado", 2, 0, 1],
    ["VERIFICACION", "Verificación", "Pago verificado", 3, 0, 1],
    ["FACTURA", "Factura", "Factura disponible", 4, 0, 0],
    ["ENVIADO_TRAMITES", "Enviado a Trámites", "El estudiante envió el trámite al área correspondiente", 5, 0, 0],
    ["EN_PROCESO", "Trámite en proceso", "El documento está siendo procesado por Trámites", 6, 0, 0],
    ["EMITIDO", "Emitido", "Documento emitido", 7, 0, 0],
    ["FINALIZADO", "Finalizado", "Trámite finalizado", 8, 1, 0],
  ];

  for (const estado of estados) {
    await pool.query(
      `INSERT INTO univalle_tramites.estados_tramite
       (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         descripcion = VALUES(descripcion),
         orden_flujo = VALUES(orden_flujo),
         es_final = VALUES(es_final),
         es_bloqueante = VALUES(es_bloqueante),
         estado = 'ACTIVO'`,
      estado
    );
  }
}

export async function POST(request: Request) {
  let connection;
  try {
    await ensureWorkflowStates();
    const { id_tramite, userId } = await request.json();
    if (!id_tramite || !userId) {
      return NextResponse.json({ error: "id_tramite y userId son requeridos" }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [tramites] = await connection.query<TramiteRow[]>(
      `SELECT
        t.id_tramite,
        t.codigo_seguimiento,
        t.id_estado_actual,
        et.codigo AS estado_codigo,
        et.nombre AS estado_nombre,
        u.id_usuario,
        p.estado_pago,
        f.numero_factura,
        f.estado AS estado_factura,
        s.estado_solvencia,
        r.nombre AS rol
       FROM univalle_tramites.tramites t
       JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       JOIN univalle_tramites.usuario_roles ur ON ur.id_usuario = u.id_usuario AND ur.estado = 'ACTIVO'
       JOIN univalle_tramites.roles r ON r.id_rol = ur.id_rol
       JOIN univalle_tramites.estados_tramite et ON et.id_estado_tramite = t.id_estado_actual
       LEFT JOIN univalle_tramites.pagos p ON p.id_tramite = t.id_tramite
       LEFT JOIN univalle_tramites.facturas f ON f.id_pago = p.id_pago
       LEFT JOIN univalle_tramites.solvencias s ON s.id_tramite = t.id_tramite
       WHERE t.id_tramite = ? AND u.id_usuario = ?
       LIMIT 1
       FOR UPDATE`,
      [id_tramite, userId]
    );

    const tramite = tramites[0];
    if (!tramite) {
      await connection.rollback();
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }
    if (tramite.rol !== "ESTUDIANTE") {
      await connection.rollback();
      return NextResponse.json({ error: "Usuario no autorizado" }, { status: 403 });
    }
    if (["ENVIADO_TRAMITES", "EN_PROCESO", "EMITIDO", "FINALIZADO", "TRAMITE_COMPLETADO"].includes(tramite.estado_codigo)) {
      await connection.rollback();
      return NextResponse.json({
        success: true,
        duplicado: true,
        codigo_tramite: tramite.codigo_seguimiento,
        estado_codigo: tramite.estado_codigo,
        estado_nombre: tramite.estado_nombre,
        fecha_envio: new Date().toISOString(),
      });
    }
    if (tramite.estado_pago !== "PAGADO" || !tramite.numero_factura || tramite.estado_factura !== "EMITIDA") {
      await connection.rollback();
      return NextResponse.json({ error: "La factura debe estar pagada, verificada y disponible." }, { status: 400 });
    }
    if (!tramite.estado_solvencia || !["SIN_DEUDAS", "SOLVENTE"].includes(tramite.estado_solvencia)) {
      await connection.rollback();
      return NextResponse.json({ error: "La solvencia debe estar aprobada antes de enviar a Trámites." }, { status: 400 });
    }

    const [estadoRows] = await connection.query<EstadoRow[]>(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'ENVIADO_TRAMITES' LIMIT 1"
    );
    const idEstadoNuevo = estadoRows[0].id_estado_tramite;

    await connection.query(
      "UPDATE univalle_tramites.tramites SET id_estado_actual = ?, paso_actual = GREATEST(paso_actual, 6), fecha_inicio = COALESCE(fecha_inicio, NOW()) WHERE id_tramite = ?",
      [idEstadoNuevo, id_tramite]
    );

    await connection.query(
      `INSERT INTO univalle_tramites.historial_estados_tramite
       (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio, observacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_tramite,
        tramite.id_estado_actual,
        idEstadoNuevo,
        userId,
        `Tr\u00e1mite enviado autom\u00e1ticamente al \u00e1rea de Tr\u00e1mites. C\u00f3digo: ${tramite.codigo_seguimiento}`,
        `Fecha y hora de env\u00edo registradas autom\u00e1ticamente. Tiempo estimado de procesamiento: 48 horas.`,
      ]
    );

    await connection.query(
      `INSERT INTO univalle_tramites.notificaciones (id_usuario, titulo, mensaje, tipo)
       VALUES (?, 'Trámite en proceso', 'Su trámite está siendo procesado por el área de Trámites.', 'INFO')`,
      [userId]
    );

    await connection.commit();
    return NextResponse.json({
      success: true,
      duplicado: false,
      codigo_tramite: tramite.codigo_seguimiento,
      estado_codigo: "ENVIADO_TRAMITES",
      estado_nombre: "Enviado a Tr\u00e1mites",
      fecha_envio: new Date().toISOString(),
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error enviando a tramites:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
