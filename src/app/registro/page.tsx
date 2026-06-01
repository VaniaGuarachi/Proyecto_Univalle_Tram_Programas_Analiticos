"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Loader2, User, Mail, Lock, 
  FileText, CheckCircle2, ChevronLeft, 
  ChevronRight, AlertCircle, UploadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Cuenta", "Documentos", "Finalizar"];

export default function RegistroPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    ci: "",
  });

  const [files, setFiles] = useState<{
    ciPdf: File | null;
    certificadoPdf: File | null;
  }>({
    ciPdf: null,
    certificadoPdf: null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, name: "ciPdf" | "certificadoPdf") => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [name]: e.target.files[0] });
    }
  };

  const nextStep = () => {
    if (currentStep === 0) {
      if (!formData.nombres || !formData.apellidos || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setError("Por favor completa todos los campos obligatorios.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }
    setError("");
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setError("");
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      if (files.ciPdf) data.append("ciPdf", files.ciPdf);
      if (files.certificadoPdf) data.append("certificadoPdf", files.certificadoPdf);

      const res = await fetch("/api/auth/registro", {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Error al registrar la cuenta");
      }

      setSuccess(true);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Progress Header */}
        <div className="bg-univalle-primary p-8 text-white relative">
           <button 
            onClick={() => router.push("/login")}
            className="absolute left-6 top-8 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-black tracking-tight mb-6">Crear Cuenta Estudiante</h1>
            <div className="flex items-center w-full max-w-md gap-4">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    idx === currentStep ? "bg-white text-univalle-primary ring-4 ring-white/20" : 
                    idx < currentStep ? "bg-emerald-400 text-white" : "bg-white/20 text-white/40"
                  )}>
                    {idx < currentStep ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase font-black tracking-widest",
                    idx === currentStep ? "text-white" : "text-white/40"
                  )}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3 text-sm font-bold animate-in shake duration-300">
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </div>
          )}

          {currentStep === 0 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1">Nombres</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input name="nombres" value={formData.nombres} onChange={handleInputChange} placeholder="Tus nombres" className="h-12 pl-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1">Apellidos</label>
                  <Input name="apellidos" value={formData.apellidos} onChange={handleInputChange} placeholder="Tus apellidos" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 ml-1">Usuario (Código)</label>
                <Input name="username" value={formData.username} onChange={handleInputChange} placeholder="Ej: EST001" className="h-12 rounded-xl bg-slate-50 border-slate-200 uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 ml-1">Correo Institucional</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input name="email" value={formData.email} onChange={handleInputChange} placeholder="estudiante@univalle.edu" className="h-12 pl-11 rounded-xl bg-slate-50 border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="h-12 pl-11 rounded-xl bg-slate-50 border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1">Confirmar Contraseña</label>
                  <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                </div>
              </div>

              <Button onClick={nextStep} className="w-full h-14 bg-univalle-action hover:bg-univalle-hover text-white rounded-2xl text-lg font-black tracking-widest mt-4">
                SIGUIENTE PASO <ChevronRight className="ml-2" />
              </Button>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <p className="text-slate-500 font-bold mb-2">Verificación de Identidad</p>
                <p className="text-xs text-slate-400">Puedes subir estos documentos ahora o continuar sin archivos.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CI Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <FileText size={18} className="text-univalle-primary" /> C.I. (Anverso y Reverso)
                  </label>
                  <label className={cn(
                    "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all",
                    files.ciPdf ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200 hover:border-univalle-primary/40 hover:bg-slate-100"
                  )}>
                    {files.ciPdf ? (
                      <div className="text-center">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{files.ciPdf.name}</p>
                      </div>
                    ) : (
                      <div className="text-center px-4">
                        <UploadCloud size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">Haz clic para subir C.I.</p>
                        <p className="text-[10px] text-slate-400 mt-1">PDF, JPG o PNG</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png" onChange={(e) => handleFileChange(e, "ciPdf")} />
                  </label>
                </div>

                {/* Certificado Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <FileText size={18} className="text-univalle-primary" /> Certificado de Nacimiento
                  </label>
                  <label className={cn(
                    "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all",
                    files.certificadoPdf ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200 hover:border-univalle-primary/40 hover:bg-slate-100"
                  )}>
                    {files.certificadoPdf ? (
                      <div className="text-center">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-emerald-700 truncate max-w-[150px]">{files.certificadoPdf.name}</p>
                      </div>
                    ) : (
                      <div className="text-center px-4">
                        <UploadCloud size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">Haz clic para subir Certificado</p>
                        <p className="text-[10px] text-slate-400 mt-1">PDF, JPG o PNG</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png" onChange={(e) => handleFileChange(e, "certificadoPdf")} />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={prevStep} variant="ghost" className="h-14 flex-1 rounded-2xl border-2 border-slate-100 font-bold text-slate-500">
                  VOLVER
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className="h-14 flex-[2] bg-univalle-action hover:bg-univalle-hover text-white rounded-2xl text-lg font-black tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "FINALIZAR REGISTRO"}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && success && (
            <div className="py-12 text-center animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200">
                <CheckCircle2 size={48} strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">¡Registro Exitoso!</h2>
              <p className="text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
                Tu cuenta fue registrada correctamente. Si subiste documentos, quedaron asociados a tu perfil.
              </p>
             <div className="bg-slate-50 rounded-2xl p-6 mb-10 border border-slate-100 max-w-sm mx-auto text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próximos pasos</p>
                <ul className="text-sm text-slate-600 space-y-2 font-bold">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Solicitud recibida
                  </li>
                  <li className="flex items-center gap-2 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Revisión de documentos
                  </li>
                  <li className="flex items-center gap-2 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Activación por correo
                  </li>
                </ul>
             </div>
              <Button onClick={() => router.push("/login")} className="w-full h-14 bg-univalle-primary hover:bg-slate-800 text-white rounded-2xl text-lg font-black tracking-widest">
                VOLVER AL INICIO
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
