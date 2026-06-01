import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";

const protectedRoutes = [
  "/estudiante",
  "/cajero",
  "/bibliotecario",
  "/tramites",
];

const roleHome: Record<string, string> = {
  ESTUDIANTE: "/estudiante/dashboard",
  CAJERO: "/cajero/dashboard",
  BIBLIOTECARIO: "/bibliotecario/dashboard",
  TRAMITES: "/tramites/v2",
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const session = await readSessionFromRequest(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/estudiante") && session.rol !== "ESTUDIANTE") {
    return NextResponse.redirect(new URL(roleHome[session.rol] || "/", request.url));
  }

  if (pathname.startsWith("/cajero") && session.rol !== "CAJERO") {
    return NextResponse.redirect(new URL(roleHome[session.rol] || "/", request.url));
  }

  if (pathname.startsWith("/bibliotecario") && session.rol !== "BIBLIOTECARIO") {
    return NextResponse.redirect(new URL(roleHome[session.rol] || "/", request.url));
  }

  if (pathname.startsWith("/tramites") && session.rol !== "TRAMITES") {
    return NextResponse.redirect(new URL(roleHome[session.rol] || "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|uploads).*)"],
};
