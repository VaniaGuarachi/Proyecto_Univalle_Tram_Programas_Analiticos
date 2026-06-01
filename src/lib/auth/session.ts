import { jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@/store/useAuthStore";

export const AUTH_COOKIE_NAME = "auth-token";

const SESSION_TTL_SECONDS = 60 * 60 * 24;

export type SessionClaims = {
  id: number;
  id_usuario: number;
  codigo_login: string;
  email: string;
  username: string;
  nombres: string;
  apellidos: string;
  rol: NonNullable<Role>;
  role_id: number;
  roleName: string;
  permissions: string[];
};

function getAuthSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-auth-secret-change-me";

  return new TextEncoder().encode(secret);
}

function normalizeClaims(payload: Record<string, unknown>): SessionClaims | null {
  const id = Number(payload.id ?? payload.id_usuario ?? 0);
  const codigoLogin = String(payload.codigo_login ?? payload.username ?? "");
  const email = String(payload.email ?? "");
  const rol = String(payload.rol ?? payload.roleName ?? "").toUpperCase() as NonNullable<Role>;
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.map((permission) => String(permission || "").trim()).filter(Boolean)
    : [];

  if (!id || !codigoLogin || !rol) return null;

  return {
    id,
    id_usuario: id,
    codigo_login: codigoLogin,
    email,
    username: String(payload.username ?? codigoLogin),
    nombres: String(payload.nombres ?? payload.firstName ?? ""),
    apellidos: String(payload.apellidos ?? payload.lastName ?? ""),
    rol,
    role_id: Number(payload.role_id ?? 0),
    roleName: String(payload.roleName ?? rol),
    permissions,
  };
}

export async function createSessionToken(claims: SessionClaims) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return normalizeClaims(payload);
  } catch {
    return null;
  }
}

export async function readSessionFromRequest(request: NextRequest): Promise<SessionClaims | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
