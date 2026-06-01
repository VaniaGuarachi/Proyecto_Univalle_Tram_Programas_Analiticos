"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  FileDown, FileCheck2, FileWarning, 
  ExternalLink, Loader2, ArrowRight,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TramiteRevision {
  id_tramite: number;
  codigo_seguimiento: string;
  tramite_nombre: string;
  nombres: string;
  apellidos: string;
  ci: string;
  extension_ci: string;
  nombre_documento: string;
  pdf_path: string | null;
  fecha_solicitud?: string;
}

export default function RevisionDocumental() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TramiteRevision | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [comentario, setComentario] = useState("");

  const fetchNextRevision = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tramites/revision');
      const result = await res.json();
      if (res.ok) {
        setData(result);
        setStatus('idle');
        setComentario("");
      }
    } catch (error) {
      console.error("Error fetching revision:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextRevision();
  }, []);

  const handleAction = async (accion: 'APROBAR' | 'OBSERVAR') => {
    if (!data) return;
    try {
      setStatus('loading');
      const res = await fetch('/api/tramites/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tramite: data.id_tramite,
          accion,
          comentario
        })
      });

      if (res.ok) {
        setStatus('done');
      }
    } catch (error) {
       console.error("Error processing action:", error);
       setStatus('idle');
    }
  };

  if (loading && !data) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <FileCheck2 size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">¡Todo al día!</h2>
          <p className="text-slate-500 mt-2 font-medium">No hay más trámites pendientes de revisión documental en este momento.</p>
        </div>
        <Button onClick={fetchNextRevision} variant="outline" className="gap-2">
           Actualizar Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Carga y Revisión Documental</h1>
        <p className="text-slate-500 mt-1">Revisa el adjunto final emitido antes de validarlo con firmas digitales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">

        <Card className="lg:col-span-8 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[700px] flex flex-col border-0">
          <CardHeader className="bg-slate-900/50 text-white border-b border-slate-700/50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2 text-slate-300 tracking-widest uppercase">
              <FileDown size={14} className="text-univalle-primary" /> {data.nombre_documento || 'Vista Previa del Documento'}
            </CardTitle>
            <div className="flex gap-2">
               {data.pdf_path && (
                  <Button variant="ghost" size="sm" className="hover:bg-slate-700 text-slate-300 h-8 gap-2 px-3 text-xs" onClick={() => window.open(data.pdf_path || '', '_blank')}>
                    <ExternalLink size={14} /> EXTENDER
                  </Button>
               )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex items-center justify-center bg-slate-800/50 relative overflow-hidden">
            {data.pdf_path ? (
               <iframe 
                src={`${data.pdf_path}#toolbar=0`} 
                className="w-full h-full border-0 grayscale-[0.2] transition-all hover:grayscale-0"
                title="Documento PDF"
               />
            ) : (
                <div className="aspect-[1/1.4] bg-white shadow-2xl mx-auto w-full max-w-2xl p-16 relative flex flex-col pointer-events-none ring-1 ring-white/20">
                    <div className="w-full flex justify-between border-b-2 border-slate-100 pb-6 mb-10">
                        <div className="text-lg font-black text-slate-800 tracking-tighter">UNIVERSIDAD DEL VALLE</div>
                        <div className="text-sm font-bold text-slate-400">BOLIVIA</div>
                    </div>
                    <div className="text-center font-serif text-3xl font-black mt-8 mb-12 text-slate-800 uppercase tracking-tight">{data.tramite_nombre}</div>
                    <div className="space-y-6 flex-1">
                        <div className="flex flex-col gap-2">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">CERTIFICA QUE EL ESTUDIANTE:</span>
                           <h4 className="text-xl font-bold text-slate-800">{data.nombres} {data.apellidos}</h4>
                        </div>
                        <div className="w-full h-4 bg-slate-50 rounded" />
                        <div className="w-11/12 h-4 bg-slate-50 rounded" />
                        <div className="w-full h-4 bg-slate-50 rounded" />
                        <div className="w-3/4 h-4 bg-slate-50 rounded" />
                    </div>
                    <div className="mt-auto pt-20 grid grid-cols-2 gap-12 border-t border-slate-100">
                        <div className="h-0.5 bg-slate-200 w-full" />
                        <div className="h-0.5 bg-slate-200 w-full" />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] text-6xl font-black text-slate-100/50 pointer-events-none uppercase tracking-tighter border-8 border-slate-100/50 p-8 rounded-[40px]">
                       DOCUMENTO DE PRUEBA
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-50">
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Control de Calidad</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              <div className="space-y-4">
                <div className="flex flex-col gap-1 border-b border-slate-50 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante:</span>
                  <span className="font-bold text-slate-900">{data.nombres} {data.apellidos}</span>
                  <span className="text-xs text-slate-500 font-medium">{data.ci} {data.extension_ci}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-50 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trámite Relacionado:</span>
                  <span className="font-bold text-slate-900">{data.codigo_seguimiento}</span>
                  <span className="text-xs text-slate-500 font-medium">{data.tramite_nombre}</span>
                  {data.fecha_solicitud && (
                    <span className="text-[11px] text-slate-400 font-bold mt-1">
                      Fecha: {new Date(data.fecha_solicitud).toLocaleString('es-BO', {
                        timeZone: 'America/La_Paz',
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </div>

              {status === 'idle' && (
                <div className="pt-4 space-y-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">Observaciones (Opcional):</p>
                  <textarea 
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Describe cualquier error o detalle a corregir..."
                    className="w-full min-h-[100px] p-4 text-sm bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-univalle-primary transition-all resize-none"
                  />
                  
                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full h-14 text-sm font-black gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 rounded-xl uppercase tracking-widest" 
                      onClick={() => handleAction('APROBAR')}
                    >
                      <FileCheck2 size={20} /> Aprobar Documento
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-14 text-sm font-black gap-2 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 rounded-xl uppercase tracking-widest" 
                      onClick={() => handleAction('OBSERVAR')}
                    >
                      <FileWarning size={20} /> Observar
                    </Button>
                  </div>
                </div>
              )}

              {status === 'loading' && (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center">
                  <Loader2 size={48} className="animate-spin mb-6 text-univalle-primary" />
                  <p className="font-bold text-sm uppercase tracking-widest">Procesando acción...</p>
                </div>
              )}

              {status === 'done' && (
                <div className="py-12 text-center text-emerald-600 animate-in zoom-in slide-in-from-bottom-5">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-slate-800">Documento Procesado</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2">La acción se registró en el historial del trámite.</p>
                  <Button variant="outline" className="mt-10 gap-2 h-12 px-6 rounded-xl font-bold uppercase text-xs tracking-widest" onClick={fetchNextRevision}>
                    Siguiente Documento <ArrowRight size={16} />
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
