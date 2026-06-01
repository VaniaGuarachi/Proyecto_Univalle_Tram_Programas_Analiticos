import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await readSessionFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        id_usuario: user.id_usuario,
        email: user.email,
        username: user.username,
        codigo_login: user.codigo_login,
        nombres: user.nombres,
        apellidos: user.apellidos,
        firstName: user.nombres,
        lastName: user.apellidos,
        name: `${user.nombres} ${user.apellidos}`.trim() || user.username,
        rol: user.rol,
        role_id: user.role_id,
        role_name: user.roleName,
        permissions: user.permissions,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Token invalido" },
      { status: 401 }
    );
  }
}
