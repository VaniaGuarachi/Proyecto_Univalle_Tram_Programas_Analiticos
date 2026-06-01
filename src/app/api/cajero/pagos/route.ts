import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

interface StatsRow extends RowDataPacket {
  pendientes: number;
  aceptados: number;
  enviados: number;
  total: number;
}

interface PagoRow extends RowDataPacket {
  id_pago: number;
  id_tramite: number;
  amount: number;
  date: Date;
  status: string;
  metodo_pago: string;
  rejection_reason: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  code: string;
  semestre: string | null;
  carrera: string | null;
  tramite: string;
  voucher: string | null;
  id_comprobante_pago: number | null;
  id_factura: number | null;
  numero_factura: string | null;
  ruta_pdf_factura: string | null;
  nombre_factura: string | null;
  nit_ci: string | null;
  razon_social: string | null;
  direccion: string | null;
  correo_envio: string | null;
  biblioteca_estado: string | null;
}

export async function GET() {
  try {
    // 1. Estadísticas para la vista de pagos
    const [stats] = await pool.query<StatsRow[]>(`
      SELECT 
        SUM(CASE WHEN estado_pago = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado_pago = 'PAGADO' THEN 1 ELSE 0 END) as aceptados,
        SUM(CASE WHEN s.estado_solvencia = 'PENDIENTE_VERIFICACION' THEN 1 ELSE 0 END) as enviados,
        COUNT(*) as total
      FROM univalle_tramites.pagos p
      LEFT JOIN univalle_tramites.solvencias s ON s.id_tramite = p.id_tramite
    `);

    // 2. Lista de pagos con info extendida de estudiante y trámite
    const [pagos] = await pool.query<PagoRow[]>(`
      SELECT 
        p.id_pago,
        p.id_tramite,
        p.monto_total as amount,
        p.fecha_generacion as date,
        p.estado_pago as status,
        p.metodo_pago,
        p.observacion as rejection_reason,
        u.nombres,
        u.apellidos,
        u.correo_institucional as email,
        e.codigo_estudiante as code,
        e.semestre,
        c.nombre as carrera,
        tt.nombre as tramite,
        cp.ruta_archivo as voucher,
        cp.id_comprobante_pago,
        f.id_factura,
        f.numero_factura,
        f.ruta_pdf_factura,
        f.nombre_factura,
        f.nit_ci,
        f.razon_social,
        f.direccion,
        f.correo_envio,
        s.estado_solvencia as biblioteca_estado
      FROM univalle_tramites.pagos p
      JOIN univalle_tramites.tramites t ON p.id_tramite = t.id_tramite
      JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
      LEFT JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      LEFT JOIN univalle_tramites.comprobantes_pago cp ON p.id_pago = cp.id_pago
      LEFT JOIN univalle_tramites.facturas f ON p.id_pago = f.id_pago
      LEFT JOIN univalle_tramites.solvencias s ON s.id_tramite = t.id_tramite
      WHERE s.id_solvencia IS NULL OR s.estado_solvencia <> 'PENDIENTE_VERIFICACION'
      ORDER BY p.fecha_generacion DESC
    `);

    return NextResponse.json({
      stats: stats[0] || { pendientes: 0, aceptados: 0, enviados: 0, total: 0 },
      pagos: pagos || []
    });

  } catch (error: unknown) {
    console.error("Error en pagos cajero API extendida:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}
