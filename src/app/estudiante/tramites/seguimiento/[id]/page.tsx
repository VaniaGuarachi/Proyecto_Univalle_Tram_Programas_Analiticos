"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2, Clock,
  ArrowLeft, FileText,
  CreditCard, Loader2,
  Info, AlertCircle,
  ClipboardCheck,
  Check, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface SeguimientoData {
  tramite: {
    id_tramite: number;
    codigo_seguimiento: string;
    fecha_solicitud: string;
    paso_actual: number;
    tramite_nombre: string;
    tramite_descripcion: string;
    estado_nombre: string;
    estado_codigo: string;
  };
  pago: {
    id_pago: number;
    monto_total: string;
    estado_pago: string;
    metodo_pago: string;
    fecha_pago: string | null;
    voucher_path: string | null;
    voucher_estado: string | null;
    voucher_observacion: string | null;
  } | null;
  factura?: {
    numero_factura: string | null;
    nombre_factura: string | null;
    nit_ci: string | null;
    razon_social: string | null;
    direccion: string | null;
    correo_envio: string | null;
    monto_total: string | null;
    ruta_pdf_factura: string | null;
  } | null;
  solvencia: {
    estado_solvencia: string;
    observacion: string | null;
    deudas?: {
      tipo_deuda: string;
      descripcion: string | null;
      monto: string | number;
      estado_deuda: string;
    }[];
  } | null;
  historial: {
    fecha_cambio: string;
    estado: string;
    motivo_cambio: string | null;
  }[];
  documento?: {
    numero_documento: string;
    codigo_verificacion: string;
    qr_verificacion: string;
    ruta_pdf_firmado: string;
    fecha_emision: string;
    firma_autoridad?: string;
    firma_responsable?: string;
    observaciones?: string;
  } | null;
}

export default function SeguimientoTramite() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<SeguimientoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepUI, setSelectedStepUI] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [resendingLibrary, setResendingLibrary] = useState(false);
  const [resendingPayment, setResendingPayment] = useState(false);
  const [resendPaymentError, setResendPaymentError] = useState<string | null>(null);
  const autoSendStartedRef = useRef(false);
  const paymentVoucherInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchSeguimiento() {
      try {
        setLoading(true);
        // Usar params.id en lugar de params.codigo para mayor fiabilidad
        const res = await fetch(`/api/estudiante/tramites/seguimiento/${params.id}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error al cargar seguimiento");
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar seguimiento");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchSeguimiento();
    }
  }, [params.id]);

  const tramiteSentStates = ["EN_PROCESO", "ENVIADO_TRAMITES", "EMITIDO", "FINALIZADO", "TRAMITE_COMPLETADO"];
  const canSendToTramites = Boolean(
    data &&
    data.pago?.estado_pago === "PAGADO" &&
    data.factura?.numero_factura &&
    data.factura?.ruta_pdf_factura &&
    data.solvencia?.estado_solvencia &&
    ["SIN_DEUDAS", "SOLVENTE"].includes(data.solvencia.estado_solvencia) &&
    !tramiteSentStates.includes(data.tramite.estado_codigo)
  );

  const sendToTramites = useCallback(async () => {
    if (!data || !user?.id_usuario || sending) return;
    setSending(true);
    setSelectedStepUI(6);
    try {
      const res = await fetch("/api/estudiante/tramites/enviar-tramites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tramite: data.tramite.id_tramite, userId: user.id_usuario }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar a TrÃ¡mites");
      }

      const fechaEnvio = json.fecha_envio || new Date().toISOString();
      setSentAt(fechaEnvio);
      setSendSuccess(
        "Tu tr\u00e1mite fue enviado correctamente. El \u00e1rea de tr\u00e1mites procesar\u00e1 tu solicitud en un plazo aproximado de 48 horas."
      );
      setData((prev) => prev ? {
        ...prev,
        tramite: {
          ...prev.tramite,
          paso_actual: Math.max(prev.tramite.paso_actual, 6),
          estado_codigo: json.estado_codigo || "ENVIADO_TRAMITES",
          estado_nombre: json.estado_nombre || "Enviado a Tr\u00e1mites",
        },
        historial: json.duplicado ? prev.historial : [
          {
            fecha_cambio: fechaEnvio,
            estado: json.estado_nombre || "Enviado a Tr\u00e1mites",
            motivo_cambio: `Tr\u00e1mite enviado autom\u00e1ticamente. C\u00f3digo: ${json.codigo_tramite || prev.tramite.codigo_seguimiento}`,
          },
          ...prev.historial,
        ],
      } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar a TrÃ¡mites");
    } finally {
      setSending(false);
    }
  }, [data, sending, user?.id_usuario]);

  useEffect(() => {
    if (!canSendToTramites || !user?.id_usuario || autoSendStartedRef.current) return;
    autoSendStartedRef.current = true;
    void sendToTramites();
  }, [canSendToTramites, sendToTramites, user?.id_usuario]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
        <p className="text-slate-500 font-medium font-bold uppercase tracking-widest text-xs opacity-60">Obteniendo estado de tu trámite...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center bg-white rounded-[3rem] shadow-sm border border-slate-100 my-10">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trámite no encontrado</h2>
        <p className="text-slate-500 mt-2 font-medium px-10">{error || "No pudimos localizar la información de este trámite en el sistema."}</p>
        <Button onClick={() => router.push('/estudiante/tramites/historial')} className="mt-8 bg-[#8C1B1B] hover:bg-black text-white px-10 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/10 transition-all">
          Regresar a mi Historial
        </Button>
      </div>
    );
  }

  const steps = [
    "Inicio",
    "Pago",
    "Verificación de cajero",
    "Biblioteca",
    "Factura",
    "Trámite"
  ];

  // Map the backend paso_actual (1-5) to the UI steps (1-6)
  // 1 (Solicitud) -> Step 3 (Pagos) because Inicio/Llenado are done
  // 2 (Pago) -> Step 3 (Pagos)
  // 3 (Biblioteca) -> Step 5 (Biblioteca)
  // 4 (Revisión) -> Step 5 (Biblioteca) / Step 6 (Trámite)
  // 5 (Finalizado) -> Step 6 (Trámite)

  let currentStepUI = 1;
  const dbStep = data.tramite.paso_actual;
  const dbEstado = data.tramite.estado_codigo;

  // Lógica de mapeo refinada para el Historial (basada en el diseño del wizard de 6 pasos)
  if (dbEstado === 'TRAMITE_COMPLETADO' || dbEstado === 'FINALIZADO' || dbEstado === 'EMITIDO') {
    currentStepUI = 6;
  } else if (dbEstado === 'EN_PROCESO' || dbEstado === 'ENVIADO_TRAMITES') {
    currentStepUI = 6;
  } else if (dbEstado === 'DOCUMENTO_GENERADO' || dbEstado === 'APTO_TRAMITE' || dbEstado === 'SOLVENTE' || dbEstado === 'FACTURA') {
    currentStepUI = 5; // Factura generada tras biblioteca
  } else if (dbEstado === 'PENDIENTE_SOLVENCIA' || dbEstado === 'CON_DEUDAS' || dbEstado === 'PAGO_VERIFICADO') {
    currentStepUI = 4; // En Biblioteca
  } else if (dbEstado === 'PAGO_EN_REVISION' || dbEstado === 'COMPROBANTE_SUBIDO') {
    currentStepUI = 3; // Verificación de cajero
  } else if (dbEstado === 'PENDIENTE_PAGO' || dbEstado === 'DATOS_COMPLETADOS') {
    currentStepUI = 2; // Pago
  } else {
    // Fallback basado en paso_actual si el estado no es específico
    switch (dbStep) {
      case 0: currentStepUI = 1; break;
      case 1: currentStepUI = 2; break;
      case 2: currentStepUI = 3; break;
      case 3: currentStepUI = 4; break;
      case 4: currentStepUI = 5; break;
      case 5: currentStepUI = 6; break;
      default: currentStepUI = 2;
    }
  }

  const currentStep = currentStepUI - 1; // 0-indexed for logic
  const displayStepUI = selectedStepUI ?? currentStepUI;
  const displayStep = displayStepUI - 1;

  const resendToLibrary = async () => {
    if (!user?.id_usuario) return;
    setResendingLibrary(true);
    try {
      const res = await fetch("/api/estudiante/tramites/reenviar-biblioteca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tramite: data.tramite.id_tramite, userId: user.id_usuario }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "No se pudo reenviar a biblioteca");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar a biblioteca");
    } finally {
      setResendingLibrary(false);
    }
  };

  const resendPaymentVoucher = async (file: File) => {
    if (!user?.id_usuario) return;
    setResendingPayment(true);
    setResendPaymentError(null);
    try {
      const formData = new FormData();
      formData.append("id_tramite", String(data.tramite.id_tramite));
      formData.append("userId", String(user.id_usuario));
      formData.append("voucher", file);

      const res = await fetch("/api/estudiante/pago/reenviar-comprobante", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo reenviar el comprobante");
      }
      window.location.reload();
    } catch (err) {
      setResendPaymentError(err instanceof Error ? err.message : "No se pudo reenviar el comprobante");
    } finally {
      setResendingPayment(false);
      if (paymentVoucherInputRef.current) paymentVoucherInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">

      {/* Header */}
      <div className="flex items-center gap-6 mb-10 pt-4">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-2xl h-14 w-14 p-0 bg-white border border-slate-100 hover:bg-slate-50 shadow-sm group">
          <ArrowLeft size={24} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
        </Button>
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase">
            Estado detallado
          </h1>
          <p className="text-[#8C1B1B] font-black mt-2 text-sm tracking-widest uppercase opacity-80">
            CÓDIGO: <span className="bg-red-50 px-3 py-1 rounded-lg border border-red-100">{data.tramite.codigo_seguimiento}</span>
          </p>
        </div>
      </div>

      {/* Progress Stepper - Wizard Design Matching */}
      <Card className="mb-10 border-0 shadow-sm rounded-[3rem] px-12 py-10 bg-white overflow-hidden">
        <div className="flex justify-between items-center relative w-full px-8">
          <div className="absolute left-[10%] right-[10%] top-[1.1rem] h-[1px] bg-slate-100 z-0"></div>

          <div
            className="absolute left-[10%] top-[1.1rem] h-[1px] bg-univalle-primary z-0 transition-all duration-300"
            style={{ width: `${(currentStep / (steps.length - 1)) * 80}%` }}
          ></div>

          {steps.map((step, idx) => {
            const isActive = idx === displayStep;
            const isCompleted = idx < currentStepUI;
            const isSelectable = idx < currentStepUI;

            return (
              <button 
                key={idx} 
                onClick={() => isSelectable && setSelectedStepUI(idx + 1)}
                className={cn(
                  "flex flex-col items-center gap-3 relative z-10 bg-white px-3 transition-all", 
                  isSelectable ? "cursor-pointer hover:-translate-y-1" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500",
                    isActive
                      ? "bg-univalle-primary text-white scale-110 shadow-lg shadow-univalle-primary/20"
                      : isCompleted ? "bg-emerald-500 text-white" : "bg-white text-slate-300 border-2 border-slate-100"
                  )}
                >
                  {isCompleted && !isActive ? <Check size={18} strokeWidth={4} /> : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest text-center",
                  isActive ? "text-slate-900 font-bold" : (isCompleted ? "text-slate-600" : "text-slate-300")
                )}>
                  {step}
                </span>
              </button>
            );
          })}
        </div>
      </Card>


      <div className="max-w-4xl mx-auto">
        {/* Main Info - Premium Card Redesigned */}
        <div className="space-y-10">
          <Card className="border-0 shadow-sm rounded-[3rem] overflow-hidden bg-white">
            <div className="p-10 pb-12">
              <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight mb-12">{data.tramite.tramite_nombre}</h2>

              {displayStepUI === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-12">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Fecha de Solicitud</p>
                      <p className="text-xl font-bold text-slate-700">{new Date(data.tramite.fecha_solicitud).toLocaleString('es-BO', {
                        timeZone: 'America/La_Paz', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Estado del Proceso</p>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.1em] shadow-lg",
                          data.tramite.estado_codigo === 'FINALIZADO' ? "bg-emerald-500 text-white shadow-emerald-200" :
                            data.tramite.estado_codigo === 'RECHAZADO' ? "bg-red-500 text-white shadow-red-200" :
                              "bg-[#5E7693] text-white shadow-slate-200"
                        )}>
                          {data.tramite.estado_nombre}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] rounded-[2rem] p-10 border border-slate-100 flex gap-6 items-start">
                    <div className="bg-blue-500 text-white p-2 rounded-lg mt-0.5">
                      <Info size={20} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-800 uppercase tracking-[0.1em] text-xs">Nota Administrativa</h4>
                      <p className="text-slate-500 text-[15px] leading-relaxed font-medium">
                        {data.tramite.tramite_descripcion || "Solicitud de programas analíticos. Este trámite se encuentra en proceso de validación. Una vez completados los requisitos previos, el sistema habilitará automáticamente la etapa final."}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons for step 1 */}
                  {data.tramite.tramite_nombre.toLowerCase().includes('analíticos') &&
                    data.tramite.estado_codigo !== 'FINALIZADO' &&
                    data.tramite.estado_codigo !== 'RECHAZADO' && currentStepUI === 1 ? (
                    <div className="mt-12 pt-8 border-t border-slate-50">
                      <Button
                        onClick={() => router.push(`/estudiante/tramites/programas-analiticos?id=${data.tramite.id_tramite}`)}
                        className="h-14 px-10 bg-[#8C1B1B] hover:bg-black text-white rounded-2xl shadow-xl shadow-red-900/10 font-black uppercase tracking-widest transition-all flex gap-3"
                      >
                        Continuar con el Asistente
                        <Clock size={18} />
                      </Button>
                    </div>
                  ) : (data.tramite.estado_codigo === 'SOLICITUD_CREADA' || data.tramite.estado_codigo === 'PENDIENTE_PAGO') && currentStepUI <= 2 && (
                    <div className="mt-12 flex flex-wrap gap-5 pt-8 border-t border-slate-50">
                      <Button onClick={() => router.push('/estudiante/pago')} className="h-14 px-10 bg-univalle-primary hover:bg-black text-white rounded-2xl shadow-xl shadow-red-900/10 font-black uppercase tracking-widest transition-all">
                        Realizar Pago Ahora
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {displayStepUI === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  {data.pago?.voucher_path ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6">
                      <div className="w-20 h-20 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                        <CreditCard size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-blue-900 tracking-tight">Comprobante de Pago</h3>
                      <p className="text-blue-700 font-medium">Has subido un comprobante por el monto de Bs. {data.pago.monto_total}</p>
                      
                      <div className="mt-4 flex flex-col gap-3">
                        <Button variant="outline" onClick={() => window.open(data.pago?.voucher_path || '', '_blank')} className="border-blue-200 text-blue-700 hover:bg-blue-100 h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                          Ver comprobante subido
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-10 py-16 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <Loader2 className="animate-spin text-slate-300" size={40} />
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center px-6">
                        No se ha registrado ningún pago
                      </p>
                      {currentStepUI <= 2 && (
                         <Button onClick={() => router.push('/estudiante/pago')} className="mt-4 h-12 px-10 bg-univalle-primary hover:bg-black text-white rounded-xl shadow-lg font-black uppercase tracking-widest text-[10px] transition-all">
                           Realizar Pago Ahora
                         </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {displayStepUI === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                   {data.pago?.estado_pago === 'PAGADO' ? (
                     <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                          <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-emerald-900 tracking-tight">Cajero validó el pago</h3>
                        <p className="text-emerald-700 font-medium">El pago fue revisado y aprobado exitosamente.</p>
                     </div>
                   ) : data.pago?.estado_pago === 'RECHAZADO' || data.pago?.estado_pago === 'OBSERVADO' ? (
                     <div className="bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200">
                          <AlertCircle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-red-900 tracking-tight">Pago Rechazado</h3>
                        <p className="text-red-700 font-medium bg-white/60 p-4 rounded-xl">{data.pago.voucher_observacion || "Comprobante rechazado por el cajero."}</p>
                        {resendPaymentError && (
                          <p className="text-red-700 font-bold text-sm bg-white/60 p-4 rounded-xl">{resendPaymentError}</p>
                        )}
                        <input
                          ref={paymentVoucherInputRef}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void resendPaymentVoucher(file);
                          }}
                        />
                        <Button
                          onClick={() => paymentVoucherInputRef.current?.click()}
                          disabled={resendingPayment || !user?.id_usuario}
                          className="h-12 px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
                        >
                          {resendingPayment ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                          Volver a enviar comprobante
                        </Button>
                     </div>
                   ) : (
                     <div className="mt-10 py-16 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <Loader2 className="animate-spin text-univalle-primary" size={40} />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center px-6">
                          Esperando validación del Cajero
                        </p>
                     </div>
                   )}
                </div>
              )}

              {displayStepUI === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  {data.solvencia?.estado_solvencia === 'CON_DEUDAS' ? (
                    <div className="bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-10 space-y-6 shadow-sm">
                      <div className="flex items-center gap-4 text-red-600">
                        <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200">
                          <AlertCircle size={28} strokeWidth={3} />
                        </div>
                        <h4 className="text-2xl font-black uppercase tracking-tight">Pendientes de biblioteca</h4>
                      </div>
                      <p className="font-black text-red-900 leading-relaxed">
                        Tienes deudas pendientes en biblioteca. Debes solucionar los pendientes registrados antes de continuar con tu trámite.
                      </p>
                      {data.solvencia.observacion && (
                        <p className="font-bold text-red-800 text-sm bg-white/50 p-4 rounded-xl">{data.solvencia.observacion}</p>
                      )}
                      {data.solvencia.deudas && data.solvencia.deudas.length > 0 && (
                        <div className="space-y-3">
                          {data.solvencia.deudas.map((deuda, idx) => (
                            <div key={idx} className="bg-white border border-red-100 rounded-2xl p-4">
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Detalle de deuda o pendiente</p>
                              <p className="text-sm font-bold text-red-900">{deuda.descripcion || deuda.tipo_deuda}</p>
                              {Number(deuda.monto) > 0 && (
                                <p className="text-xs font-black text-red-700 mt-2">Monto: Bs. {Number(deuda.monto).toFixed(2)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        onClick={resendToLibrary}
                        disabled={resendingLibrary || !user?.id_usuario}
                        className="h-12 px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
                      >
                        {resendingLibrary ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Volver a solicitar verificación
                      </Button>
                    </div>
                  ) : data.solvencia?.estado_solvencia === 'SIN_DEUDAS' || data.solvencia?.estado_solvencia === 'SOLVENTE' ? (
                     <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6">
                        <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                          <ClipboardCheck size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-emerald-900 tracking-tight">Verificación de Biblioteca Aprobada</h3>
                        <p className="text-emerald-700 font-medium">No cuentas con deudas, por lo que el trámite puede proseguir.</p>
                     </div>
                  ) : (
                     <div className="mt-10 py-16 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <Loader2 className="animate-spin text-univalle-primary" size={40} />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center px-6">
                          Esperando verificación de biblioteca
                        </p>
                        {data.solvencia?.observacion && (
                          <p className="text-sm font-bold text-slate-500 bg-white border border-slate-100 px-5 py-3 rounded-2xl">
                            {data.solvencia.observacion}
                          </p>
                        )}
                     </div>
                  )}
                </div>
              )}

              {displayStepUI === 5 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  {data.factura?.ruta_pdf_factura ? (
                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200">
                          <FileText size={26} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Factura disponible</p>
                          <h4 className="text-2xl font-black text-emerald-950">{data.factura.numero_factura}</h4>
                          <p className="text-sm font-bold text-emerald-700">Bs. {data.factura.monto_total}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.open(data.factura?.ruta_pdf_factura || '', '_blank')}
                        className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                      >
                        Descargar factura
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-10 py-16 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <Loader2 className="animate-spin text-slate-400" size={40} />
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center px-6">
                        Factura no disponible todavía
                      </p>
                    </div>
                  )}
                </div>
              )}

              {displayStepUI === 6 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  {(dbEstado === 'TRAMITE_COMPLETADO' || dbEstado === 'FINALIZADO' || dbEstado === 'EMITIDO' || Boolean(data.documento)) ? (
                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] flex flex-col items-center text-center gap-6 p-10">
                      <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                        <CheckCircle2 size={40} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-emerald-900 tracking-tight">
                          {data.documento ? '¡Tu Documento está Listo!' : '¡Proceso en Etapa Final!'}
                        </h3>
                        <p className="text-emerald-700 font-medium max-w-md">
                          {data.documento 
                            ? `Documento emitido correctamente. Puedes descargarlo y verificarlo con QR.` 
                            : 'Tu solicitud ha sido aprobada por todas las instancias. Actualmente estamos generando y firmando tu documento digital.'}
                        </p>
                      </div>
                      
                      {data.documento ? (
                        <div className="w-full space-y-4 mt-4">
                          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-left">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                                   <FileText size={20} />
                                 </div>
                                 <h4 className="font-black text-emerald-900 text-lg uppercase tracking-tight">Documento Emitido</h4>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600">
                                  <span className="font-bold sm:w-36 text-xs uppercase tracking-widest text-slate-400">Código de verificación:</span>
                                  <span className="font-mono font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-md border border-slate-100">{data.documento.codigo_verificacion}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600">
                                  <span className="font-bold sm:w-36 text-xs uppercase tracking-widest text-slate-400">Fecha de emisión:</span>
                                  <span className="font-medium text-slate-700">{new Date(data.documento.fecha_emision).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-sm text-slate-600">
                                  <span className="font-bold sm:w-36 text-xs uppercase tracking-widest text-slate-400 mt-1">Firmado por:</span>
                                  <div className="flex flex-col gap-1.5 font-medium text-slate-700">
                                    {data.documento.firma_autoridad && <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs inline-block w-fit">{data.documento.firma_autoridad}</span>}
                                    {data.documento.firma_responsable && <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs inline-block w-fit">{data.documento.firma_responsable}</span>}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-50">
                                <Button 
                                  onClick={() => router.push(`/estudiante/tramites/seguimiento/${params.id}/documento`)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-600/20 transition-transform active:scale-95"
                                >
                                  Ver documento
                                </Button>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-center gap-3">
                               <div className="bg-white p-3 rounded-[1.5rem] border border-slate-200 shadow-sm">
                                 {/* Safe way to construct the verification URL on the client */}
                                 <img 
                                   src={`/api/qr?data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : '') + '/verificacion?codigo=' + data.documento.codigo_verificacion)}`}
                                   alt="QR Verificación"
                                   className="w-32 h-32 mix-blend-multiply"
                                 />
                               </div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center max-w-[140px]">
                                 Escanea para verificar la autenticidad
                               </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 p-5 rounded-2xl border border-emerald-200 flex items-center gap-3">
                          <Loader2 className="animate-spin text-emerald-600" size={20} />
                          <span className="text-sm font-black text-emerald-800 uppercase tracking-widest">Esperando subida de PDF certificado...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 py-7 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8C1B1B] via-[#5E7693] to-[#8C1B1B]" />
                      <div className="w-14 h-14 rounded-full bg-[#8C1B1B]/10 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#8C1B1B]" size={28} />
                      </div>
                      <div className="text-center max-w-lg px-6">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{sending ? "Enviando tu tr\u00e1mite..." : "Tu tr\u00e1mite fue enviado correctamente."}</h3>
                        <p className="text-sm text-slate-500 font-bold mt-1 leading-relaxed">{sendSuccess || "El \u00e1rea de tr\u00e1mites procesar\u00e1 tu solicitud en un plazo aproximado de 48 horas."}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-2xl px-6 pt-2">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                          <p className="text-xs font-black text-slate-800 mt-1">{data.tramite.estado_nombre}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código</p>
                          <p className="text-xs font-black text-slate-800 mt-1">{data.tramite.codigo_seguimiento}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y hora</p>
                          <p className="text-xs font-black text-slate-800 mt-1">
                            {sentAt
                              ? new Date(sentAt).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : "Registrado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
