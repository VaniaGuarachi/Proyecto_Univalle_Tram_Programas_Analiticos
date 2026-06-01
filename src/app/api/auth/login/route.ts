import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { createSessionToken, setAuthCookie } from "@/lib/auth/session";
import type { Role } from "@/store/useAuthStore";

interface LoginUserRow extends RowDataPacket {
  id_usuario: number;
  codigo_login: string;
  nombres: string;
  apellidos: string;
  correo_institucional: string;
  tipo_correo: string;
}

const roleIdByName: Record<string, number> = {
  TRAMITES: 1,
  ESTUDIANTE: 2,
  CAJERO: 3,
  BIBLIOTECARIO: 4,
};

function normalizeRole(tipoCorreo: string, codigoLogin: string): NonNullable<Role> {
  const tipo = tipoCorreo.toUpperCase();
  const codigo = codigoLogin.toLowerCase();

  if (tipo === "EST") return "ESTUDIANTE";
  if (codigo.startsWith("caj")) return "CAJERO";
  if (codigo.startsWith("bib")) return "BIBLIOTECARIO";
  if (codigo.startsWith("tram") || codigo.startsWith("admin")) return "TRAMITES";

  return "TRAMITES";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || body.email || "").trim();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Email/codigo y contrasena son requeridos" },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<LoginUserRow[]>(
      `SELECT id_usuario, codigo_login, nombres, apellidos, correo_institucional, tipo_correo
       FROM univalle_tramites.usuarios
       WHERE (codigo_login = ? OR correo_institucional = ?)
         AND password_hash = ?`,
      [username, username, password]
    );

    const logAuditoria = async (id_usuario: number | null, resultado: "EXITOSO" | "FALLIDO") => {
      try {
        await pool.query(
          `INSERT INTO univalle_tramites.auditoria_login
             (id_usuario, codigo_intentado, resultado, observacion)
           VALUES (?, ?, ?, ?)`,
          [
            id_usuario,
            username,
            resultado,
            resultado === "FALLIDO" ? "Credenciales incorrectas" : "Login exitoso",
          ]
        );
      } catch (error) {
        console.warn("No se pudo registrar auditoria_login:", error);
      }
    };

    if (!rows || rows.length === 0) {
      await logAuditoria(null, "FALLIDO");
      return NextResponse.json(
        { success: false, error: "Email/codigo o contrasena incorrectos" },
        { status: 401 }
      );
    }

    const user = rows[0];

    const rolNormalizado = normalizeRole(String(user.tipo_correo || ""), String(user.codigo_login || ""));
    const roleId = roleIdByName[rolNormalizado] || 0;

    await logAuditoria(user.id_usuario, "EXITOSO");

    const userPayload = {
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      username: user.codigo_login,
      codigo_login: user.codigo_login,
      email: user.correo_institucional,
      nombres: user.nombres,
      apellidos: user.apellidos,
      name: `${user.nombres} ${user.apellidos}`,
      rol: rolNormalizado,
      role_id: roleId,
      role_name: rolNormalizado,
      permissions: [] as string[],
    };

    const response = NextResponse.json({
      success: true,
      message: "Sesion iniciada correctamente",
      ...userPayload,
      user: userPayload,
    });

    const authToken = await createSessionToken({
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      codigo_login: user.codigo_login,
      email: user.correo_institucional,
      username: user.codigo_login,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rol: rolNormalizado,
      role_id: roleId,
      roleName: rolNormalizado,
      permissions: [],
    });

    setAuthCookie(response, authToken);
    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor. Verifica la conexion a la base de datos." },
      { status: 500 }
    );
  }
}
