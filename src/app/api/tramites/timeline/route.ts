import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_estudiante = searchParams.get('id_estudiante');

    if (!id_estudiante) {
      return NextResponse.json({ error: 'id_estudiante requerido' }, { status: 400 });
    }

    // Traer todos los trámites del estudiante con el estado de cada etapa del flujo
    const [rows]: any = await pool.query(`
      SELECT
        t.id_tramite,
        t.codigo_seguimiento,
        t.paso_actual,
        t.fecha_solicitud,
        t.fecha_resolucion,

        -- Tipo de trámite
        tt.nombre           AS nombre_tramite,
        tt.costo_base,

        -- Estado actual del tramite
        et.codigo           AS estado_codigo,
        et.nombre           AS estado_nombre,
        et.orden_flujo,
        et.es_final,

        -- PASO 1: Pago (Cajero)
        p.id_pago,
        p.estado_pago,
        p.fecha_pago,
        p.monto_total       AS monto_pago,
        p.metodo_pago,

        -- Factura vinculada al pago
        f.numero_factura,

        -- PASO 2: Solvencia (Biblioteca)
        s.id_solvencia,
        s.estado_solvencia,
        s.fecha_resolucion  AS fecha_solvencia,
        s.observacion       AS obs_solvencia

      FROM univalle_tramites.tramites t
      JOIN univalle_tramites.tipos_tramite tt
        ON t.id_tipo_tramite = tt.id_tipo_tramite
      JOIN univalle_tramites.estados_tramite et
        ON t.id_estado_actual = et.id_estado_tramite

      -- Pago: puede haber uno o ninguno
      LEFT JOIN univalle_tramites.pagos p
        ON p.id_tramite = t.id_tramite

      -- Factura vinculada al pago
      LEFT JOIN univalle_tramites.facturas f
        ON f.id_pago = p.id_pago

      -- Solvencia de biblioteca
      LEFT JOIN univalle_tramites.solvencias s
        ON s.id_tramite = t.id_tramite

      WHERE t.id_estudiante = ?
        AND t.estado_registro = 'ACTIVO'

      ORDER BY t.fecha_solicitud DESC
    `, [id_estudiante]);

    // Mapear cada fila a un objeto de timeline estructurado
    const tramites = rows.map((r: any) => {
      // ── PASO 1: Cajero / Pago ──────────────────────────────────────────
      let pasoTipoPago: 'pending' | 'in-progress' | 'done' | 'rejected' = 'pending';
      if (r.estado_pago === 'PAGADO')    pasoTipoPago = 'done';
      else if (r.estado_pago === 'RECHAZADO') pasoTipoPago = 'rejected';
      else if (r.estado_pago === 'EN_REVISION' || r.estado_pago === 'PENDIENTE') pasoTipoPago = 'in-progress';

      // ── PASO 2: Biblioteca / Solvencia ────────────────────────────────
      // Solo se activa si el pago está aprobado
      let pasoTipoBiblioteca: 'pending' | 'in-progress' | 'done' | 'rejected' = 'pending';
      if (pasoTipoPago === 'done') {
        if (r.estado_solvencia === 'SIN_DEUDAS' || r.estado_solvencia === 'SOLVENTE')
          pasoTipoBiblioteca = 'done';
        else if (r.estado_solvencia === 'CON_DEUDAS' || r.estado_solvencia === 'BLOQUEADO')
          pasoTipoBiblioteca = 'rejected';
        else if (r.estado_solvencia === 'PENDIENTE_VERIFICACION')
          pasoTipoBiblioteca = 'in-progress';
      }

      // ── PASO 3: Tramites / Aprobación final ───────────────────────────
      // Solo se activa si la solvencia está OK
      let pasoTipoTramites: 'pending' | 'in-progress' | 'done' | 'rejected' = 'pending';
      if (pasoTipoBiblioteca === 'done') {
        const codigoFinal = r.estado_codigo?.toUpperCase() ?? '';
        if (codigoFinal.includes('FINALIZADO') || codigoFinal.includes('COMPLETADO') || codigoFinal.includes('EMITIDO'))
          pasoTipoTramites = 'done';
        else if (codigoFinal.includes('RECHAZADO') || codigoFinal.includes('OBSERVADO'))
          pasoTipoTramites = 'rejected';
        else
          pasoTipoTramites = 'in-progress';
      }

      return {
        id_tramite:         r.id_tramite,
        codigo_seguimiento: r.codigo_seguimiento,
        nombre_tramite:     r.nombre_tramite,
        costo_base:         Number(r.costo_base),
        fecha_solicitud:    r.fecha_solicitud,
        fecha_resolucion:   r.fecha_resolucion,
        estado_actual:      { codigo: r.estado_codigo, nombre: r.estado_nombre, es_final: !!r.es_final },

        pasos: [
          {
            id:       'pago',
            titulo:   'Validación de Pago',
            rol:      'Cajero',
            tipo:     pasoTipoPago,
            fecha:    r.fecha_pago,
            detalle:  r.estado_pago
                        ? `${r.estado_pago}${r.monto_pago ? ` · Bs. ${r.monto_pago}` : ''}${r.numero_factura ? ` · Fact. ${r.numero_factura}` : ''}`
                        : 'Sin comprobante de pago',
          },
          {
            id:       'biblioteca',
            titulo:   'Solvencia de Biblioteca',
            rol:      'Bibliotecario',
            tipo:     pasoTipoBiblioteca,
            fecha:    r.fecha_solvencia,
            detalle:  r.estado_solvencia
                        ? r.estado_solvencia.replace(/_/g, ' ')
                        : 'Pendiente de verificación',
          },
          {
            id:       'tramites',
            titulo:   'Aprobación de Trámites',
            rol:      'Trámites',
            tipo:     pasoTipoTramites,
            fecha:    pasoTipoTramites === 'done' ? r.fecha_resolucion : null,
            detalle:  r.estado_nombre ?? 'Pendiente',
          },
        ],
      };
    });

    return NextResponse.json({ tramites });

  } catch (error: any) {
    console.error('Error en API timeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
