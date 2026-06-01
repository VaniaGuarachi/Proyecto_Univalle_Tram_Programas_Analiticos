import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [historial]: any = await pool.query(`
      SELECT 
        p.id_pago,
        p.codigo_pago as id,
        p.monto_total as amount,
        p.fecha_pago as date,
        p.estado_pago as status,
        u.nombres as est_nombres,
        u.apellidos as est_apellidos,
        e.codigo_estudiante as code,
        tt.nombre as tramite,
        f.numero_factura as factura_num,
        f.ruta_pdf_factura as factura_pdf
      FROM univalle_tramites.pagos p
      JOIN univalle_tramites.tramites t ON p.id_tramite = t.id_tramite
      JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      LEFT JOIN univalle_tramites.facturas f ON p.id_pago = f.id_pago
      WHERE p.estado_pago IN ('PAGADO', 'RECHAZADO')
      ORDER BY p.fecha_pago DESC
    `);

    return NextResponse.json({ historial: historial || [] });

  } catch (error: any) {
    console.error("Error en historial cajero API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
