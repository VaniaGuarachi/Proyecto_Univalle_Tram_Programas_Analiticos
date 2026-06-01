"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, LogIn, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Role, useAuthStore } from "@/store/useAuthStore";

const roleToPath: Record<string, string> = {
  ESTUDIANTE: "/estudiante/dashboard",
  CAJERO: "/cajero/dashboard",
  BIBLIOTECARIO: "/bibliotecario/dashboard",
  TRAMITES: "/tramites/v2",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al iniciar sesion");
        return;
      }

      const user = data.user || data;
      login({
        id_usuario: user.id_usuario,
        codigo_login: user.codigo_login,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol as Role,
      });

      const from = searchParams.get("from");
      const fallbackPath = roleToPath[user.rol] || "/estudiante/dashboard";
      const safeTarget =
        from && from.startsWith("/") && !from.startsWith("/login") && !from.startsWith("/auth/login")
          ? from
          : fallbackPath;
      router.push(safeTarget);
    } catch {
      setError("Error de conexion con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-custom flex min-h-[calc(100vh-21rem)] items-center justify-center py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl md:grid-cols-[1fr_0.85fr]">
        <div className="relative hidden min-h-[34rem] overflow-hidden md:block">
          <Image src="/img/carrusel2.jpg" alt="Campus Univalle" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-univalle-dark/92 via-univalle-primary/50 to-black/10" />
          <div className="absolute bottom-0 p-10 text-white">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-univalle-gold">
              Universidad Privada del Valle
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Portal de Trámites Estudiantiles
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/82">
              Inicia sesión para gestionar solicitudes académicas, pagos, solvencias y seguimiento documental.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center p-6 pt-20 sm:p-10 sm:pt-20">
          <Link
            href="/"
            aria-label="Volver al inicio"
            title="Volver al inicio"
            className="absolute left-6 top-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-univalle-primary/15 bg-white text-univalle-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-univalle-primary hover:text-white hover:shadow-md sm:left-8 sm:top-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="w-full max-w-md">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-univalle-primary to-univalle-dark text-white shadow-xl shadow-univalle-primary/20">
                <UserRound className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900">Iniciar Sesión</h2>
              <p className="mt-2 text-sm font-medium text-gray-500">Accede con tu código o correo institucional</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                  Código o Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    required
                    className="h-12 rounded-xl pl-12"
                    value={formData.username}
                    onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                    placeholder="EST001 o estudiante@univalle.edu"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    className="h-12 rounded-xl pl-12 pr-12"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-univalle-primary"
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300 text-univalle-primary focus:ring-univalle-primary" />
                  <span className="ml-2">Recordarme</span>
                </label>
                <Link href="/recuperar-password" className="font-bold text-univalle-primary hover:underline">
                  Recuperar contraseña
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Iniciar Sesión
                    <LogIn className="h-5 w-5" />
                  </span>
                )}
              </Button>

              <p className="text-center text-sm text-gray-600">
                ¿No tienes cuenta?{" "}
                <Link href="/registro" className="font-semibold text-univalle-primary hover:underline">
                  Regístrate aquí
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
