"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { 
  Clock, CheckCircle2, XCircle, Send, 
  FileText, DollarSign, BarChart3, Loader2 
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function CajeroDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { pendientes: 0, aceptados: 0, rechazados: 0, enviados: 0 },
    recaudado: 0,
    historialCount: 0
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cajero/dashboard');
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching cajero dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[26px] font-semibold text-slate-800 tracking-tight">Bienvenido Cajero</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow cursor-default">
          <CardContent className="p-6 flex items-center justify-between bg-white relative">
             <div className="relative z-10">
               <p className="text-xs font-semibold text-slate-500 mb-1">Pendientes</p>
               <p className="text-3xl font-black text-slate-800">{data.stats.pendientes}</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center relative z-10">
               <Clock size={24} />
             </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow cursor-default">
          <CardContent className="p-6 flex items-center justify-between bg-white relative">
             <div className="relative z-10">
               <p className="text-xs font-semibold text-slate-500 mb-1">Aceptados</p>
               <p className="text-3xl font-black text-slate-800">{data.stats.aceptados}</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center relative z-10">
               <CheckCircle2 size={24} />
             </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow cursor-default">
          <CardContent className="p-6 flex items-center justify-between bg-white relative">
             <div className="relative z-10">
               <p className="text-xs font-semibold text-slate-500 mb-1">Rechazados</p>
               <p className="text-3xl font-black text-slate-800">{data.stats.rechazados}</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center relative z-10">
               <XCircle size={24} />
             </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow cursor-default">
          <CardContent className="p-6 flex items-center justify-between bg-white relative">
             <div className="relative z-10">
               <p className="text-xs font-semibold text-slate-500 mb-1">En revisión</p>
               <p className="text-3xl font-black text-slate-800">{data.stats.enviados}</p>
             </div>
             <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center relative z-10">
               <Send size={24} />
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardContent className="p-8 md:p-10">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-black text-[#1E293B] tracking-tight">Gestión de Pagos</h2>
            <p className="text-slate-500 mt-1">Universidad del Valle de Bolivia</p>
          </div>

          <div className="bg-[#EFF6FF] border-l-4 border-blue-500 rounded-r-xl p-5 mb-10 flex gap-4">
            <div className="bg-blue-500 text-white p-2 rounded-lg shrink-0 mt-0.5">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 text-[15px] mb-1">Método de Pago: Código QR</h4>
              <p className="text-sm text-blue-800/80">Los estudiantes presentan comprobante de transferencia QR. Verifica la información antes de aprobar.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={() => router.push('/cajero/pagos')}
              className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-orange-200 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                   <DollarSign size={20} />
                 </div>
                 <h3 className="font-bold text-[17px] text-slate-800">Pagos</h3>
              </div>
              <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">Gestiona solicitudes y verifica comprobantes QR.</p>
              <div className="flex items-center gap-2">
                 <span className="text-orange-500 font-black text-xl">{data.stats.pendientes}</span>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">pendientes</span>
              </div>
            </div>

            <div 
              className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-[#00C853] text-white rounded-lg flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                   <BarChart3 size={20} />
                 </div>
                 <h3 className="font-bold text-[17px] text-slate-800">Recaudación</h3>
              </div>
              <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">Monto total recaudado por pagos confirmados.</p>
              <div className="flex items-center gap-2">
                 <span className="text-[#00C853] font-black text-xl">Bs. {data.recaudado}</span>
              </div>
            </div>

            <div 
              onClick={() => router.push('/cajero/historial')}
              className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-purple-500 text-white rounded-lg flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                   <FileText size={20} />
                 </div>
                 <h3 className="font-bold text-[17px] text-slate-800">Historial</h3>
              </div>
              <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">Registro de pagos procesados y facturas.</p>
              <div className="flex items-center gap-2">
                 <span className="text-purple-500 font-black text-xl">{data.historialCount}</span>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">procesados</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
