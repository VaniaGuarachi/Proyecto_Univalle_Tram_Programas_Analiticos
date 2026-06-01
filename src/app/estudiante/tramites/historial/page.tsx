"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardList, Clock, Hourglass, Loader2, Search } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface TramiteHistorial {
  id_tramite: number;
  codigo_seguimiento: string;
  tramite: string;
  estado: string;
  estado_codigo: string;
  estado_descripcion: string;
  orden_flujo: number;
  es_final: number;
  es_bloqueante: number;
  fecha_solicitud: string;
  paso_actual: number;
  estado_pago: string | null;
  comprobante_estado: string | null;
  numero_factura: string | null;
  ruta_pdf_factura: string | null;
  estado_solvencia: string | null;
  fecha_solvencia: string | null;
  ultimo_movimiento: string | null;
  numero_documento: string | null;
  codigo_verificacion: string | null;
  ruta_pdf_firmado: string | null;
  responsable: string | null;
}

const TOTAL_STEPS = 6;

export default function HistorialTramites() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tramites, setTramites] = useState<TramiteHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      if (!user?.id_usuario) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/estudiante/tramites?userId=${user.id_usuario}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al cargar el historial");
        setTramites(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar el historial");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
    const interval = window.setInterval(fetchHistory, 8000);
    return () => window.clearInterval(interval);
  }, [user?.id_usuario]);

  const filtered = tramites.filter((t) =>
    t.tramite.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.codigo_seguimiento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const progressFor = (t: TramiteHistorial) => {
    if (t.estado_codigo === "TRAMITE_COMPLETADO" || t.es_final) return 100;
    const paso = Number(t.paso_actual || 1);
    return Math.max(8, Math.min(95, Math.round((paso / TOTAL_STEPS) * 100)));
  };

  const waitingRoleFor = (t: TramiteHistorial) => {
    if (t.estado_pago === "PENDIENTE" || t.comprobante_estado === "PENDIENTE" || t.estado_codigo === "COMPROBANTE_SUBIDO") return "Cajero";
    if (t.estado_solvencia === "PENDIENTE_VERIFICACION" || t.estado_codigo === "PENDIENTE_SOLVENCIA") return "Bibliotecario";
    if (t.estado_codigo === "APTO_TRAMITE" || t.estado_codigo === "SOLVENTE") return "Trámites";
    return "";
  };

  const openTramite = (t: TramiteHistorial) => {
    router.push(`/estudiante/tramites/seguimiento/${t.id_tramite}`);
  };

  if (loading && tramites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 py-20">
        <Loader2 className="animate-spin text-univalle-primary" size={42} />
        <p className="text-slate-500 font-medium">Cargando tu historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-52 h-52 bg-red-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Mis Trámites</h1>
          <p className="text-slate-500 font-medium text-base max-w-md">Historial completo y seguimiento en tiempo real de tus solicitudes académicas.</p>
        </div>
        <div className="relative z-10 bg-[#8C1B1B] text-white p-5 rounded-[1.75rem] shadow-2xl shadow-red-900/20 transform -rotate-6">
          <ClipboardList size={38} strokeWidth={1.5} />
        </div>
      </div>

      <div className="relative max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-300" />
        </div>
        <Input
          placeholder="¿Qué trámite buscas? Código o nombre..."
          className="pl-14 h-14 rounded-2xl bg-white border-2 border-slate-50 shadow-lg text-base focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5 transition-all outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error ? (
        <div className="bg-red-50 border-2 border-red-100 p-10 rounded-[2rem] text-center max-w-2xl mx-auto">
          <AlertCircle className="mx-auto text-red-500 mb-5" size={54} />
          <h2 className="text-2xl font-black text-red-900 mb-2">Algo salió mal</h2>
          <p className="text-red-700 font-medium mb-8 leading-relaxed opacity-70">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-red-900/20">Intentar de nuevo</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-slate-200" size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">No encontramos nada</h3>
          <p className="text-slate-400 font-medium text-base mb-10 max-w-xs mx-auto">Prueba con otros términos o inicia una nueva solicitud.</p>
          {!searchTerm && (
            <Button onClick={() => router.push("/estudiante/tramites")} className="bg-[#8C1B1B] hover:bg-black text-white px-10 h-14 rounded-2xl font-black uppercase text-xs tracking-[0.1em] shadow-2xl shadow-red-900/20">
              Iniciar Trámite Nuevo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filtered.map((t) => {
            const waitingRole = waitingRoleFor(t);
            const progress = progressFor(t);

            return (
              <div key={t.id_tramite} className="group relative" onClick={() => openTramite(t)}>
                <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-500 rounded-[2rem] overflow-hidden cursor-pointer group bg-white border-b-4 border-slate-50 hover:border-red-50">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row items-stretch">
                      <div
                        className={cn(
                          "w-full lg:w-3 flex items-center justify-center transition-all duration-500",
                          t.estado_codigo === "TRAMITE_COMPLETADO" ? "bg-emerald-500" :
                          t.estado_pago === "RECHAZADO" || t.estado_codigo === "CON_DEUDAS" ? "bg-red-500" :
                          waitingRole ? "bg-amber-500" : "bg-blue-500 group-hover:bg-[#8C1B1B]"
                        )}
                      />

                      <div className="flex-1 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-7">
                        <div className="flex items-center gap-6 min-w-0">
                          <div
                            className={cn(
                              "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg shrink-0",
                              t.estado_codigo === "TRAMITE_COMPLETADO" ? "bg-emerald-50 text-emerald-500 shadow-emerald-100" :
                              t.estado_pago === "RECHAZADO" || t.estado_codigo === "CON_DEUDAS" ? "bg-red-50 text-red-500 shadow-red-100" :
                              "bg-slate-50 text-slate-400 group-hover:bg-[#8C1B1B] group-hover:text-white group-hover:scale-110 group-hover:rotate-3 shadow-slate-100"
                            )}
                          >
                            <Clock size={30} strokeWidth={1.5} />
                          </div>

                          <div className="space-y-3 min-w-0">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-[#8C1B1B] uppercase tracking-[0.3em] opacity-60">ID: {t.codigo_seguimiento}</p>
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-[#8C1B1B] transition-colors">{t.tramite}</h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-slate-400">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                                <Search size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t.codigo_seguimiento}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <ClipboardList size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Solicitado el {new Date(t.fecha_solicitud).toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>

                            <div className="max-w-xl">
                              <div className="flex items-center justify-between gap-3 mb-1.5">
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                                  {waitingRole ? `Esperando aprobación de ${waitingRole}` : t.estado_descripcion || t.estado}
                                </p>
                                <p className="text-[11px] font-black text-slate-400">{progress}%</p>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    t.estado_pago === "RECHAZADO" || t.estado_codigo === "CON_DEUDAS" ? "bg-red-500" :
                                    waitingRole ? "bg-amber-500" : "bg-emerald-500"
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              {t.ultimo_movimiento && <p className="text-xs text-slate-400 font-semibold mt-2 line-clamp-1">{t.ultimo_movimiento}</p>}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-4 justify-center">
                          <div className="flex flex-col items-end gap-2">
                            {t.estado_codigo !== "SOLICITUD_CREADA" && (
                              <span
                                className={cn(
                                  "px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.14em] shadow-lg whitespace-nowrap",
                                  t.estado_codigo === "TRAMITE_COMPLETADO" ? "bg-emerald-500 text-white shadow-emerald-200" :
                                  t.estado_pago === "RECHAZADO" || t.estado_codigo === "CON_DEUDAS" ? "bg-red-500 text-white shadow-red-200" :
                                  waitingRole ? "bg-amber-500 text-white shadow-amber-200" :
                                  "bg-[#5E7693] text-white shadow-slate-200"
                                )}
                              >
                                {t.estado}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-slate-400">
                              {waitingRole ? <Hourglass size={14} /> : <CheckCircle2 size={14} />}
                              <p className="text-[10px] text-slate-900 font-black uppercase tracking-[0.2em] opacity-50">
                                Paso {Math.min(TOTAL_STEPS, Math.max(1, Number(t.paso_actual || 1)))} de {TOTAL_STEPS}
                              </p>
                            </div>
                          </div>
                          {t.codigo_verificacion && (
                            <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                onClick={() => router.push(`/estudiante/tramites/seguimiento/${t.id_tramite}/documento`)}
                                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[9px] tracking-widest"
                              >
                                Ver documento
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
