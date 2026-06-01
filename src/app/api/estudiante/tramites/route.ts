import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

interface TramiteRow extends RowDataPacket {
  id_tramite: number;
  codigo_seguimiento: string;
  tramite: string;
  estado: string;
  estado_codigo: string;
  estado_descripcion: string | null;
  orden_flujo: number;
  es_final: number;
  es_bloqueante: number;
  fecha_solicitud: Date;
  paso_actual: number;
  estado_pago: string | null;
  fecha_pago: Date | null;
  comprobante_estado: string | null;
  numero_factura: string | null;
  ruta_pdf_factura: string | null;
  estado_solvencia: string | null;
  fecha_solvencia: Date | null;
  ultimo_movimiento: string | null;
  numero_documento: string | null;
  codigo_verificacion: string | null;
  qr_verificacion: string | null;
  ruta_pdf_firmado: string | null;
  fecha_emision: Date | null;
  responsable: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario no proporcionado" }, { status: 400 });
    }

    const query = `
      SELECT
        t.id_tramite,
        t.codigo_seguimiento,
        tt.nombre as tramite,
        et.nombre as estado,
        et.codigo as estado_codigo,
        et.descripcion as estado_descripcion,
        et.orden_flujo,
        et.es_final,
        et.es_bloqueante,
        t.fecha_solicitud,
        t.paso_actual,
        p.estado_pago,
        p.fecha_pago,
        cp.estado_revision as comprobante_estado,
        f.numero_factura,
        f.ruta_pdf_factura,
        s.estado_solvencia,
        s.fecha_resolucion as fecha_solvencia,
        de.numero_documento,
        de.codigo_verificacion,
        de.qr_verificacion,
        de.ruta_pdf_firmado,
        de.fecha_emision,
        (
          SELECT CONCAT(fd.nombre_firmante, ' - ', fd.cargo_firmante)
          FROM univalle_tramites.firmas_documento fd
          WHERE fd.id_documento_emitido = de.id_documento_emitido
          ORDER BY fd.id_firma_documento
          LIMIT 1
        ) as responsable,
        (
          SELECT h.motivo_cambio
          FROM univalle_tramites.historial_estados_tramite h
          WHERE h.id_tramite = t.id_tramite
          ORDER BY h.fecha_cambio DESC
          LIMIT 1
        ) as ultimo_movimiento
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      LEFT JOIN univalle_tramites.pagos p ON p.id_tramite = t.id_tramite
      LEFT JOIN univalle_tramites.comprobantes_pago cp ON cp.id_pago = p.id_pago
      LEFT JOIN univalle_tramites.facturas f ON f.id_pago = p.id_pago
      LEFT JOIN univalle_tramites.solvencias s ON s.id_tramite = t.id_tramite
      LEFT JOIN univalle_tramites.documentos_emitidos de ON de.id_tramite = t.id_tramite AND de.estado_documento IN ('EMITIDO','FIRMADO')
      WHERE t.id_estudiante = (SELECT id_estudiante FROM univalle_tramites.estudiantes WHERE id_usuario = ?)
      ORDER BY t.fecha_solicitud DESC
    `;
    const [rows] = await pool.query<TramiteRow[]>(query, [userId]);

    return NextResponse.json(rows.map((row) => ({
      ...row,
      ruta_pdf_firmado: row.ruta_pdf_firmado && !row.ruta_pdf_firmado.startsWith("/")
        ? `/uploads/${row.ruta_pdf_firmado}`
        : row.ruta_pdf_firmado,
    })));

  } catch (error: unknown) {
    console.error("Error en estudiante-tramites API:", error);
    return NextResponse.json(
      { error: "Error al obtener historial de trámites." },
      { status: 500 }
    );
  }
}
