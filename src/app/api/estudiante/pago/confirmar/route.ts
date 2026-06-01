import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import cloudinary from '@/lib/cloudinary';

async function ensureWorkflowStates(connection: any) {
  const estados = [
    ["INICIO", "Inicio", "Solicitud iniciada", 1, 0, 0],
    ["PAGO", "Pago", "Pago registrado", 2, 0, 1],
    ["VERIFICACION", "Verificación", "Pago verificado", 3, 0, 1],
    ["FACTURA", "Factura", "Factura disponible", 4, 0, 0],
    ["ENVIADO_TRAMITES", "Enviado a Trámites", "El estudiante envió el trámite al área correspondiente", 5, 0, 0],
    ["EN_PROCESO", "Trámite en proceso", "El documento está siendo procesado por Trámites", 6, 0, 0],
    ["EMITIDO", "Emitido", "Documento emitido", 7, 0, 0],
    ["FINALIZADO", "Finalizado", "Trámite finalizado", 8, 1, 0],
  ];

  for (const estado of estados) {
    await connection.query(
      `INSERT INTO univalle_tramites.estados_tramite
       (codigo, nombre, descripcion, orden_flujo, es_final, es_bloqueante, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), orden_flujo = VALUES(orden_flujo), es_final = VALUES(es_final), es_bloqueante = VALUES(es_bloqueante)`,
      estado
    );
  }
}

export async function POST(request: Request) {
  let connection;
  try {
    const contentType = request.headers.get('content-type') || '';
    let userId, items, voucherFile = null, totalPrice = 0;
    let invoiceData: any = null;
    let studentData: any = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      userId = formData.get('userId');
      const itemsJson = formData.get('items');
      totalPrice = Number(formData.get('totalPrice') || 0);
      voucherFile = formData.get('voucher') as File | null;
      invoiceData = JSON.parse((formData.get('invoiceData') as string) || 'null');
      studentData = JSON.parse((formData.get('studentData') as string) || 'null');
      items = JSON.parse(itemsJson as string);
    } else {
      const body = await request.json();
      userId = body.userId;
      items = body.items;
      totalPrice = body.totalPrice || items.reduce((acc: number, item: any) => acc + Number(item.price), 0);
      invoiceData = body.invoiceData || null;
      studentData = body.studentData || null;
    }

    if (!userId || !items || items.length === 0) {
      return NextResponse.json({ error: "Datos de pago incompletos" }, { status: 400 });
    }

    // Guardar voucher en Cloudinary si existe
    let voucherPath = null;
    if (voucherFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
      const hasAllowedExtension = /\.(jpe?g|png|webp|pdf)$/i.test(voucherFile.name);
      if (!allowedTypes.includes(voucherFile.type) && !hasAllowedExtension) {
        return NextResponse.json({ error: "El comprobante debe ser una imagen o PDF (jpg, jpeg, png, webp, pdf)" }, { status: 400 });
      }

      const bytes = await voucherFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = buffer.toString('base64');
      const mimeType = voucherFile.type || (voucherFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      const uploadResponse = await cloudinary.uploader.upload(dataUri, {
        folder: 'tramites/comprobantes',
        resource_type: 'auto',
        fetch_format: 'auto',
        quality: 'auto'
      });

      voucherPath = uploadResponse.secure_url;
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await ensureWorkflowStates(connection);

    // 1. Obtener id_estudiante
    const [studentRows]: any = await connection.query(
      'SELECT id_estudiante FROM univalle_tramites.estudiantes WHERE id_usuario = ?',
      [userId]
    );
    if (studentRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }
    const id_estudiante = studentRows[0].id_estudiante;

    if (studentData?.carrera || studentData?.anio) {
      let idCarrera = null;
      if (studentData?.carrera) {
        const [carreraRows]: any = await connection.query(
          'SELECT id_carrera FROM univalle_tramites.carreras WHERE nombre = ? LIMIT 1',
          [studentData.carrera]
        );
        idCarrera = carreraRows[0]?.id_carrera || null;
      }

      if (idCarrera && studentData?.anio) {
        await connection.query(
          'UPDATE univalle_tramites.estudiantes SET id_carrera = ?, anio_titulacion = ? WHERE id_estudiante = ?',
          [idCarrera, studentData.anio, id_estudiante]
        );
      } else if (idCarrera) {
        await connection.query(
          'UPDATE univalle_tramites.estudiantes SET id_carrera = ? WHERE id_estudiante = ?',
          [idCarrera, id_estudiante]
        );
      } else if (studentData?.anio) {
        await connection.query(
          'UPDATE univalle_tramites.estudiantes SET anio_titulacion = ? WHERE id_estudiante = ?',
          [studentData.anio, id_estudiante]
        );
      }
    }

    // 2. Obtener estado inicial del flujo real
    const [statusRows]: any = await connection.query(
      "SELECT id_estado_tramite FROM univalle_tramites.estados_tramite WHERE codigo = 'PAGO'"
    );
    const id_estado_actual = statusRows[0]?.id_estado_tramite || 1;

    // 3. Crear todos los Trámites primero
    const createdTramites = [];
    const formatter = new Intl.DateTimeFormat('es-BO', { 
      timeZone: 'America/La_Paz', 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    });
    const parts = formatter.formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    const d = parts.find(p => p.type === 'day')?.value || '';
    const timestamp = `${y}${m}${d}`;
    
    for (const item of items) {
      const random = Math.floor(1000 + Math.random() * 9000);
      const codigo_seguimiento = `TRM-${timestamp}-${random}`;

      const [tramiteResult]: any = await connection.query(
        `INSERT INTO univalle_tramites.tramites 
         (codigo_seguimiento, id_estudiante, id_tipo_tramite, id_estado_actual, paso_actual) 
         VALUES (?, ?, ?, ?, 2)`,
        [codigo_seguimiento, id_estudiante, item.id, id_estado_actual]
      );
      const id_tramite = tramiteResult.insertId;
      createdTramites.push({ id: id_tramite, code: codigo_seguimiento, typeId: item.id, price: item.price });
    }

    const primaryTramiteId = createdTramites[0].id;

    // 4. Crear el Carrito asociado al trámite principal (según esquema)
    const [carritoResult]: any = await connection.query(
      `INSERT INTO univalle_tramites.carritos_pago (id_estudiante, id_tramite, total, estado) 
       VALUES (?, ?, ?, 'ACTIVO')`,
      [id_estudiante, primaryTramiteId, totalPrice]
    );
    const id_carrito = carritoResult.insertId;

    // 5. Insertar Detalle del Carrito
    for (const tr of createdTramites) {
      await connection.query(
        `INSERT INTO univalle_tramites.carrito_detalle (id_carrito, id_tipo_tramite, cantidad, precio_unitario, subtotal) 
         VALUES (?, ?, 1, ?, ?)`,
        [id_carrito, tr.typeId, tr.price, tr.price]
      );
    }

    // 6. Crear el Pago único para todo el carrito
    const randomPago = Math.floor(1000 + Math.random() * 9000);
    const [pagoResult]: any = await connection.query(
      `INSERT INTO univalle_tramites.pagos 
       (id_tramite, id_carrito, codigo_pago, monto_total, metodo_pago, estado_pago) 
       VALUES (?, ?, ?, ?, 'QR', 'PENDIENTE')`,
      [primaryTramiteId, id_carrito, `PAG-${timestamp}-${randomPago}`, totalPrice]
    );
    const id_pago = pagoResult.insertId;

    const invoiceName = (invoiceData?.nombre || '').trim() || 'Estudiante Univalle';
    const invoiceNit = (invoiceData?.nit_ci || '').trim() || '0';
    const invoiceRazon = (invoiceData?.razon_social || '').trim() || invoiceName;
    const invoiceDireccion = (invoiceData?.direccion || '').trim() || null;
    const invoiceCorreo = (invoiceData?.correo_envio || '').trim() || null;

    await connection.query(
      `INSERT INTO univalle_tramites.facturas
       (id_pago, numero_factura, nombre_factura, nit_ci, razon_social, direccion, correo_envio, monto_total, subido_por_cajero, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EMITIDA')
       ON DUPLICATE KEY UPDATE
         nombre_factura = VALUES(nombre_factura),
         nit_ci = VALUES(nit_ci),
         razon_social = VALUES(razon_social),
         direccion = VALUES(direccion),
         correo_envio = VALUES(correo_envio),
         monto_total = VALUES(monto_total)`,
      [
        id_pago,
        `FACT-${String(id_pago).padStart(5, '0')}`,
        invoiceName,
        invoiceNit,
        invoiceRazon,
        invoiceDireccion,
        invoiceCorreo,
        totalPrice,
        userId,
      ]
    );

    // 7. Guardar Comprobante si existe
    if (voucherPath) {
      await connection.query(
        `INSERT INTO univalle_tramites.comprobantes_pago 
         (id_pago, ruta_archivo, nombre_archivo, estado_revision, subido_por) 
         VALUES (?, ?, ?, 'PENDIENTE', ?)`,
        [id_pago, voucherPath, voucherFile?.name || 'comprobante.png', userId]
      );
    }

    // 8. Crear Registro de QR
    await connection.query(
      `INSERT INTO univalle_tramites.pagos_qr (id_pago, codigo_qr, contenido_qr, estado_qr, fecha_expiracion) 
       VALUES (?, ?, ?, 'ACTIVO', DATE_ADD(NOW(), INTERVAL 1 DAY))`,
      [id_pago, `QR-${randomPago}`, `UNIVALLE|PAG|${totalPrice}`]
    );

    // 9. Registrar historial para cada trámite
    for (const tr of createdTramites) {
      await connection.query(
        `INSERT INTO univalle_tramites.historial_estados_tramite 
         (id_tramite, id_estado_nuevo, id_usuario_accion, motivo_cambio) 
         VALUES (?, ?, ?, ?)`,
        [tr.id, id_estado_actual, userId, 'Solicitud iniciada con pago conjunto']
      );
    }

    await connection.commit();
    return NextResponse.json({ 
      success: true, 
      tramites: createdTramites 
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Error en confirmar pago student:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
