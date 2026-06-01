import { NextResponse } from 'next/server';
// Asegúrate de que la ruta de importación coincida con donde guardaste db.ts
import { pool } from '@/lib/db'; 

export async function GET() {
  try {
    // Hacemos una consulta a la tabla Usuarios que vi en tu captura
    const [rows] = await pool.query('SELECT usuario_id, codigo_universitario, nombres, apellidos, rol_id FROM Usuarios LIMIT 10');
    
    // Devolvemos los datos en formato JSON al frontend
    return NextResponse.json(rows);

  } catch (error) {
    console.error("Error de base de datos:", error);
    return NextResponse.json(
      { error: "No se pudo conectar a la base de datos o ejecutar la consulta." }, 
      { status: 500 }
    );
  }
}
