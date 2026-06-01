import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const [[tipos], [requisitos]]: any = await Promise.all([
      pool.query(`
        SELECT 
          id_tipo_tramite as id, 
          nombre, 
          descripcion, 
          costo_base as price, 
          requiere_pago, 
          requiere_solvencia 
        FROM univalle_tramites.tipos_tramite 
        WHERE estado = 'ACTIVO'
      `),
      pool.query(`
        SELECT id_tipo_tramite, nombre as nombre_requisito
        FROM univalle_tramites.requisitos_tramite
      `),
    ]);

    const result = tipos.map((tipo: any) => ({
      ...tipo,
      requires: requisitos
        .filter((requisito: any) => requisito.id_tipo_tramite === tipo.id)
        .map((requisito: any) => requisito.nombre_requisito),
    }));

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error: any) {
    console.error("Error en tipos-tramite API completa:", error);
    return NextResponse.json({ error: "Error al obtener tipos de tramite." }, { status: 500 });
  }
}
