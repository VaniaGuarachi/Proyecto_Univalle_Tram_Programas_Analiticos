import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 });
    }

    // 1. Validar token
    const [tokenRows]: any = await pool.query(
      `SELECT id_usuario, id_token FROM univalle_tramites.tokens_recuperacion 
       WHERE token = ? AND usado = 0 AND fecha_expiracion > NOW() 
       LIMIT 1`,
      [token]
    );

    if (tokenRows.length === 0) {
      return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
    }

    const userId = tokenRows[0].id_usuario;
    const tokenId = tokenRows[0].id_token;

    // 2. Transacción para actualizar password y marcar token
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Actualizar password
      await connection.query(
        "UPDATE univalle_tramites.usuarios SET password_hash = ? WHERE id_usuario = ?",
        [password, userId]
      );

      // Marcar token como usado
      await connection.query(
        "UPDATE univalle_tramites.tokens_recuperacion SET usado = 1 WHERE id_token = ?",
        [tokenId]
      );

      await connection.commit();
      return NextResponse.json({ message: "Contraseña restablecida correctamente." });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error("Error en restablecer-password API:", error);
    return NextResponse.json({ error: "Error en el servidor." }, { status: 500 });
  }
}
