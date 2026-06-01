import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface TramiteRow extends RowDataPacket {
  id_tramite: number;
  codigo_seguimiento: string;
  fecha_solicitud: string;
  paso_actual: number;
  observaciones_generales: string | null;
  estudiante_nombre: string;
  codigo_estudiante: string;
  correo_institucional: string;
  carrera: string;
  semestre: number | null;
  tipo_tramite: string;
  detalle_tramite: string | null;
  estado_codigo: string;
  estado_nombre: string;
  codigo_verificacion: string | null;
  numero_documento: string | null;
  estado_documento: string | null;
  qr_verificacion: string | null;
  ruta_pdf_firmado: string | null;
}

interface FirmaRow extends RowDataPacket {
  id_firma_documento: number;
  nombre_firmante: string;
  cargo_firmante: string;
  unidad_firmante: string | null;
  tipo_firma: "DIGITAL" | "FISICA";
  ruta_archivo_firma: string | null;
  posicion_x: number | null;
  posicion_y: number | null;
  estado: string;
}

interface PdfRow extends RowDataPacket {
  id_documento: number;
  nombre_archivo: string;
  ruta_archivo: string;
  tamano_archivo: number | null;
  fecha_subida: string;
}

interface AutoridadRow extends RowDataPacket {
  id_personal: number;
  nombres: string;
  apellidos: string;
  cargo: string;
  unidad: string;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS univalle_tramites.documentos_adjuntos_emision (
      id_adjunto INT AUTO_INCREMENT PRIMARY KEY,
      id_tramite INT NOT NULL,
      nombre_archivo VARCHAR(255) NOT NULL,
      ruta_archivo VARCHAR(255) NOT NULL,
      tamano_archivo BIGINT,
      fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_adjuntos_emision_tramite FOREIGN KEY (id_tramite) REFERENCES univalle_tramites.tramites(id_tramite)
    ) ENGINE=InnoDB
  `);

  const [cols] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'firmas_documento'
       AND COLUMN_NAME IN ('posicion_x','posicion_y','unidad_firmante')`
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!names.has("posicion_x")) await pool.query("ALTER TABLE univalle_tramites.firmas_documento ADD COLUMN posicion_x INT NULL");
  if (!names.has("posicion_y")) await pool.query("ALTER TABLE univalle_tramites.firmas_documento ADD COLUMN posicion_y INT NULL");
  if (!names.has("unidad_firmante")) await pool.query("ALTER TABLE univalle_tramites.firmas_documento ADD COLUMN unidad_firmante VARCHAR(150) NULL");
}

function fileUrl(path: string | null) {
  if (!path) return null;
  return path.startsWith("/") ? path : `/uploads/${path}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const { id } = await params;

    const [rows] = await pool.query<TramiteRow[]>(
      `SELECT
        t.id_tramite,
        t.codigo_seguimiento,
        t.fecha_solicitud,
        t.paso_actual,
        t.observaciones_generales,
        CONCAT(u.nombres, ' ', u.apellidos) AS estudiante_nombre,
        e.codigo_estudiante,
        u.correo_institucional,
        c.nombre AS carrera,
        e.semestre,
        tt.nombre AS tipo_tramite,
        tt.descripcion AS detalle_tramite,
        et.codigo AS estado_codigo,
        et.nombre AS estado_nombre,
        de.codigo_verificacion,
        de.numero_documento,
        de.estado_documento,
        de.qr_verificacion,
        de.ruta_pdf_firmado
       FROM univalle_tramites.tramites t
       JOIN univalle_tramites.estudiantes e ON t.id_estudiante = e.id_estudiante
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
       JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
       JOIN univalle_tramites.estados_tramite et ON t.id_estado_actual = et.id_estado_tramite
       LEFT JOIN univalle_tramites.documentos_emitidos de ON de.id_tramite = t.id_tramite
       WHERE t.id_tramite = ?
       LIMIT 1`,
      [id]
    );

    if (!rows[0]) return NextResponse.json({ error: "Trámite no encontrado" }, { status: 404 });

    const [firmas] = await pool.query<FirmaRow[]>(
      `SELECT fd.*
       FROM univalle_tramites.firmas_documento fd
       JOIN univalle_tramites.documentos_emitidos de ON fd.id_documento_emitido = de.id_documento_emitido
       WHERE de.id_tramite = ?
       ORDER BY fd.id_firma_documento`,
      [id]
    );

    const [adjuntos] = await pool.query<PdfRow[]>(
      `SELECT id_adjunto AS id_documento, nombre_archivo, ruta_archivo, tamano_archivo, fecha_subida
       FROM univalle_tramites.documentos_adjuntos_emision
       WHERE id_tramite = ?
       ORDER BY fecha_subida DESC`,
      [id]
    );

    const [autoridades] = await pool.query<AutoridadRow[]>(
      `SELECT pa.id_personal, u.nombres, u.apellidos, pa.cargo, pa.unidad
       FROM univalle_tramites.personal_administrativo pa
       JOIN univalle_tramites.usuarios u ON pa.id_usuario = u.id_usuario
       WHERE pa.estado = 'ACTIVO' AND u.estado = 'ACTIVO'
       ORDER BY pa.unidad, pa.cargo`,
    );

    return NextResponse.json({
      tramite: { ...rows[0], ruta_pdf_firmado: fileUrl(rows[0].ruta_pdf_firmado) },
      firmas: firmas.map((f, i) => ({
        id: f.id_firma_documento,
        nombre: f.nombre_firmante,
        cargo: f.cargo_firmante,
        unidad: f.unidad_firmante,
        tipo: f.tipo_firma,
        imagen: fileUrl(f.ruta_archivo_firma),
        x: f.posicion_x ?? (i === 0 ? 90 : 380),
        y: f.posicion_y ?? 650,
        estado: f.estado,
      })),
      adjuntos: adjuntos.map((a) => ({ ...a, ruta_archivo: fileUrl(a.ruta_archivo) })),
      autoridades: autoridades.map((a) => ({
        id: a.id_personal,
        nombre: `${a.nombres} ${a.apellidos}`,
        cargo: a.cargo,
        unidad: a.unidad,
      })),
    });
  } catch (error) {
    console.error("Error panel emision:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}
