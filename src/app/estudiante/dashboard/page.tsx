"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Coffee, Printer, Plus, Info, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface DashboardData {
  student: {
    nombres: string;
    apellidos: string;
    carrera: string;
    semestre: number;
    estado_academico: string;
  };
  recentProcedures: {
    id_tramite: number;
    codigo_seguimiento: string;
    tramite: string;
    estado: string;
    fecha_solicitud: string;
  }[];
  pendingPaymentsCount: number;
}

export default function EstudianteDashboard() {
  const { user } = useAuthStore();
  const { addItem, items } = useCartStore();
  const router = useRouter();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      if (!user?.id_usuario) return;
      
      try {
        setLoading(true);
        const res = await fetch(`/api/estudiante/dashboard?userId=${user.id_usuario}`);
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.error || "Error al cargar dashboard");
        
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [user?.id_usuario]);

  const currentCartCount = items.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
        <p className="text-slate-500 font-medium">Cargando tus datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 p-8 rounded-2xl flex flex-col items-center gap-4 text-center">
        <AlertCircle className="text-red-500" size={48} />
        <h3 className="text-xl font-bold text-red-700">Ocurrió un error</h3>
        <p className="text-red-600 max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inicio Estudiante</h1>
          <p className="text-slate-500 mt-1">
            Bienvenido, {data?.student.nombres} {data?.student.apellidos}. Aquí tienes los servicios del campus.
          </p>
        </div>
        
        {currentCartCount > 0 && (
          <Button onClick={() => router.push('/estudiante/pago')} className="animate-in zoom-in-95">
            Ir a Pagar ({currentCartCount} items)
          </Button>
        )}
      </div>

      <div className="max-w-3xl mx-auto mt-10">
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Información Académica</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Carrera</span>
                  <p className="font-bold text-slate-800 text-lg leading-tight">{data?.student.carrera}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Semestre</span>
                    <p className="font-bold text-slate-800 text-lg">{data?.student.semestre}º</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${data?.student.estado_academico === 'REGULAR' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {data?.student.estado_academico}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                  <div className="bg-emerald-500 text-white p-2 rounded-xl">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <span className="text-sm font-black block">Matriculación Activa</span>
                    <span className="text-xs font-medium opacity-80">Habilitado para el semestre</span>
                  </div>
                </div>
                
                {data?.pendingPaymentsCount && data.pendingPaymentsCount > 0 ? (
                  <div className="flex items-center gap-4 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
                    <div className="bg-amber-500 text-white p-2 rounded-xl">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <span className="text-sm font-black block">{data.pendingPaymentsCount} Pago(s) Pendiente(s)</span>
                      <span className="text-xs font-medium opacity-80">Revisa tus obligaciones</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="pt-8 mt-8 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Accesos Directos</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 rounded-2xl border-slate-200 hover:border-univalle-primary hover:bg-slate-50 transition-all group" onClick={() => router.push('/estudiante/tramites')}>
                  <span className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><Plus size={24} /></span>
                  <span className="text-sm font-black text-slate-700">Nuevo Trámite</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 rounded-2xl border-slate-200 hover:border-univalle-primary hover:bg-slate-50 transition-all group" onClick={() => router.push('/estudiante/tramites/historial')}>
                  <span className="bg-purple-50 text-purple-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><Clock size={24} /></span>
                  <span className="text-sm font-black text-slate-700">Mi Historial</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 rounded-2xl border-slate-200 hover:border-univalle-primary hover:bg-slate-50 transition-all group" onClick={() => router.push('/estudiante/documentos')}>
                  <span className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></span>
                  <span className="text-sm font-black text-slate-700">Mis Documentos</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
