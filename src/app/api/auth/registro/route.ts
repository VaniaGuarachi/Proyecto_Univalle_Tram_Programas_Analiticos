import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

interface IdRow extends RowDataPacket {
  id_usuario?: number;
  id_rol?: number;
  COLUMN_NAME?: string;
}

async function ensureStudentDocumentColumns() {
  const [rows] = await pool.query<IdRow[]>(
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

async function saveOptionalFile(file: File | null, prefix: string, username: string) {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Solo se permiten archivos PDF, JPG o PNG.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Los archivos no deben superar los 5MB.");
  }

  const extension = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "registros");
  const fileName = `${Date.now()}_${prefix}_${username}${extension}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `registros/${fileName}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const nombres = String(formData.get("nombres") || "").trim();
    const apellidos = String(formData.get("apellidos") || "").trim();
    const username = String(formData.get("username") || "").trim().toUpperCase();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const ci = String(formData.get("ci") || username).trim();
    const ciPdf = formData.get("ciPdf") instanceof File ? formData.get("ciPdf") as File : null;
    const certificadoPdf = formData.get("certificadoPdf") instanceof File ? formData.get("certificadoPdf") as File : null;

    if (!nombres || !apellidos || !username || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Formato de correo electrónico inválido." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }

    await ensureStudentDocumentColumns();

    const [existing] = await pool.query<IdRow[]>(
      "SELECT id_usuario FROM univalle_tramites.usuarios WHERE codigo_login = ? OR correo_institucional = ? LIMIT 1",
      [username, email]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "El usuario o correo ya está registrado." }, { status: 400 });
    }

    const ciPath = await saveOptionalFile(ciPdf, "ci", username);
    const certPath = await saveOptionalFile(certificadoPdf, "cert", username);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [userRes] = await connection.query<ResultSetHeader>(
        `INSERT INTO univalle_tramites.usuarios
         (codigo_login, correo_institucional, password_hash, nombres, apellidos, ci, tipo_correo, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'EST', 'ACTIVO')`,
        [username, email, password, nombres, apellidos, ci || username]
      );

      const [roleRows] = await connection.query<IdRow[]>(
        "SELECT id_rol FROM univalle_tramites.roles WHERE nombre = 'ESTUDIANTE' LIMIT 1"
      );
      const roleId = roleRows[0]?.id_rol || 1;

      await connection.query(
        "INSERT INTO univalle_tramites.usuario_roles (id_usuario, id_rol, rol_principal) VALUES (?, ?, 1)",
        [userRes.insertId, roleId]
      );

      await connection.query(
        `INSERT INTO univalle_tramites.estudiantes
         (id_usuario, codigo_estudiante, id_carrera, estado, ruta_pdf_ci, ruta_pdf_certificado)
         VALUES (?, ?, 1, 'ACTIVO', ?, ?)`,
        [userRes.insertId, username, ciPath, certPath]
      );

      await connection.commit();
      return NextResponse.json({ message: "Registro completado exitosamente" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error en registro API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar el registro." },
      { status: 500 }
    );
  }
}
