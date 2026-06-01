import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, paso_actual, cart, id_tramite } = body;

    if (!userId) {
      return NextResponse.json({ error: "UID faltante" }, { status: 400 });
    }

    // Buscar el id_estudiante
    const [est] = await pool.query(
      "SELECT id_estudiante FROM univalle_tramites.estudiantes WHERE id_usuario = ?",
      [userId]
    );

    const id_estudiante = (est as any)[0]?.id_estudiante;
    if (!id_estudiante) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    if (id_tramite) {
      // Actualizar trámite existente
      // Mapear paso_actual a id_estado_actual aproximado para sincronización
      let id_estado_actual = 1; // Default
      switch(paso_actual) {
        case 1: id_estado_actual = 1; break; // Solicitud
        case 2: id_estado_actual = 1; break; // Datos
        case 3: id_estado_actual = 1; break; // Pago Pendiente
        case 4: id_estado_actual = 1; break; // Pendiente Solvencia (Biblioteca)
        case 5: id_estado_actual = 1; break; // Apto para trámite (Esperando PDF)
        default: id_estado_actual = 1; // Observado / Otros
      }

      await pool.query(
        "UPDATE univalle_tramites.tramites SET paso_actual = ?, id_estado_actual = ? WHERE id_tramite = ? AND id_estudiante = ?",
        [paso_actual, id_estado_actual, id_tramite, id_estudiante]
      );
      
      // Aquí podríamos guardar el carrito en una tabla temporal o metadata si fuera necesario
      // Por ahora, el paso_actual es lo principal para la navegación
      
      return NextResponse.json({ success: true });
    } else {
      // Crear trámite inicial si no existe uno activo para este tipo
      // Usamos id_tipo_tramite 2 (Programas Analíticos) por defecto para este wizard
      const codigo_seguimiento = 'TR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const [result] = await pool.query(
        "INSERT INTO univalle_tramites.tramites (id_estudiante, id_tipo_tramite, id_estado_actual, codigo_seguimiento, paso_actual) VALUES (?, 2, 1, ?, ?)",
        [id_estudiante, codigo_seguimiento, paso_actual]
      );

      return NextResponse.json({ 
        success: true, 
        id_tramite: (result as any).insertId,
        codigo_seguimiento 
      });
    }

  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
