import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesion cerrada correctamente",
  });

  clearAuthCookie(response);
  return response;
}
