import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const [[stats], [total], [historialCount]]: any = await Promise.all([
      pool.query(`
        SELECT 
          SUM(CASE WHEN estado_pago = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN estado_pago = 'PAGADO' THEN 1 ELSE 0 END) as aceptados,
          SUM(CASE WHEN estado_pago = 'RECHAZADO' THEN 1 ELSE 0 END) as rechazados,
          SUM(CASE WHEN estado_pago = 'EN_REVISION' THEN 1 ELSE 0 END) as enviados
        FROM univalle_tramites.pagos
      `),
      pool.query(`
        SELECT SUM(monto_total) as total_recaudado
        FROM univalle_tramites.pagos
        WHERE estado_pago = 'PAGADO'
      `),
      pool.query(`
        SELECT COUNT(*) as count
        FROM univalle_tramites.pagos
        WHERE estado_pago IN ('PAGADO', 'RECHAZADO')
      `),
    ]);

    return NextResponse.json({
      stats: stats[0] || { pendientes: 0, aceptados: 0, rechazados: 0, enviados: 0 },
      recaudado: total[0]?.total_recaudado || 0,
      historialCount: historialCount[0]?.count || 0,
    });
  } catch (error: any) {
    console.error("Error en dashboard cajero:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
