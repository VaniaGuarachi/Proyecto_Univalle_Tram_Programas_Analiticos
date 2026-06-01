import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_estudiante = searchParams.get('id');

    if (!id_estudiante) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const [rows]: any = await pool.query(`
      SELECT 
        t.id_tramite,
        t.codigo_seguimiento,
        tt.nombre as tipo_nombre,
        tt.descripcion as tipo_descripcion,
        et.nombre as estado_nombre,
        et.codigo as estado_codigo,
        et.es_final,
        t.fecha_solicitud
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
      WHERE t.id_estudiante = ?
        AND t.estado_registro = 'ACTIVO'
        AND et.codigo IN ('ENVIADO_TRAMITES','EN_PROCESO','EMITIDO','FINALIZADO','TRAMITE_COMPLETADO','DOCUMENTO_GENERADO')
      ORDER BY t.fecha_solicitud DESC
    `, [id_estudiante]);

    return NextResponse.json({ tramites: rows });
  } catch (error: any) {
    console.error("Error en API tramites estudiante v2:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
