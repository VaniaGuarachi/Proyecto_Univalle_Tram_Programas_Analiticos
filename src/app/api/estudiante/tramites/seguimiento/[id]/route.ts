import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Obtener datos base del trámite por ID
    const [tramiteRows]: any = await pool.query(`
      SELECT 
        t.id_tramite,
        t.codigo_seguimiento,
        t.fecha_solicitud,
        t.paso_actual,
        tt.nombre as tramite_nombre,
        tt.descripcion as tramite_descripcion,
        et.nombre as estado_nombre,
        et.codigo as estado_codigo,
        CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
        u.codigo_login as estudiante_matricula
      FROM univalle_tramites.tramites t
      LEFT JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      LEFT JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      LEFT JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
      LEFT JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
      WHERE t.id_tramite = ?
    `, [id]);

    if (!tramiteRows || tramiteRows.length === 0) {
      return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });
    }
    const tramite = tramiteRows[0];

    // 2. Obtener datos de pago asociados
    const [pagoRows]: any = await pool.query(`
      SELECT 
        p.id_pago,
        p.monto_total,
        p.estado_pago,
        p.metodo_pago,
        p.fecha_pago,
        cp.ruta_archivo as voucher_path,
        cp.estado_revision as voucher_estado,
        cp.observacion_revision as voucher_observacion,
        f.numero_factura,
        f.nombre_factura,
        f.nit_ci,
        f.razon_social,
        f.direccion,
        f.correo_envio,
        f.monto_total as factura_monto_total,
        f.ruta_pdf_factura
      FROM univalle_tramites.pagos p
      LEFT JOIN univalle_tramites.comprobantes_pago cp ON p.id_pago = cp.id_pago
      LEFT JOIN univalle_tramites.facturas f ON f.id_pago = p.id_pago
      WHERE p.id_tramite = ?
    `, [tramite.id_tramite]);

    const pago = pagoRows[0] || null;

    // 3. Obtener solvencia y sus deudas (si aplica)
    const [solvenciaRows]: any = await pool.query(`
      SELECT id_solvencia, estado_solvencia, observacion
      FROM univalle_tramites.solvencias
      WHERE id_tramite = ?
    `, [tramite.id_tramite]);

    const solvencia = solvenciaRows[0] || null;
    let deudas = [];

    if (solvencia) {
      const [deudaRows]: any = await pool.query(`
        SELECT tipo_deuda, descripcion, monto, estado_deuda
        FROM univalle_tramites.deudas_biblioteca
        WHERE id_solvencia = ? AND estado_deuda = 'PENDIENTE'
      `, [solvencia.id_solvencia]);
      deudas = deudaRows;
    }

    // 4. Historial de estados
    const [historial]: any = await pool.query(`
      SELECT 
        h.fecha_cambio,
        et.nombre as estado,
        h.motivo_cambio
      FROM univalle_tramites.historial_estados_tramite h
      JOIN univalle_tramites.estados_tramite et ON h.id_estado_nuevo = et.id_estado_tramite
      WHERE h.id_tramite = ?
      ORDER BY h.fecha_cambio DESC
    `, [tramite.id_tramite]);

    // 5. Documento emitido (si existe y está emitido)
    const [documentoRows]: any = await pool.query(`
      SELECT 
        id_documento_emitido,
        numero_documento, 
        codigo_verificacion, 
        qr_verificacion, 
        ruta_pdf_firmado, 
        fecha_emision,
        estado_documento
      FROM univalle_tramites.documentos_emitidos
      WHERE id_tramite = ? AND estado_documento IN ('EMITIDO', 'FIRMADO')
    `, [tramite.id_tramite]);

    const documento = documentoRows[0] || null;
    if (documento) {
      const [firmas]: any = await pool.query(`
        SELECT nombre_firmante, cargo_firmante
        FROM univalle_tramites.firmas_documento
        WHERE id_documento_emitido = ?
        ORDER BY id_firma_documento
      `, [documento.id_documento_emitido]);

      documento.firma_responsable = firmas[0] ? `${firmas[0].nombre_firmante} - ${firmas[0].cargo_firmante}` : null;
      documento.firma_autoridad = firmas[1] ? `${firmas[1].nombre_firmante} - ${firmas[1].cargo_firmante}` : null;
      documento.observaciones = tramite.tramite_descripcion;
    }
    
    if (documento && documento.ruta_pdf_firmado && !documento.ruta_pdf_firmado.startsWith('/')) {
      documento.ruta_pdf_firmado = '/uploads/' + documento.ruta_pdf_firmado;
    }

    return NextResponse.json({
      tramite,
      pago,
      factura: pago ? {
        numero_factura: pago.numero_factura,
        nombre_factura: pago.nombre_factura,
        nit_ci: pago.nit_ci,
        razon_social: pago.razon_social,
        direccion: pago.direccion,
        correo_envio: pago.correo_envio,
        monto_total: pago.factura_monto_total,
        ruta_pdf_factura: pago.ruta_pdf_factura,
      } : null,
      solvencia: {
        ...solvencia,
        deudas
      },
      historial,
      documento
    });

  } catch (error: any) {
    console.error("Error en seguimiento API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
