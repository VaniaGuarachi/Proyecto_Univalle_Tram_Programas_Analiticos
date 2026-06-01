"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileCheck, Info, Loader2, Send, UploadCloud, UserCheck, X } from "lucide-react";
import { EstudianteConTramites, Tramite } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  estudiante: EstudianteConTramites;
  tramite: Tramite;
  onBack: () => void;
  onFinalize: (finalData: { codigo: string; success: boolean }) => void;
}

type Firma = {
  id: number | string;
  nombre: string;
  cargo: string;
  unidad?: string;
  imagen?: string | null;
  x: number;
  y: number;
};

type EmisionData = {
  tramite: {
    id_tramite: number;
    codigo_seguimiento: string;
    fecha_solicitud: string;
    observaciones_generales: string | null;
    estudiante_nombre: string;
    codigo_estudiante: string;
    correo_institucional: string;
    carrera: string;
    semestre: number | null;
    tipo_tramite: string;
    detalle_tramite: string | null;
    estado_nombre: string;
    codigo_verificacion: string | null;
    numero_documento: string | null;
    estado_documento: string | null;
    ruta_pdf_firmado: string | null;
  };
  firmas: Firma[];
  autoridades: Omit<Firma, "x" | "y">[];
  adjuntos: { id_documento: number; nombre_archivo: string; ruta_archivo: string; tamano_archivo: number; fecha_subida: string }[];
};

export default function TramiteRevision({ tramite, onBack, onFinalize }: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<EmisionData | null>(null);
  const [firmas, setFirmas] = useState<Firma[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingToStudent, setSendingToStudent] = useState(false);
  const [emissionStep, setEmissionStep] = useState(0);
  const [dragId, setDragId] = useState<string | number | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  const emissionSteps = [
    "Generando documento...",
    "Aplicando firmas...",
    "Uniendo PDFs...",
    "Preparando vista previa...",
  ];

  const codigo = useMemo(
    () => data?.tramite.codigo_verificacion || `UNV-${new Date().getFullYear()}-${tramite.id_db}`,
    [data?.tramite.codigo_verificacion, tramite.id_db]
  );
  const numero = useMemo(
    () => data?.tramite.numero_documento || `CERT-${new Date().getFullYear()}-${tramite.id_db}`,
    [data?.tramite.numero_documento, tramite.id_db]
  );
  const verificationUrl = typeof window === "undefined" ? "" : `${window.location.origin}/verificacion?codigo=${codigo}`;

  useEffect(() => {
    async function load() {
      if (!tramite.id_db) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/tramites/v2/emision/${tramite.id_db}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No se pudo cargar el panel.");
        setData(json);
        setFirmas(json.firmas || []);
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Error al cargar panel." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tramite.id_db]);

  const addFirma = (autoridad: Omit<Firma, "x" | "y">) => {
    if (firmas.some((f) => f.id === autoridad.id)) return;
    setFirmas((prev) => [...prev, { ...autoridad, x: prev.length ? 390 : 95, y: 645 }]);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragId || !docRef.current) return;
    const rect = docRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(500, event.clientX - rect.left - 80));
    const y = Math.max(80, Math.min(710, event.clientY - rect.top - 35));
    setFirmas((prev) => prev.map((f) => (f.id === dragId ? { ...f, x, y } : f)));
  };

  const addPdf = (file: File) => {
    if (file.type !== "application/pdf") return setMessage({ type: "error", text: "Solo se permiten PDFs." });
    if (pdfFiles.length >= 8) return setMessage({ type: "error", text: "Máximo 8 PDFs permitidos." });
    setMessage(null);
    setPdfFiles((prev) => [...prev, file]);
  };

  const emitir = async () => {
    if (!tramite.id_db || !data) return;
    if (firmas.length < 2) return setMessage({ type: "error", text: "Selecciona al menos dos firmas requeridas." });
    setSaving(true);
    setEmissionStep(0);
    setMessage(null);
    const progressTimer = window.setInterval(() => {
      setEmissionStep((step) => Math.min(step + 1, emissionSteps.length - 1));
    }, 900);

    try {
      const fd = new FormData();
      fd.append("id_tramite", String(tramite.id_db));
      fd.append("codigo", codigo);
      fd.append("nroCertificacion", numero);
      fd.append("verificationUrl", verificationUrl);
      fd.append("observaciones", data.tramite.observaciones_generales || data.tramite.detalle_tramite || "");
      fd.append("firmas", JSON.stringify(firmas));
      pdfFiles.forEach((file) => fd.append("pdfs", file));

      const res = await fetch("/api/tramites/v2/finalizar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al emitir documento.");
      setEmissionStep(emissionSteps.length - 1);
      setData((prev) => prev ? {
        ...prev,
        tramite: {
          ...prev.tramite,
          estado_documento: "BORRADOR",
          ruta_pdf_firmado: json.ruta_pdf_final || prev.tramite.ruta_pdf_firmado,
        },
      } : prev);
      setMessage({ type: "ok", text: (json.mensajes || ["Documento consolidado generado correctamente.", "Vista previa lista."]).join(" ") });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Error de conexión." });
    } finally {
      window.clearInterval(progressTimer);
      setSaving(false);
    }
  };

  const enviarAlEstudiante = async () => {
    if (!tramite.id_db || !data?.tramite.ruta_pdf_firmado) {
      return setMessage({ type: "error", text: "Primero debes generar y revisar la vista previa del PDF consolidado." });
    }
    setSendingToStudent(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tramites/v2/enviar-estudiante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tramite: tramite.id_db }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar el documento al estudiante.");
      setData((prev) => prev ? {
        ...prev,
        tramite: { ...prev.tramite, estado_documento: "EMITIDO" },
      } : prev);
      setMessage({ type: "ok", text: json.mensaje || "Documento enviado correctamente al estudiante." });
      setTimeout(() => onFinalize({ codigo: json.codigo || codigo, success: true }), 900);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Error de conexión." });
    } finally {
      setSendingToStudent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  if (!data) {
    return <div className="bg-red-50 text-red-700 p-6 rounded-2xl font-bold">{message?.text || "Panel no disponible."}</div>;
  }

  return (
    <div className="max-w-[1700px] mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-6 mb-8">
        <button onClick={onBack} className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-univalle-primary active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic uppercase">Panel de Emisión</h2>
          <p className="text-xs font-black text-univalle-primary uppercase tracking-[0.3em] opacity-70">{data.tramite.tipo_tramite}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(620px,1fr)_360px] gap-8 items-start">
        <aside className="space-y-6">
          <Panel title="Directorio de Firmas">
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1 custom-scrollbar">
              {data.autoridades.map((a) => (
                <div key={a.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <UserCheck size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{a.nombre}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">{a.cargo}</p>
                      <button
                        onClick={() => addFirma(a)}
                        className="mt-3 w-full px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 hover:bg-univalle-primary hover:text-white transition-colors"
                      >
                        Seleccionar firma
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <main className="flex justify-center min-w-0">
          {data.tramite.ruta_pdf_firmado ? (
            <div className="w-full max-w-[720px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vista previa final</p>
                  <p className="text-xs font-bold text-slate-500">Este es el mismo PDF consolidado que recibe el estudiante.</p>
                </div>
                <a href={data.tramite.ruta_pdf_firmado} target="_blank" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  Abrir PDF
                </a>
              </div>
              <iframe src={`${data.tramite.ruta_pdf_firmado}#toolbar=1`} className="w-full h-[860px] bg-slate-100" />
              <div className="p-5 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={enviarAlEstudiante}
                  disabled={sendingToStudent || saving || !data.tramite.ruta_pdf_firmado}
                  className={cn(
                    "w-full py-5 rounded-xl font-black text-xs tracking-[0.2em] uppercase transition-all shadow-lg flex items-center justify-center gap-3",
                    sendingToStudent || saving || !data.tramite.ruta_pdf_firmado
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 hover:bg-black text-white shadow-emerald-600/25"
                  )}
                >
                  {sendingToStudent ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {sendingToStudent ? "Enviando al estudiante..." : "Enviar al estudiante"}
                </button>
              </div>
            </div>
          ) : (
          <div
            ref={docRef}
            onPointerMove={onPointerMove}
            onPointerUp={() => setDragId(null)}
            onPointerLeave={() => setDragId(null)}
            className="relative w-[620px] min-h-[860px] bg-white shadow-2xl border border-slate-200 p-12 select-none"
          >
            <div className="text-center border-b-2 border-slate-900 pb-5 mb-8">
              <img src="/img/Logo_Doc.png" alt="Univalle" className="h-20 mx-auto mb-4 object-contain" />
              <h4 className="font-serif text-xl font-bold text-slate-900 uppercase tracking-wide">Universidad Privada del Valle</h4>
              <p className="text-xs text-slate-600 uppercase tracking-widest mt-2">Departamento de Registro y Trámites Académicos</p>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Certificación Académica</h1>
              <p className="text-xs text-slate-500 mt-2 font-mono">N° {numero}</p>
            </div>

            <div className="space-y-6 text-base text-slate-800 text-justify leading-relaxed font-serif">
              <p>Por el presente documento se certifica que el/la estudiante:</p>
              <p className="text-center text-xl font-bold uppercase">{data.tramite.estudiante_nombre}</p>
              <p>Con código/matrícula <strong>{data.tramite.codigo_estudiante}</strong>, perteneciente a la carrera <strong>{data.tramite.carrera}</strong>, solicitó el trámite <strong>{data.tramite.tipo_tramite}</strong>.</p>
              <div className="bg-slate-50 p-6 border border-slate-200 text-sm my-6 rounded-md shadow-inner">
                <strong className="block mb-2 uppercase text-slate-500 text-xs">Detalle de la solicitud:</strong>
                <p className="italic text-slate-700">{data.tramite.observaciones_generales || data.tramite.detalle_tramite}</p>
              </div>
              <p>Emitido en fecha {new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" })}.</p>
            </div>

            {firmas.map((firma) => (
              <div
                key={firma.id}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragId(firma.id);
                }}
                className="absolute w-40 text-center cursor-grab active:cursor-grabbing"
                style={{ left: firma.x, top: firma.y }}
              >
                {firma.imagen ? <img src={firma.imagen} alt={firma.nombre} className="h-12 mx-auto object-contain" /> : <p className="text-3xl text-blue-900 italic -rotate-3">{firma.nombre.split(" ")[0]}</p>}
                <div className="border-t border-slate-400 pt-2 bg-white/80">
                  <p className="text-[9px] font-bold text-slate-800 uppercase leading-tight">{firma.nombre}</p>
                  <p className="text-[8px] text-slate-500 uppercase leading-tight">{firma.cargo}</p>
                  <p className="text-[7px] text-slate-400 uppercase leading-tight">{firma.unidad || "TrÃ¡mites AcadÃ©micos"}</p>
                  <p className="text-[7px] text-slate-400 leading-tight">{new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}

            <div className="absolute left-12 right-12 bottom-10 flex justify-between items-end border-t border-slate-100 pt-5">
              <div>
                <p className="text-[9px] text-slate-500 font-mono font-bold mb-1">ID: {codigo}</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest">Verificable en línea</p>
              </div>
              <img src={`/api/qr?data=${encodeURIComponent(verificationUrl)}`} alt="QR" className="w-24 h-24 border border-slate-200 p-1 bg-white" />
            </div>
          </div>
          )}
        </main>

        <aside className="space-y-6">
          <Panel title="Estado de Emisión">
            <State label="Firmas" done={firmas.length >= 2} value={`${firmas.length}/2`} />
            <State label="QR" done={Boolean(verificationUrl)} value={codigo} />
            <State label="PDFs adjuntos" done value={`${pdfFiles.length + data.adjuntos.length}/8`} />
          </Panel>

          {saving && (
            <Panel title="Progreso">
              <div className="space-y-3">
                {emissionSteps.map((step, idx) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center",
                      idx < emissionStep ? "bg-emerald-500 text-white" : idx === emissionStep ? "bg-univalle-primary text-white" : "bg-slate-100 text-slate-300"
                    )}>
                      {idx < emissionStep ? <CheckCircle2 size={14} /> : <Loader2 size={14} className={idx === emissionStep ? "animate-spin" : ""} />}
                    </div>
                    <p className={cn("text-[11px] font-black uppercase tracking-wider", idx <= emissionStep ? "text-slate-800" : "text-slate-400")}>{step}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {sendingToStudent && (
            <Panel title="Envío">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-univalle-primary text-white flex items-center justify-center">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">Enviando al estudiante...</p>
              </div>
            </Panel>
          )}

          <Panel title="PDFs Adjuntos">
            <div className="space-y-2 mb-4">
              {data.adjuntos.map((file) => (
                <PdfRow key={file.id_documento} name={file.nombre_archivo} />
              ))}
              {pdfFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <PdfRow name={file.name} compact />
                  <button onClick={() => setPdfFiles((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-full">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {pdfFiles.length + data.adjuntos.length < 8 && (
              <label className="relative h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 bg-slate-50 border-slate-200 hover:border-univalle-primary hover:bg-white transition-all cursor-pointer">
                <UploadCloud size={20} className="text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase">Subir PDF opcional</p>
                <input type="file" accept="application/pdf,.pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && addPdf(e.target.files[0])} />
              </label>
            )}
          </Panel>

          {message && (
            <div className={cn("p-3 rounded-lg border flex items-start gap-2", message.type === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100")}>
              <Info size={14} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold leading-snug">{message.text}</p>
            </div>
          )}

          <button
            onClick={emitir}
            disabled={saving || firmas.length < 2}
            className={cn(
              "w-full py-5 rounded-xl font-black text-xs tracking-[0.2em] uppercase transition-all shadow-lg flex items-center justify-center gap-3",
              saving || firmas.length < 2 ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-univalle-action hover:bg-black text-white shadow-univalle-action/30"
            )}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {saving ? emissionSteps[emissionStep] : "Emitir Documento"}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );
}

function State({ label, done, value }: { label: string; done: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold text-slate-600 uppercase">{label}</span>
      <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 max-w-[180px] truncate">
        {done ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <Loader2 size={16} className="text-amber-500 shrink-0" />}
        {value}
      </span>
    </div>
  );
}

function PdfRow({ name, compact = false }: { name: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 overflow-hidden", !compact && "p-3 bg-slate-50 border border-slate-100 rounded-xl")}>
      <FileCheck size={16} className="text-emerald-600 shrink-0" />
      <p className="text-[10px] font-bold text-slate-700 truncate">{name}</p>
    </div>
  );
}
