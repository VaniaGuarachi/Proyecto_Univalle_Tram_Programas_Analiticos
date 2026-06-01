import { pool } from './src/lib/db';

async function updateSchema() {
  try {
    console.log("Actualizando esquema para registro y recuperación...");

    // 1. Añadir columnas a estudiantes
    await pool.query(`
      ALTER TABLE univalle_tramites.estudiantes 
      ADD COLUMN IF NOT EXISTS ruta_pdf_ci VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS ruta_pdf_certificado VARCHAR(255) NULL
    `);
    console.log("Columnas añadidas a estudiantes.");

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
    console.log("Tabla tokens_recuperacion creada.");

    console.log("Esquema actualizado exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error actualizando esquema:", error);
    process.exit(1);
  }
}

updateSchema();
