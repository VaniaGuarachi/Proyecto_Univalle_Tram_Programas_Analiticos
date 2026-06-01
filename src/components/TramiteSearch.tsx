"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Download, FileSearch, Hash, Loader2, Search } from "lucide-react";

type TramiteResultado = {
  codigo_seguimiento: string;
  fecha_solicitud: string;
  fecha_cierre: string | null;
  paso_actual: number | null;
  tramite: string;
  descripcion: string | null;
  estado: string;
  estado_codigo: string;
  estado_descripcion: string | null;
  estudiante: string;
  codigo_estudiante: string | null;
  carrera: string | null;
  estado_pago: string | null;
  estado_solvencia: string | null;
  numero_documento: string | null;
  codigo_verificacion: string | null;
  ruta_pdf_firmado: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Pendiente";

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function cleanStatus(value: string | null) {
  if (!value) return "Pendiente";
  return value.replace(/_/g, " ").toLowerCase();
}

export function TramiteSearch() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [tramite, setTramite] = useState<TramiteResultado | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = codigo.trim();
    setFieldError("");
    setMessage("");
    setConnectionError("");
    setTramite(null);

    if (!normalizedCode) {
      setFieldError("Ingresa tu número de trámite o código de validación antes de buscar.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/tramites/buscar?codigo=${encodeURIComponent(normalizedCode)}`);
      const data = await response.json();

      if (response.status === 404) {
        setMessage(data.message || "No se encontró ningún trámite con ese código.");
        return;
      }

      if (!response.ok) {
        setConnectionError(data.error || "Ocurrió un problema al consultar la base de datos.");
        return;
      }

      setTramite(data.tramite);
    } catch {
      setConnectionError("No se pudo conectar con el servidor. Revisa la conexión e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-slate-50 py-14">
      <div className="container-custom">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-gradient-to-br from-univalle-dark via-univalle-primary to-univalle-light p-8 text-white md:p-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-univalle-gold ring-1 ring-white/20">
                <FileSearch className="h-7 w-7" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-univalle-gold">
                Seguimiento público
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Consulta tu trámite por código
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/82 md:text-base">
                Revisa el estado de tu solicitud con el número de trámite, número de documento o código de validación.
              </p>
            </div>

            <div className="p-6 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <label htmlFor="codigo-tramite" className="block text-sm font-black uppercase tracking-[0.12em] text-slate-600">
                  Número de trámite o código de validación
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Hash className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="codigo-tramite"
                      value={codigo}
                      onChange={(event) => setCodigo(event.target.value)}
                      placeholder="Ej. TRM-2026-0001, CERT-2026-67 o UNV-2026-67"
                      className="h-14 w-full rounded-xl border bg-slate-50 pl-12 pr-4 text-base font-semibold text-slate-900 outline-none focus:border-univalle-primary focus:bg-white focus:ring-4 focus:ring-univalle-primary/10"
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? "codigo-error" : undefined}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-14 items-center justify-center rounded-xl bg-univalle-primary px-7 font-black text-white shadow-lg shadow-univalle-primary/20 hover:-translate-y-0.5 hover:bg-univalle-hover disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-36"
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                    Buscar
                  </button>
                </div>
                {fieldError && (
                  <p id="codigo-error" className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {fieldError}
                  </p>
                )}
              </form>

              <div className="mt-6" aria-live="polite">
                {loading && (
                  <div className="flex items-center gap-3 rounded-xl border border-univalle-primary/15 bg-univalle-primary/5 p-4 text-sm font-semibold text-univalle-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Consultando la base de datos...
                  </div>
                )}

                {connectionError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    {connectionError}
                  </div>
                )}

                {message && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    {message}
                  </div>
                )}

                {tramite && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-univalle-primary">
                          {tramite.codigo_seguimiento}
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-slate-950">{tramite.tramite}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {tramite.estado_descripcion || tramite.descripcion || "Solicitud registrada en el sistema institucional."}
                        </p>
                      </div>
                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        {tramite.estado}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <ResultItem label="Estudiante" value={tramite.estudiante} />
                      <ResultItem label="Código estudiante" value={tramite.codigo_estudiante || "No registrado"} />
                      <ResultItem label="Carrera" value={tramite.carrera || "No registrada"} />
                      <ResultItem label="Pago" value={cleanStatus(tramite.estado_pago)} />
                      <ResultItem label="Solvencia" value={cleanStatus(tramite.estado_solvencia)} />
                      <ResultItem label="Paso actual" value={tramite.paso_actual ? `Paso ${tramite.paso_actual}` : "En revisión"} />
                      <ResultItem icon={<CalendarDays className="h-4 w-4" />} label="Fecha de solicitud" value={formatDate(tramite.fecha_solicitud)} />
                      <ResultItem icon={<CalendarDays className="h-4 w-4" />} label="Fecha de cierre" value={formatDate(tramite.fecha_cierre)} />
                    </div>

                    {(tramite.numero_documento || tramite.codigo_verificacion || tramite.ruta_pdf_firmado) && (
                      <div className="mt-5 rounded-xl border border-univalle-primary/15 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Documento emitido</p>
                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              Número: {tramite.numero_documento || "Pendiente"} · Verificación: {tramite.codigo_verificacion || "Pendiente"}
                            </p>
                          </div>
                          {tramite.ruta_pdf_firmado && (
                            <a
                              href={tramite.ruta_pdf_firmado}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 hover:bg-univalle-primary"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Descargar documento
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="font-bold capitalize text-slate-900">{value}</p>
    </div>
  );
}
