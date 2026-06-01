import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

interface StudentRow extends RowDataPacket {
  id_estudiante: number;
  nombres: string;
  apellidos: string;
  codigo_login: string;
  correo_institucional: string;
  carrera: string;
  semestre: number | null;
  ruta_pdf_ci?: string | null;
  ruta_pdf_certificado?: string | null;
}

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

interface EmittedDocumentRow extends RowDataPacket {
  id_documento_emitido: number;
  numero_documento: string;
  tramite: string;
  fecha_emision: string;
  estado_documento: string;
  ruta_pdf_firmado: string | null;
}

function uploadPath(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith("/") ? path : `/uploads/${path}`;
}

async function ensureStudentDocumentColumns() {
  const [rows] = await pool.query<ColumnRow[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'estudiantes'
       AND COLUMN_NAME IN ('ruta_pdf_ci', 'ruta_pdf_certificado')`
  );
  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  if (!columns.has("ruta_pdf_ci")) {
    await pool.query("ALTER TABLE univalle_tramites.estudiantes ADD COLUMN ruta_pdf_ci VARCHAR(255) NULL");
  }
  if (!columns.has("ruta_pdf_certificado")) {
    await pool.query("ALTER TABLE univalle_tramites.estudiantes ADD COLUMN ruta_pdf_certificado VARCHAR(255) NULL");
  }
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "ID de usuario no proporcionado" }, { status: 400 });
    }

    await ensureStudentDocumentColumns();

    const [studentRows] = await pool.query<StudentRow[]>(
      `SELECT
        e.id_estudiante,
        u.nombres,
        u.apellidos,
        u.codigo_login,
        u.correo_institucional,
        c.nombre AS carrera,
        e.semestre,
        e.ruta_pdf_ci,
        e.ruta_pdf_certificado
       FROM univalle_tramites.estudiantes e
       JOIN univalle_tramites.usuarios u ON e.id_usuario = u.id_usuario
       JOIN univalle_tramites.carreras c ON e.id_carrera = c.id_carrera
       WHERE e.id_usuario = ?
       LIMIT 1`,
      [userId]
    );

    const student = studentRows[0];
    if (!student) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    const [emittedRows] = await pool.query<EmittedDocumentRow[]>(
      `SELECT
        de.id_documento_emitido,
        de.numero_documento,
        tt.nombre AS tramite,
        de.fecha_emision,
        de.estado_documento,
        de.ruta_pdf_firmado
       FROM univalle_tramites.documentos_emitidos de
       JOIN univalle_tramites.tramites t ON de.id_tramite = t.id_tramite
       JOIN univalle_tramites.tipos_tramite tt ON t.id_tipo_tramite = tt.id_tipo_tramite
       WHERE t.id_estudiante = ?
       ORDER BY de.fecha_emision DESC`,
      [student.id_estudiante]
    );

    return NextResponse.json({
      student: {
        nombres: student.nombres,
        apellidos: student.apellidos,
        codigo_login: student.codigo_login,
        correo_institucional: student.correo_institucional,
        carrera: student.carrera,
        semestre: student.semestre,
      },
      uploadedDocuments: [
        { label: "Carnet de identidad", url: uploadPath(student.ruta_pdf_ci) },
        { label: "Certificado de nacimiento", url: uploadPath(student.ruta_pdf_certificado) },
      ].filter((doc) => doc.url),
      emittedDocuments: emittedRows.map((doc) => ({
        ...doc,
        ruta_pdf_firmado: uploadPath(doc.ruta_pdf_firmado),
      })),
    });
  } catch (error) {
    console.error("Error en estudiante-documentos API:", error);
    return NextResponse.json({ error: "Error al obtener documentos." }, { status: 500 });
  }
}
