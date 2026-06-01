"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import PublicHeader from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuthStore } from "@/store/useAuthStore";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, login, logout } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  const isPublicShellRoute = ["/", "/login", "/auth/login"].includes(pathname || "");
  const isPrivateRoute =
    (pathname?.startsWith("/estudiante") ||
      pathname?.startsWith("/cajero") ||
      pathname?.startsWith("/bibliotecario") ||
      pathname?.startsWith("/tramites")) &&
    !pathname?.startsWith("/tramites/v2");
  const shouldRedirectToLogin = isPrivateRoute && _hasHydrated && sessionChecked && !isAuthenticated;
  const isCheckingPrivateSession = isPrivateRoute && (!_hasHydrated || !sessionChecked);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isPrivateRoute) {
      setSessionChecked(true);
      return;
    }

    let cancelled = false;
    setSessionChecked(false);

    const syncSession = async () => {
      try {
        const response = await fetch("/api/auth/verify", { credentials: "include" });
        if (cancelled) return;

        if (!response.ok) {
          logout();
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        if (data.user) {
          login({
            id_usuario: data.user.id_usuario,
            codigo_login: data.user.codigo_login,
            nombres: data.user.nombres,
            apellidos: data.user.apellidos,
            rol: data.user.rol,
          });
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, isPrivateRoute, login, logout]);

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(`/login?from=${encodeURIComponent(pathname || "/")}`);
    }
  }, [pathname, router, shouldRedirectToLogin]);

  if (isPublicShellRoute) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PublicHeader />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    );
  }

  if (isCheckingPrivateSession || shouldRedirectToLogin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F1F3FB] text-slate-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-univalle-primary/10 border-t-univalle-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
          {shouldRedirectToLogin ? "Redirigiendo..." : "Verificando sesion..."}
        </p>
      </div>
    );
  }

  const shouldShowPrivateLayout = isPrivateRoute && isAuthenticated;

  if (shouldShowPrivateLayout) {
    return (
      <div className="flex min-h-screen w-full bg-[#f4f6fa] subtle-grid">
        <div className="fixed hidden h-full w-64 shrink-0 bg-gradient-to-b from-[#61152d] via-univalle-primary to-[#35101d] text-white shadow-[18px_0_50px_rgba(53,16,29,0.18)] md:block">
          <Sidebar />
        </div>

        <div className="flex h-screen flex-1 flex-col overflow-hidden md:ml-64">
          <Header />
          <main className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-7 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return <main className="min-h-screen w-full bg-[#f4f6fa]">{children}</main>;
}
