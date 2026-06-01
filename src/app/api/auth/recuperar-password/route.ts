import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 });
    }

    // 1. Buscar usuario por email
    const [userRows]: any = await pool.query(
      "SELECT id_usuario FROM univalle_tramites.usuarios WHERE correo_institucional = ? LIMIT 1",
      [email]
    );

    if (userRows.length === 0) {
      // Por seguridad, no decir si el email existe o no, pero aquí para el user lo haremos amigable
      return NextResponse.json({ error: "El correo electrónico no está registrado." }, { status: 404 });
    }

    const userId = userRows[0].id_usuario;

    // 2. Generar token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora de validez

    // 3. Guardar token
    await pool.query(
      `INSERT INTO univalle_tramites.tokens_recuperacion (id_usuario, token, fecha_expiracion) 
       VALUES (?, ?, ?)`,
      [userId, token, expires]
    );

    // 4. Simular envío de correo Outlook
    const recoveryLink = `http://localhost:3000/restablecer-password?token=${token}`;
    console.log(`[SIMULACIÓN OUTLOOK] Enviando a ${email}`);
    console.log(`Link de recuperación: ${recoveryLink}`);

    return NextResponse.json({ message: "Link de recuperación enviado." });

  } catch (error: any) {
    console.error("Error en recuperar-password API:", error);
    return NextResponse.json({ error: "Error en el servidor." }, { status: 500 });
  }
}
