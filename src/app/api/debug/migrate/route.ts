import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    console.log("Iniciando migración desde API...");

    // 1. Añadir columnas a estudiantes
    await pool.query(`
      ALTER TABLE univalle_tramites.estudiantes 
      ADD COLUMN IF NOT EXISTS ruta_pdf_ci VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS ruta_pdf_certificado VARCHAR(255) NULL
    `);

    // 2. Crear tabla de tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS univalle_tramites.tokens_recuperacion (
        id_token INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        fecha_expiracion DATETIME NOT NULL,
        usado TINYINT(1) DEFAULT 0,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES univalle_tramites.usuarios(id_usuario)
      )
    `);

    return NextResponse.json({ message: "Esquema actualizado exitosamente" });
  } catch (error: any) {
    console.error("Error en migración:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
