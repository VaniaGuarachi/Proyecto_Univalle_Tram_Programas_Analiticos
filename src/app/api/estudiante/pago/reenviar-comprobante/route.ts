import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

interface PagoRow extends RowDataPacket {
  id_pago: number;
  id_estado_actual: number;
  estado_pago: string;
}

interface EstadoRow extends RowDataPacket {
  id_estado_tramite: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];

function isAllowedVoucher(file: File) {
  return ALLOWED_TYPES.includes(file.type) || /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
}

export async function POST(request: Request) {
  let connection;

  try {
    const formData = await request.formData();
    const idTramite = Number(formData.get("id_tramite"));
    const userId = Number(formData.get("userId"));
    const file = formData.get("voucher");

    if (!idTramite || !userId || !(file instanceof File)) {
      return NextResponse.json({ error: "Debes seleccionar un comprobante válido." }, { status: 400 });
    }
    if (!isAllowedVoucher(file)) {
      return NextResponse.json(
        { error: "El comprobante debe ser una imagen o PDF (jpg, jpeg, png, webp, pdf)." },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [pagoRows] = await connection.query<PagoRow[]>(
      `SELECT p.id_pago, p.estado_pago, t.id_estado_actual
       FROM univalle_tramites.pagos p
       JOIN univalle_tramites.tramites t ON t.id_tramite = p.id_tramite
       JOIN univalle_tramites.estudiantes e ON e.id_estudiante = t.id_estudiante
       WHERE t.id_tramite = ? AND e.id_usuario = ?
       LIMIT 1`,
      [idTramite, userId]
    );
    const pago = pagoRows[0];

    if (!pago) {
      await connection.rollback();
      return NextResponse.json({ error: "Pago no encontrado para este estudiante." }, { status: 404 });
    }
    if (!["RECHAZADO", "OBSERVADO"].includes(pago.estado_pago)) {
      await connection.rollback();
      return NextResponse.json({ error: "Solo puedes reenviar un comprobante rechazado." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const dataUri = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: "tramites/comprobantes",
      resource_type: "auto",
      fetch_format: "auto",
      quality: "auto",
    });

    await connection.query(
      `INSERT INTO univalle_tramites.estados_tramite
       (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
       VALUES ('COMPROBANTE_SUBIDO', 'Comprobante subido', 'Esperando validación del cajero', 3, FALSE, TRUE, 'ACTIVO')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo), es_bloqueante = VALUES(es_bloqueante)`
    );
    const [estadoRows] = await connection.query<EstadoRow[]>(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'COMPROBANTE_SUBIDO' LIMIT 1"
    );
    const idEstadoNuevo = estadoRows[0].id_estado_tramite;

    await connection.query(
      "UPDATE univalle_tramites.pagos SET estado_pago = 'PENDIENTE', observacion = NULL, fecha_pago = NULL WHERE id_pago = ?",
      [pago.id_pago]
    );
    await connection.query(
      `INSERT INTO univalle_tramites.comprobantes_pago
       (id_pago, ruta_archivo, nombre_archivo, estado_revision, observacion_revision, subido_por)
       VALUES (?, ?, ?, 'PENDIENTE', NULL, ?)
       ON DUPLICATE KEY UPDATE
         ruta_archivo = VALUES(ruta_archivo),
         nombre_archivo = VALUES(nombre_archivo),
         estado_revision = 'PENDIENTE',
         observacion_revision = NULL,
         subido_por = VALUES(subido_por)`,
      [pago.id_pago, upload.secure_url, file.name, userId]
    );
    await connection.query(
      "UPDATE univalle_tramites.tramites SET id_estado_actual = ?, paso_actual = 2 WHERE id_tramite = ?",
      [idEstadoNuevo, idTramite]
    );
    await connection.query(
      `INSERT INTO univalle_tramites.historial_estados_tramite
       (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio)
       VALUES (?, ?, ?, ?, 'El estudiante reemplazó el comprobante rechazado. Pendiente de nueva validación por Caja.')`,
      [idTramite, pago.id_estado_actual, idEstadoNuevo, userId]
    );
    await connection.query(
      `INSERT INTO univalle_tramites.notificaciones (id_usuario, titulo, mensaje, tipo)
       SELECT u.id_usuario, 'Comprobante reenviado', 'Un estudiante reemplazó un comprobante rechazado. Requiere nueva validación.', 'ALERTA'
       FROM univalle_tramites.usuarios u
       JOIN univalle_tramites.usuario_roles ur ON ur.id_usuario = u.id_usuario
       JOIN univalle_tramites.roles r ON r.id_rol = ur.id_rol
       WHERE r.nombre = 'CAJERO' AND u.estado = 'ACTIVO'`
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error reenviando comprobante:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
