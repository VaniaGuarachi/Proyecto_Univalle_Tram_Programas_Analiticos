"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  UserCircle,
  X,
} from "lucide-react";
import { useAuthStore, Role } from "@/store/useAuthStore";

const roleNavigation: Record<NonNullable<Role>, { name: string; href: string; icon: typeof Home }[]> = {
  ESTUDIANTE: [
    { name: "Inicio", href: "/estudiante/dashboard", icon: Home },
    { name: "Tramites", href: "/estudiante/tramites", icon: FileText },
    { name: "Historial", href: "/estudiante/tramites/historial", icon: ClipboardList },
    { name: "Documentos", href: "/estudiante/documentos", icon: BookOpen },
  ],
  CAJERO: [
    { name: "Dashboard", href: "/cajero/dashboard", icon: Home },
    { name: "Pagos", href: "/cajero/pagos", icon: ClipboardList },
  ],
  BIBLIOTECARIO: [
    { name: "Dashboard", href: "/bibliotecario/dashboard", icon: Home },
    { name: "Historial", href: "/bibliotecario/historial", icon: ClipboardList },
  ],
  TRAMITES: [
    { name: "Dashboard", href: "/tramites/v2", icon: Home },
    { name: "Historial", href: "/tramites/historial", icon: ClipboardList },
  ],
};

export default function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/verify", { credentials: "include" });
        if (!response.ok) return;

        const data = await response.json();
        if (data.user) {
          login({
            id_usuario: data.user.id_usuario,
            codigo_login: data.user.codigo_login,
            nombres: data.user.nombres,
            apellidos: data.user.apellidos,
            rol: data.user.rol as Role,
          });
        }
      } catch {
        // La cabecera publica puede mostrarse sin sesion.
      }
    };

    checkAuth();
  }, [login, pathname]);

  const userName = user ? `${user.nombres} ${user.apellidos}`.trim() : "Usuario";
  const initials = useMemo(() => {
    return userName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  }, [userName]);

  const navigation = isAuthenticated && user?.rol ? roleNavigation[user.rol] ?? [] : [];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-univalle-dark via-univalle-primary to-univalle-light text-white shadow-[0_18px_45px_rgba(53,16,29,0.18)]">
      <div className="bg-black/18 backdrop-blur-sm">
        <div className="container-custom flex items-center justify-end gap-5 py-1.5 text-xs font-semibold text-white/75">
          <button className="transition hover:text-white">Ayuda</button>
          <button className="transition hover:text-white">Soporte</button>
        </div>
      </div>

      <nav className="container-custom">
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Logo Univalle" width={52} height={52} className="rounded-2xl bg-white object-contain shadow-xl shadow-black/15" />
            <div className="hidden md:block">
              <h4 className="text-lg font-black tracking-tight">Sistema de Trámites</h4>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Univalle Bolivia</p>
            </div>
          </Link>

          <div className="hidden items-center justify-center gap-1 md:flex">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  href={item.href}
                  className={`group flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive ? "bg-white text-univalle-primary shadow-xl shadow-black/10" : "text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 opacity-80 transition-transform group-hover:scale-110" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-univalle-primary shadow-lg shadow-black/10">
                    {initials}
                  </div>
                  <span className="max-w-40 truncate text-sm">{userName}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200/70 bg-white/95 py-2 text-gray-700 shadow-2xl shadow-slate-900/15 backdrop-blur-xl">
                    <Link href={roleNavigation[user.rol as NonNullable<Role>]?.[0]?.href || "/"} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
                      <UserCircle className="h-4 w-4" />
                      Mi panel
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100">
                      <LogOut className="h-4 w-4" />
                      Cerrar sesion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="rounded-xl bg-white px-4 py-2 font-bold text-univalle-primary shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-gray-100">
                Iniciar sesion
              </Link>
            )}
          </div>

          <button onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-xl p-2 hover:bg-white/10 md:hidden" aria-label="Abrir menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-white/20 py-4 md:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.name}-${item.href}-mobile`}
                  href={item.href}
                  className="flex items-center gap-3 rounded px-4 py-3 hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {isAuthenticated ? (
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded px-4 py-3 text-left text-red-100 hover:bg-white/10">
                <LogOut className="h-5 w-5" />
                Cerrar sesion
              </button>
            ) : (
              <Link href="/login" className="block rounded px-4 py-3 font-semibold hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
                Iniciar sesion
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
