import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

interface PagoRow extends RowDataPacket {
  id_pago: number;
  id_tramite: number;
  id_estudiante: number;
  id_estado_actual: number;
  estado_pago: string;
  monto_total: number;
}

interface EstadoRow extends RowDataPacket {
  id_estado_tramite: number;
}

function safePdfName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

async function ensureWorkflowStates(connection: any) {
  const estados = [
    ["PENDIENTE_SOLVENCIA", "Pendiente solvencia", "Esperando revisión de biblioteca", 4, 0, 1],
    ["FACTURA", "Factura", "Factura disponible", 4, 0, 0],
    ["EN_PROCESO", "Trámite en proceso", "El documento está siendo procesado por Trámites", 6, 0, 0],
    ["FINALIZADO", "Finalizado", "Trámite finalizado", 8, 1, 0],
  ];

  for (const estado of estados) {
    await connection.query(
      `INSERT INTO univalle_tramites.estados_tramite
       (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo), es_final = VALUES(es_final), es_bloqueante = VALUES(es_bloqueante)`,
      estado
    );
  }
}

export async function POST(request: Request) {
  let connection;

  try {
    const contentType = request.headers.get("content-type") || "";
    let id_pago: number;
    let action: string;
    let reason: string | undefined;
    let id_usuario_cajero: number;
    let invoiceData: Record<string, unknown> | undefined;
    let invoiceFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      id_pago = Number(formData.get("id_pago"));
      action = String(formData.get("action") || "");
      reason = String(formData.get("reason") || "");
      id_usuario_cajero = Number(formData.get("id_usuario_cajero"));
      const rawInvoiceData = formData.get("invoiceData");
      invoiceData = rawInvoiceData ? JSON.parse(String(rawInvoiceData)) : undefined;
      const file = formData.get("invoicePdf");
      invoiceFile = file instanceof File ? file : null;
    } else {
      const body = await request.json();
      id_pago = Number(body.id_pago);
      action = body.action;
      reason = body.reason;
      id_usuario_cajero = Number(body.id_usuario_cajero);
      invoiceData = body.invoiceData;
    }

    if (!id_pago || !action || !id_usuario_cajero) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await ensureWorkflowStates(connection);

    const [pagoRows] = await connection.query<PagoRow[]>(
      `SELECT p.*, t.id_estudiante, t.id_estado_actual
       FROM univalle_tramites.pagos p
       JOIN univalle_tramites.tramites t ON p.id_tramite = t.id_tramite
       WHERE p.id_pago = ?`,
      [id_pago]
    );

    if (pagoRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    const pago = pagoRows[0];

    if (action === "APROBAR") {
      const isPdf = invoiceFile?.type === "application/pdf" || invoiceFile?.name.toLowerCase().endsWith(".pdf");
      if (!invoiceFile || !isPdf) {
        await connection.rollback();
        return NextResponse.json({ error: "Debes adjuntar la factura en formato PDF" }, { status: 400 });
      }

      await connection.query(
        "UPDATE univalle_tramites.pagos SET estado_pago = 'PAGADO', fecha_pago = NOW() WHERE id_pago = ?",
        [id_pago]
      );

      await connection.query(
        "UPDATE univalle_tramites.comprobantes_pago SET estado_revision = 'APROBADO' WHERE id_pago = ?",
        [id_pago]
      );

      const numeroFactura = `FAC-${Date.now()}`;
      const facturaDir = join(process.cwd(), "public", "facturas");
      await mkdir(facturaDir, { recursive: true });
      const uploadedName = safePdfName(invoiceFile.name || `FACT-${String(id_pago).padStart(5, "0")}.pdf`);
      const facturaFile = `${String(id_pago).padStart(5, "0")}-${Date.now()}-${uploadedName.endsWith(".pdf") ? uploadedName : `${uploadedName}.pdf`}`;
      const pdfPath = `/facturas/${facturaFile}`;
      await writeFile(join(facturaDir, facturaFile), Buffer.from(await invoiceFile.arrayBuffer()));

      await connection.query(
        `INSERT INTO univalle_tramites.facturas
         (id_pago, numero_factura, nombre_factura, nit_ci, razon_social, direccion, monto_total, ruta_pdf_factura, correo_envio, subido_por_cajero, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EMITIDA')
         ON DUPLICATE KEY UPDATE
           estado = 'EMITIDA',
           subido_por_cajero = VALUES(subido_por_cajero),
           ruta_pdf_factura = VALUES(ruta_pdf_factura),
           correo_envio = COALESCE(correo_envio, VALUES(correo_envio))`,
        [
          id_pago,
          numeroFactura,
          invoiceData?.nombre || "Estudiante Univalle",
          invoiceData?.nit_ci || "0",
          invoiceData?.razon_social || "",
          invoiceData?.direccion || null,
          pago.monto_total,
          pdfPath,
          invoiceData?.correo_envio || null,
          id_usuario_cajero,
        ]
      );

      const [nextStatusRows] = await connection.query<EstadoRow[]>(
        "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'PENDIENTE_SOLVENCIA'"
      );

      const id_estado_nuevo = nextStatusRows[0]?.id_estado_tramite || pago.id_estado_actual;
      await connection.query(
        `INSERT INTO univalle_tramites.solvencias (id_estudiante, id_tramite, estado_solvencia, observacion)
         VALUES (?, ?, 'PENDIENTE_VERIFICACION', 'Pendiente verificación biblioteca')
         ON DUPLICATE KEY UPDATE estado_solvencia = 'PENDIENTE_VERIFICACION', observacion = 'Pendiente verificación biblioteca', fecha_resolucion = NULL`,
        [pago.id_estudiante, pago.id_tramite]
      );

      await connection.query(
        "UPDATE univalle_tramites.tramites SET id_estado_actual = ?, paso_actual = 4 WHERE id_tramite = ?",
        [id_estado_nuevo, pago.id_tramite]
      );

      await connection.query(
        `INSERT INTO univalle_tramites.historial_estados_tramite
         (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio)
         VALUES (?, ?, ?, ?, 'Pago aprobado por Cajero. Solicitud enviada a Biblioteca para verificación de deuda.')`,
        [pago.id_tramite, pago.id_estado_actual, id_estado_nuevo, id_usuario_cajero]
      );

      await connection.query(
        `INSERT INTO univalle_tramites.notificaciones (id_usuario, titulo, mensaje, tipo)
         SELECT u.id_usuario, 'Verificación de biblioteca pendiente', 'Hay un trámite pendiente para revisar solvencia.', 'ALERTA'
         FROM univalle_tramites.usuarios u
         JOIN univalle_tramites.usuario_roles ur ON ur.id_usuario = u.id_usuario
         JOIN univalle_tramites.roles r ON r.id_rol = ur.id_rol
         WHERE r.nombre = 'BIBLIOTECARIO' AND u.estado = 'ACTIVO'`
      );
    } else if (action === "ENVIAR_BIBLIOTECA") {
      if (pago.estado_pago !== "PAGADO") {
        await connection.rollback();
        return NextResponse.json({ error: "El pago debe estar aprobado antes de enviarlo a Biblioteca" }, { status: 400 });
      }

      const [estadoBibliotecaRows] = await connection.query<EstadoRow[]>(
        "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'PENDIENTE_SOLVENCIA'"
      );
      const id_estado_nuevo = estadoBibliotecaRows[0]?.id_estado_tramite || pago.id_estado_actual;
      const pdfPath = invoiceData?.ruta_pdf_factura || `/facturas/FACT-${String(id_pago).padStart(5, "0")}.pdf`;

      await connection.query(
        `UPDATE univalle_tramites.facturas
         SET ruta_pdf_factura = COALESCE(ruta_pdf_factura, ?),
             correo_envio = COALESCE(correo_envio, ?),
             estado = 'EMITIDA'
         WHERE id_pago = ?`,
        [pdfPath, invoiceData?.correo_envio || null, id_pago]
      );

      await connection.query(
        `INSERT INTO univalle_tramites.solvencias (id_estudiante, id_tramite, estado_solvencia)
         VALUES (?, ?, 'PENDIENTE_VERIFICACION')
         ON DUPLICATE KEY UPDATE estado_solvencia = 'PENDIENTE_VERIFICACION'`,
        [pago.id_estudiante, pago.id_tramite]
      );

      await connection.query(
        "UPDATE univalle_tramites.tramites SET id_estado_actual = ?, paso_actual = GREATEST(paso_actual, 3) WHERE id_tramite = ?",
        [id_estado_nuevo, pago.id_tramite]
      );

      await connection.query(
        `INSERT INTO univalle_tramites.historial_estados_tramite
         (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio)
         VALUES (?, ?, ?, ?, 'Factura enviada al estudiante. Trámite derivado a Biblioteca.')`,
        [pago.id_tramite, pago.id_estado_actual, id_estado_nuevo, id_usuario_cajero]
      );
    } else if (action === "RECHAZAR") {
      await connection.query(
        "UPDATE univalle_tramites.pagos SET estado_pago = 'RECHAZADO', observacion = ? WHERE id_pago = ?",
        [reason, id_pago]
      );

      await connection.query(
        "UPDATE univalle_tramites.comprobantes_pago SET estado_revision = 'RECHAZADO', observacion_revision = ? WHERE id_pago = ?",
        [reason, id_pago]
      );

      const [estadoRechazadoRows] = await connection.query<EstadoRow[]>(
        "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'PAGO_RECHAZADO'"
      );
      const id_estado_rechazado = estadoRechazadoRows[0]?.id_estado_tramite || pago.id_estado_actual;

      await connection.query(
        "UPDATE univalle_tramites.tramites SET id_estado_actual = ? WHERE id_tramite = ?",
        [id_estado_rechazado, pago.id_tramite]
      );

      await connection.query(
        `INSERT INTO univalle_tramites.historial_estados_tramite
         (id_tramite, id_estado_anterior, id_estado_nuevo, id_usuario_accion, motivo_cambio)
         VALUES (?, ?, ?, ?, ?)`,
        [pago.id_tramite, pago.id_estado_actual, id_estado_rechazado, id_usuario_cajero, `Pago rechazado: ${reason}`]
      );
    } else {
      await connection.rollback();
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (connection) await connection.rollback();
    console.error("Error en validación cajero:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
