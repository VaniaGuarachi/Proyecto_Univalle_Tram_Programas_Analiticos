"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle2, Loader2 } from "lucide-react";

interface HistorialItem {
  id_tramite:        number;
  codigo_seguimiento: string;
  fecha_solicitud:   string;
  nombres:           string;
  apellidos:         string;
  codigo_estudiante: string;
  carrera:           string | null;
  tipo_tramite:      string;
  estado:            string;
  estado_codigo:     string;
}

export default function TramitesHistorial() {
  const [loading, setLoading]     = useState(true);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch('/api/tramites/historial');
        const data = await res.json();
        setHistorial(data.historial || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch_();
  }, []);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading)
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-univalle-primary" size={40} /></div>;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">

      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trámites</h1>
      </div>

      <Card className="border border-slate-100 shadow-sm bg-white">
        <CardContent className="p-6">
          {/* Encabezado del card */}
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <h2 className="text-base font-black text-slate-800">Historial de Trámites Completados</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6 ml-8">Registro completo de todos los trámites finalizados</p>

          {historial.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto text-slate-200 mb-3" size={40} />
              <p className="text-sm font-semibold text-slate-400">No hay trámites completados aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Estudiante', 'Código', 'Carrera', 'Tipo de Trámite', 'Fecha', 'Estado'].map(h => (
                      <th key={h} className="pb-3 pr-4 text-xs font-bold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item) => (
                    <tr key={item.id_tramite} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-slate-800 whitespace-nowrap">
                        {item.nombres} {item.apellidos}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 font-mono text-xs">
                        {item.codigo_estudiante}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                        {item.carrera ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {item.tipo_tramite}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap text-xs">
                        {fmtDate(item.fecha_solicitud)}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2 size={11} /> Completado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
