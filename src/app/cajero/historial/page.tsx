"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegistroHistorial {
  id_pago: number;
  id: string;
  amount: number;
  date: string;
  status: string;
  est_nombres: string;
  est_apellidos: string;
  code: string;
  tramite: string;
  factura_num: string | null;
  factura_pdf: string | null;
}

export default function CajeroHistorial() {
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState<RegistroHistorial[]>([]);

  const fetchHistorial = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cajero/historial');
      const data = await res.json();
      if (res.ok) {
        setHistorial(data.historial);
      }
    } catch (error) {
      console.error("Error fetching historial cajero:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  if (loading && historial.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      
      <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardContent className="p-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Historial de Pagos</h1>
              <p className="text-slate-500 text-[13px] mt-1">Registro completo de transacciones procesadas</p>
            </div>
            <Button className="mt-4 md:mt-0 bg-[#9B1C31] hover:bg-[#7D1D3F] text-white gap-2 font-semibold shadow-md rounded-xl h-11 px-6">
              <Download size={18} /> Exportar Excel
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">ID Pago</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">Estudiante</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">Código</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">Trámite</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">Monto</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">Estado</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase">Fecha</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-800 tracking-wide uppercase text-center">Factura</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-bold bg-slate-50/50">
                      No hay registros en el historial
                    </td>
                  </tr>
                ) : (
                  historial.map((row, idx) => (
                    <tr key={row.id_pago} className={cn(
                        "border-b border-slate-100 hover:bg-blue-50/30 transition-colors",
                        idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                    )}>
                      <td className="py-5 px-4 font-bold text-slate-800">{row.id}</td>
                      <td className="py-5 px-4 font-semibold text-slate-600 max-w-[180px] leading-tight">
                        {row.est_nombres} {row.est_apellidos}
                      </td>
                      <td className="py-5 px-4 text-slate-500 font-medium">{row.code}</td>
                      <td className="py-5 px-4 text-slate-600 max-w-[200px] leading-tight">{row.tramite}</td>
                      <td className="py-5 px-4 font-black text-[#00C853] whitespace-nowrap">Bs. {row.amount}</td>
                      <td className="py-5 px-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                          row.status === 'PAGADO' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                          row.status === 'RECHAZADO' ? "bg-red-100 text-red-700 border border-red-200" : ""
                        )}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-[13px] text-slate-500">
                        {row.date ? new Date(row.date).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}
                      </td>
                      <td className="py-5 px-4 text-center">
                        {row.factura_pdf ? (
                          <div className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 cursor-pointer text-xs font-bold transition-colors">
                            <FileText size={16} /> {row.factura_num || 'Ver PDF'}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-xs">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
