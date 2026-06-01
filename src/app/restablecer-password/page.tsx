"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Suspense } from "react";

function RestablecerPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  if (!token) {
    return (
      <div className="p-10 text-center space-y-4">
        <AlertCircle size={48} className="text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Token inválido o expirado</h2>
        <p className="text-slate-500 text-sm">El enlace de recuperación no es válido.</p>
        <Button onClick={() => router.push("/login")} className="w-full h-12 bg-univalle-primary rounded-xl">Volver al login</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/restablecer-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al restablecer contraseña");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-10">
      {success ? (
        <div className="text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <CheckCircle2 size={40} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">¡Contraseña Cambiada!</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Tu contraseña ha sido restablecida con éxito. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Button onClick={() => router.push("/login")} className="w-full h-14 bg-univalle-primary hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-xl">
            IR AL LOGIN
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-slate-500 text-sm font-medium text-center mb-4">
            Ingresa tu nueva contraseña para acceder a tu cuenta de Univalle Trámites.
          </p>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 text-sm font-bold">
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 ml-1">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="h-14 pl-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-univalle-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 ml-1">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••" 
                className="h-14 pl-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-univalle-primary"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 bg-univalle-action hover:bg-univalle-hover text-white rounded-xl text-lg font-black tracking-wide shadow-xl transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "RESTABLECER CONTRASEÑA"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-univalle-primary p-8 text-white relative text-center">
          <h1 className="text-2xl font-black tracking-tight">Nueva Contraseña</h1>
        </div>
        <Suspense fallback={<div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>}>
          <RestablecerPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
