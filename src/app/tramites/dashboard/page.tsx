"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Users, Clock, CheckCircle2, Calendar,
  Search, Filter, FileText, Loader2,
  X, CreditCard, BookOpen, ClipboardCheck,
  AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";

/* ─────────────────── Tipos ─────────────────── */

interface Carrera  { id_carrera: number; nombre: string; }

interface EstudianteItem {
  id_estudiante:    number;
  codigo_estudiante: string;
  nombres:          string;
  apellidos:        string;
  carrera:          string | null;
  total:            number;
  pendientes:       number;
  completados:      number;
  ultima_actividad: string | null;
}

interface Stats {
  totalEstudiantes: number;
  pendientes:       number;
  completados:      number;
  actividadHoy:     number;
}

type PasoTipo = 'pending' | 'in-progress' | 'done' | 'rejected';

interface Paso {
  id:      string;
  titulo:  string;
  rol:     string;
  tipo:    PasoTipo;
  fecha:   string | null;
  detalle: string;
}

interface TramiteTimeline {
  id_tramite:         number;
  codigo_seguimiento: string;
  nombre_tramite:     string;
  costo_base:         number;
  fecha_solicitud:    string;
  fecha_resolucion:   string | null;
  estado_actual:      { codigo: string; nombre: string; es_final: boolean };
  pasos:              Paso[];
}

/* ─────────────────── Helpers ─────────────────── */

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "long", year: "numeric" });
};

const fmtDateTime = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " ·");
};

/* Config visual por tipo de paso */
const pasoConfig: Record<PasoTipo, { dot: string; label: string; badge: string; connector: string }> = {
  done:        { dot: "bg-emerald-500 ring-4 ring-emerald-100", label: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", connector: "bg-emerald-400" },
  "in-progress":{ dot: "bg-amber-400 ring-4 ring-amber-100 animate-pulse", label: "text-amber-700", badge: "bg-amber-50 text-amber-700 border-amber-200", connector: "bg-slate-200" },
  rejected:    { dot: "bg-red-500 ring-4 ring-red-100", label: "text-red-700", badge: "bg-red-50 text-red-700 border-red-200", connector: "bg-slate-200" },
  pending:     { dot: "bg-slate-200 ring-4 ring-slate-100", label: "text-slate-400", badge: "bg-slate-50 text-slate-400 border-slate-200", connector: "bg-slate-200" },
};

const pasoIcono: Record<string, React.ReactNode> = {
  pago:       <CreditCard    size={14} />,
  biblioteca: <BookOpen      size={14} />,
  tramites:   <ClipboardCheck size={14} />,
};

const pasoTipoLabel: Record<PasoTipo, string> = {
  done:          "Completado",
  "in-progress": "En Proceso",
  rejected:      "Rechazado",
  pending:       "Pendiente",
};

/* ─────────────────── Componente Línea del Tiempo ─────────────────── */

function TramiteCard({ tramite }: { tramite: TramiteTimeline }) {
  const [expanded, setExpanded] = useState(false);
  const pasoActivo = tramite.pasos.findIndex(p => p.tipo === "in-progress" || p.tipo === "rejected");
  const progresoIdx = tramite.pasos.filter(p => p.tipo === "done").length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Cabecera compacta */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          {/* Progress pills */}
          <div className="flex items-center gap-1">
            {tramite.pasos.map((p, i) => (
              <div
                key={p.id}
                title={p.titulo}
                className={`w-3 h-3 rounded-full transition-all ${pasoConfig[p.tipo].dot.split(" ")[0]}`}
              />
            ))}
          </div>

          <div>
            <p className="font-black text-slate-800 text-sm leading-tight">{tramite.nombre_tramite}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{tramite.codigo_seguimiento}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Estado general */}
          <span className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-wider
            ${tramite.estado_actual.es_final
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : progresoIdx === 0
              ? "bg-slate-50 text-slate-500 border-slate-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
            {tramite.estado_actual.nombre}
          </span>
          <span className="text-xs text-slate-400 font-medium hidden sm:block">
            {fmtDate(tramite.fecha_solicitud)}
          </span>
          <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Timeline expandida */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-slate-50 pt-5 animate-in slide-in-from-top-2 duration-200">

          {/* Barra de progreso */}
          <div className="flex items-center mb-6">
            {tramite.pasos.map((paso, i) => {
              const cfg = pasoConfig[paso.tipo];
              const isLast = i === tramite.pasos.length - 1;
              return (
                <div key={paso.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${pasoConfig[paso.tipo].dot.split(" ")[0]}
                      ${paso.tipo === "done" ? "bg-emerald-500" : paso.tipo === "in-progress" ? "bg-amber-400" : paso.tipo === "rejected" ? "bg-red-500" : "bg-slate-200"}`}>
                      {paso.tipo === "done" ? "✓" : paso.tipo === "rejected" ? "✕" : i + 1}
                    </div>
                  </div>
                  {!isLast && (
                    <div className={`h-1 flex-1 mx-2 rounded-full ${paso.tipo === "done" ? "bg-emerald-400" : "bg-slate-100"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Detalle de cada paso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tramite.pasos.map((paso) => {
              const cfg = pasoConfig[paso.tipo];
              return (
                <div
                  key={paso.id}
                  className={`rounded-xl border p-4 transition-all ${cfg.badge} ${paso.tipo === "in-progress" ? "ring-2 ring-amber-300/50" : ""}`}
                >
                  {/* Ícono + título */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${paso.tipo === "done" ? "bg-emerald-100 text-emerald-600" : paso.tipo === "rejected" ? "bg-red-100 text-red-600" : paso.tipo === "in-progress" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
                      {pasoIcono[paso.id]}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{paso.rol}</p>
                      <p className="text-xs font-bold leading-none">{paso.titulo}</p>
                    </div>
                  </div>

                  {/* Badge de estado */}
                  <div className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border mb-2 ${cfg.badge}`}>
                    {paso.tipo === "done" && "✓ "}
                    {paso.tipo === "rejected" && "✕ "}
                    {paso.tipo === "in-progress" && "⏳ "}
                    {pasoTipoLabel[paso.tipo]}
                  </div>

                  {/* Fecha */}
                  {paso.fecha && (
                    <p className="text-[10px] font-medium opacity-70 mt-1">
                      📅 {fmtDateTime(paso.fecha)}
                    </p>
                  )}

                  {/* Detalle */}
                  <p className="text-[11px] font-medium opacity-80 mt-1 leading-snug">
                    {paso.detalle}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Info general abajo */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Solicitud: <span className="font-semibold text-slate-600">{fmtDateTime(tramite.fecha_solicitud)}</span>
            </p>
            <p className="text-xs font-black text-slate-700">
              Bs. {tramite.costo_base.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Modal de Timeline por Estudiante ─────────────────── */

function TimelineModal({
  estudiante,
  onClose,
}: {
  estudiante: EstudianteItem;
  onClose: () => void;
}) {
  const [loading, setLoading]   = useState(true);
  const [tramites, setTramites] = useState<TramiteTimeline[]>([]);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tramites/timeline?id_estudiante=${estudiante.id_estudiante}`);
        const data = await res.json();
        if (res.ok) setTramites(data.tramites ?? []);
        else        setError(data.error ?? "Error al cargar");
      } catch (e) {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [estudiante.id_estudiante]);

  // Resumen del progreso global
  const totalPasos   = tramites.reduce((a, t) => a + t.pasos.length, 0);
  const pasosCompletados = tramites.reduce((a, t) => a + t.pasos.filter(p => p.tipo === "done").length, 0);
  const pct = totalPasos > 0 ? Math.round((pasosCompletados / totalPasos) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-univalle-primary/10 flex items-center justify-center text-univalle-primary font-black text-sm shrink-0">
                {estudiante.nombres.charAt(0)}{estudiante.apellidos.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">
                  {estudiante.nombres} {estudiante.apellidos}
                </h2>
                <p className="text-xs text-slate-400 font-mono">{estudiante.codigo_estudiante} · {estudiante.carrera ?? "Sin carrera"}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all ml-4 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Leyenda + Barra de progreso global */}
        {!loading && tramites.length > 0 && (
          <div className="px-8 pt-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Progreso general</p>
              <p className="text-xs font-black text-slate-700">{pasosCompletados}/{totalPasos} pasos completados</p>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-univalle-primary to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Leyenda de flujo */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { label: "Cajero", icon: <CreditCard size={11} />, color: "bg-blue-50 text-blue-600 border-blue-200" },
                { label: "Biblioteca", icon: <BookOpen size={11} />, color: "bg-purple-50 text-purple-600 border-purple-200" },
                { label: "Trámites", icon: <ClipboardCheck size={11} />, color: "bg-slate-50 text-slate-600 border-slate-200" },
              ].map(step => (
                <span key={step.label} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${step.color}`}>
                  {step.icon} {step.label}
                </span>
              ))}
              <span className="text-[10px] text-slate-400 ml-1">→ flujo de validación</span>
            </div>
          </div>
        )}

        {/* Body – lista de trámites */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 size={40} className="animate-spin text-univalle-primary" />
              <p className="text-sm font-semibold text-slate-400">Cargando línea del tiempo...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertTriangle className="mx-auto text-red-400 mb-3" size={36} />
              <p className="text-sm font-semibold text-red-500">{error}</p>
            </div>
          ) : tramites.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-sm font-semibold text-slate-400">No hay trámites registrados para este estudiante.</p>
            </div>
          ) : (
            tramites.map(t => <TramiteCard key={t.id_tramite} tramite={t} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {tramites.length} trámite{tramites.length !== 1 ? "s" : ""} encontrado{tramites.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Dashboard Principal ─────────────────── */

export default function TramitesDashboard() {
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState<Stats>({ totalEstudiantes: 0, pendientes: 0, completados: 0, actividadHoy: 0 });
  const [carreras, setCarreras]           = useState<Carrera[]>([]);
  const [estudiantes, setEstudiantes]     = useState<EstudianteItem[]>([]);
  const [search, setSearch]               = useState("");
  const [carreraFilter, setCarreraFilter] = useState("");
  const [searchInput, setSearchInput]     = useState("");

  // Modal de timeline
  const [selectedEst, setSelectedEst] = useState<EstudianteItem | null>(null);

  const fetchData = useCallback(async (s: string, c: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (s) params.set("search",  s);
      if (c) params.set("carrera", c);
      const res  = await fetch(`/api/tramites/dashboard?${params}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setCarreras(data.carreras);
        setEstudiantes(data.estudiantes);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(search, carreraFilter); }, [search, carreraFilter, fetchData]);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fmtDateShort = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div className="space-y-6 pb-10 animate-in fade-in duration-500">

        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trámites</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión y seguimiento del flujo de trámites estudiantiles</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: "Total Estudiantes",    value: stats.totalEstudiantes, sub: "Con trámites activos",  icon: <Users size={22} />,        iconBg: "bg-purple-50 text-purple-500", subColor: "text-slate-500" },
            { label: "Trámites Pendientes",  value: stats.pendientes,       sub: "Requieren atención",    icon: <Clock size={22} />,        iconBg: "bg-amber-50 text-amber-500",  subColor: "text-amber-500" },
            { label: "Completados",          value: stats.completados,      sub: "Últimos 30 días",       icon: <CheckCircle2 size={22} />, iconBg: "bg-emerald-50 text-emerald-500", subColor: "text-emerald-500" },
            { label: "Actividad Hoy",        value: stats.actividadHoy,     sub: "Solicitudes hoy",       icon: <Calendar size={22} />,     iconBg: "bg-blue-50 text-blue-500",    subColor: "text-blue-500" },
          ].map(({ label, value, sub, icon, iconBg, subColor }) => (
            <Card key={label} className="border border-slate-100 shadow-sm bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <div className={`p-2 rounded-full ${iconBg}`}>{icon}</div>
                </div>
                <p className="text-3xl font-black text-slate-900 mb-1">{value}</p>
                <p className={`text-xs font-medium flex items-center gap-1 ${subColor}`}>{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Buscador y filtro ── */}
        <Card className="border border-slate-100 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o código de estudiante..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-univalle-primary transition-all"
              />
            </div>
            <div className="relative">
              <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={carreraFilter}
                onChange={e => setCarreraFilter(e.target.value)}
                className="pl-8 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-univalle-primary appearance-none cursor-pointer"
              >
                <option value="">Todas las carreras</option>
                {carreras.map(c => (
                  <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </CardContent>
          <div className="px-4 pb-3">
            <p className="text-xs text-slate-500">
              Mostrando <span className="font-bold text-slate-700">{estudiantes.length}</span> estudiantes
            </p>
          </div>
        </Card>

        {/* ── Lista de estudiantes ── */}
        <Card className="border border-slate-100 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={20} className="text-univalle-action" />
              <h2 className="text-base font-black text-slate-800">Gestión de Trámites Estudiantiles</h2>
              <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Haz clic en VER TRÁMITES para ver la línea del tiempo
              </span>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="animate-spin text-univalle-primary" size={36} />
              </div>
            ) : estudiantes.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-sm font-semibold text-slate-400">No se encontraron estudiantes</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {estudiantes.map(est => (
                  <div key={est.id_estudiante} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">

                    {/* Avatar + Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm shrink-0 group-hover:bg-univalle-primary/10 group-hover:text-univalle-primary transition-colors">
                        {est.nombres.charAt(0)}{est.apellidos.charAt(0)}
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{est.nombres} {est.apellidos}</p>
                        <p className="text-sm text-slate-500">
                          Código: <span className="font-semibold text-slate-700">{est.codigo_estudiante}</span>
                        </p>
                        {est.carrera && (
                          <p className="text-xs text-slate-400 truncate">{est.carrera}</p>
                        )}

                        {/* Mini línea del tiempo de progreso */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex items-center gap-1">
                            {/* Dot Cajero */}
                            <div className="w-2 h-2 rounded-full bg-blue-400" title="Cajero" />
                            <div className="w-4 h-0.5 bg-slate-200" />
                            {/* Dot Biblioteca */}
                            <div className="w-2 h-2 rounded-full bg-purple-400" title="Biblioteca" />
                            <div className="w-4 h-0.5 bg-slate-200" />
                            {/* Dot Trámites */}
                            <div className="w-2 h-2 rounded-full bg-slate-300" title="Trámites" />
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-semibold text-slate-600">{est.total} trámite{est.total !== 1 ? "s" : ""}</span>
                            {est.pendientes > 0 && (
                              <span className="text-amber-600 font-bold">· {est.pendientes} pendiente{est.pendientes !== 1 ? "s" : ""}</span>
                            )}
                            {est.completados > 0 && (
                              <span className="text-emerald-600 font-bold">· {est.completados} completado{est.completados !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        </div>

                        {est.ultima_actividad && (
                          <p className="text-[10px] text-slate-400">
                            Última actividad: {fmtDateShort(est.ultima_actividad)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botón VER TRÁMITES */}
                    <button
                      id={`btn-timeline-${est.id_estudiante}`}
                      className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-univalle-action hover:bg-univalle-hover text-white text-xs font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                      onClick={() => setSelectedEst(est)}
                    >
                      <FileText size={14} />
                      VER TRÁMITES
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Modal de Línea del Tiempo */}
      {selectedEst && (
        <TimelineModal
          estudiante={selectedEst}
          onClose={() => setSelectedEst(null)}
        />
      )}
    </>
  );
}
