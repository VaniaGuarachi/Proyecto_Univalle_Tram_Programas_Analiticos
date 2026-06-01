"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Mail, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/recuperar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al solicitar recuperación");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-univalle-primary p-8 text-white relative text-center">
          <button 
            onClick={() => router.push("/login")}
            className="absolute left-6 top-8 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tight">Recuperar Contraseña</h1>
        </div>

        <div className="p-10">
          {success ? (
            <div className="text-center space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Mail size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">¡Correo Enviado!</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Hemos enviado un enlace de recuperación a tu correo <strong>{email}</strong>. Por favor revisa tu bandeja de entrada de Outlook.
              </p>
              <Button onClick={() => router.push("/login")} className="w-full h-12 bg-univalle-primary hover:bg-slate-800 text-white rounded-xl font-bold">
                VOLVER AL LOGIN
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-slate-500 text-sm font-medium text-center mb-4">
                Ingresa tu correo institucional y te enviaremos un link para restablecer tu contraseña.
              </p>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={20} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 ml-1">Correo Institucional</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="estudiante@univalle.edu" 
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
                {isLoading ? <Loader2 className="animate-spin" /> : "ENVIAR LINK"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
