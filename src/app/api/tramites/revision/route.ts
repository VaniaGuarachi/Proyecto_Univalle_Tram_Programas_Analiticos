import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_tramite = searchParams.get('id');

    let query = `
      SELECT 
        t.id_tramite,
        t.codigo_seguimiento,
        t.fecha_solicitud,
        tt.nombre as tramite_nombre,
        u.nombres,
        u.apellidos,
        u.ci,
        de.numero_documento as nombre_documento,
        COALESCE(de.ruta_pdf_firmado, de.ruta_pdf_borrador) as pdf_path
      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
      JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
      JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
      LEFT JOIN univalle_tramites.documentos_emitidos de ON t.id_tramite = de.id_tramite
      WHERE t.id_estado_actual = (SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'EN_REVISION')
    `;

    if (id_tramite) {
      query += ` AND t.id_tramite = ? LIMIT 1`;
      const [rows]: any = await pool.query(query, [id_tramite]);
      return NextResponse.json(rows[0] || null);
    } else {
      query += ` LIMIT 1`;
      const [rows]: any = await pool.query(query);
      return NextResponse.json(rows[0] || null);
    }

  } catch (error: any) {
    console.error("Error en revisión trámites API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id_tramite, accion, comentario } = await request.json();

    if (!id_tramite || !accion) {
      return NextResponse.json({ error: "Datos faltantes" }, { status: 400 });
    }

    // Obtener el nuevo estado basado en la acción
    // Si aprueba -> EMITIDO
    // Si observa -> OBSERVADO
    const nextEstadoCodigo = accion === 'APROBAR' ? 'FINALIZADO' : 'OBSERVADO';

    const [estado]: any = await pool.query(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = ?",
      [nextEstadoCodigo]
    );

    if (estado.length === 0) {
      return NextResponse.json({ error: "Estado no encontrado" }, { status: 500 });
    }

    const id_estado_nuevo = estado[0].id_estado_tramite;

    // Actualizar trámite
    await pool.query(
      "UPDATE univalle_tramites.tramites SET id_estado_actual = ? WHERE id_tramite = ?",
      [id_estado_nuevo, id_tramite]
    );

    // Insertar en historial
    await pool.query(
      "INSERT INTO univalle_tramites.historial_estados_tramite (id_tramite, id_estado_nuevo, id_usuario_accion, observacion) VALUES (?, ?, 0, ?)",
      [id_tramite, id_estado_nuevo, comentario || `Acción de revisión: ${accion}`]
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error al procesar revisión:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
