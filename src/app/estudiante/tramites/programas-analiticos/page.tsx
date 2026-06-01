"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText, Check, ArrowLeft, AlertCircle, ShoppingCart,
  Trash2, Plus, Minus, UploadCloud, CheckCircle2,
  Download, Receipt, BookOpen, Info, Loader2, CreditCard, X
} from "lucide-react";

const STEPS = [
  "Inicio",
  "Pago",
  "Verificación de cajero",
  "Biblioteca",
  "Factura",
  "Trámite"
];

interface TipoTramite {
  id: number;
  nombre: string;
  descripcion: string;
  price: number;
}

interface FacturaState {
  numero_factura?: string | null;
  nombre_factura?: string | null;
  nit_ci?: string | null;
  razon_social?: string | null;
  direccion?: string | null;
  correo_envio?: string | null;
  monto_total?: string | number | null;
  ruta_pdf_factura?: string | null;
}

export default function ProgramasAnaliticosWizard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  const [tiposTramite, setTiposTramite] = useState<TipoTramite[]>([]);
  const [carreras, setCarreras] = useState<{ id_carrera: number, nombre: string }[]>([]);
  const [solvenciaState, setSolvenciaState] = useState<any>(null);

  const [formData, setFormData] = useState({
    carrera: '',
    anio: ''
  });
  const [studentProfile, setStudentProfile] = useState({
    nombre: '',
    ci: '',
    complemento: '',
    tipoEstudiante: 'REGULAR',
    email: ''
  });
  const [invoiceData, setInvoiceData] = useState({
    nombre: '',
    nit_ci: '',
    razon_social: '',
    direccion: '',
    correo_envio: ''
  });
  const [facturaState, setFacturaState] = useState<FacturaState | null>(null);

  const [cart, setCart] = useState<{ id: number, name: string, price: number, qty: number }[]>([]);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [createdTramiteId, setCreatedTramiteId] = useState<number | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [tramiteEstado, setTramiteEstado] = useState<string | null>(null);
  const [hasDocument, setHasDocument] = useState<boolean>(false);

  useEffect(() => {
    async function resumeProgress() {
      if (!user?.id_usuario) return;
      try {
        setLoading(true);
        const searchParams = new URLSearchParams(window.location.search);
        const idTramiteParam = searchParams.get('id');
        const modeParam = searchParams.get('mode');

        if (modeParam === 'new') {
          // Si el usuario explícitamente pide uno nuevo, no restauramos nada
          setLoading(false);
          return;
        }

        let url = `/api/estudiante/tramites/active?userId=${user.id_usuario}`;
        if (idTramiteParam) {
          // Si hay un ID específico, lo buscamos directamente
          // Pero usaremos la misma lógica de active para asegurar que esté "en curso"
          url = `/api/estudiante/tramites/seguimiento/${idTramiteParam}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (idTramiteParam) {
          if (res.ok && data.tramite) {
            router.replace(`/estudiante/tramites/seguimiento/${idTramiteParam}`);
            return;
          } else {
            // Si la API falla o no existe, redirigimos a historial
            router.replace('/estudiante/tramites/historial');
            return;
          }
        } else if (data.active) {
          // Si tiene uno activo pero entró sin ID, mejor lo enviamos a seguimiento para que vea su activo
          router.replace(`/estudiante/tramites/seguimiento/${data.tramite.id_tramite}`);
          return;
        }
      } catch (err) {
        console.error("Error resuming progress:", err);
      } finally {
        setLoading(false);
      }
    }
    resumeProgress();
  }, [user?.id_usuario]);

  const saveProgress = async (nextStep: number) => {
    if (!user?.id_usuario) return;
    try {
      const res = await fetch('/api/estudiante/tramites/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id_usuario,
          paso_actual: nextStep,
          id_tramite: createdTramiteId,
          cart: cart
        })
      });
      const data = await res.json();
      if (data.success && data.id_tramite) {
        setCreatedTramiteId(data.id_tramite);
        if (data.codigo_seguimiento) setTrackingCode(data.codigo_seguimiento);

        // Si creamos un trámite nuevo (veníamos de mode=new), actualizamos la URL para persistencia en refresh
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('mode') === 'new') {
          router.replace(`/estudiante/tramites/programas-analiticos?id=${data.id_tramite}`);
        }
      }
    } catch (err) {
      console.error("Error auto-saving progress:", err);
    }
  };

  const [trackingCode, setTrackingCode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OBSERVADO'>('PENDIENTE');
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = user?.id_usuario;
      const [resTipos, resCarreras, resPerfil, resSolv] = await Promise.all([
        fetch('/api/tipos-tramite'),
        fetch('/api/carreras'),
        userId ? fetch(`/api/estudiante/perfil?userId=${userId}`) : null,
        userId ? fetch(`/api/estudiante/solvencia?userId=${userId}`) : null,
      ]);
      const [dataTipos, dataCarreras] = await Promise.all([resTipos.json(), resCarreras.json()]);
      setTiposTramite(dataTipos);
      setCarreras(dataCarreras);

      if (resPerfil && resSolv) {
        const dataPerfil = await resPerfil.json();
        if (resPerfil.ok && dataPerfil.perfil) {
          const perfil = dataPerfil.perfil;
          const nombreCompleto = `${perfil.nombres || user?.nombres || ''} ${perfil.apellidos || user?.apellidos || ''}`.trim();
          setStudentProfile({
            nombre: nombreCompleto,
            ci: perfil.ci || '',
            complemento: perfil.complemento_ci || '',
            tipoEstudiante: perfil.tipo_estudiante || 'REGULAR',
            email: perfil.correo_institucional || ''
          });
          setFormData(prev => ({
            ...prev,
            carrera: prev.carrera || perfil.carrera || '',
            anio: prev.anio || (perfil.anio_titulacion ? String(perfil.anio_titulacion) : '')
          }));
          setInvoiceData(prev => ({
            nombre: prev.nombre || '',
            nit_ci: prev.nit_ci || '',
            razon_social: prev.razon_social || '',
            direccion: prev.direccion || '',
            correo_envio: prev.correo_envio || ''
          }));
        }
        const dataSolv = await resSolv.json();
        setSolvenciaState(dataSolv);
      }
    } catch (error) {
      console.error("Error fetching wizard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id_usuario) {
      fetchData();
    }
  }, [user?.id_usuario]);

  const checkWizardStatus = async () => {
    if (!createdTramiteId) return;
    try {
      const res = await fetch(`/api/estudiante/tramites/seguimiento/${createdTramiteId}`);
      const data = await res.json();
      if (res.ok) {
        if (data.tramite) {
          setTramiteEstado(data.tramite.estado_codigo);
        }
        if (data.documento) {
          setHasDocument(true);
        }
        if (data.pago) {
          setPaymentStatus(data.pago.voucher_estado || 'PENDIENTE');
          setRejectionReason(data.pago.voucher_observacion || "");
        }
        if (data.factura) {
          setFacturaState(data.factura);
        }
        if (data.solvencia) {
          setSolvenciaState(data.solvencia);
          if (data.solvencia.estado_solvencia === 'SIN_DEUDAS' || data.solvencia.estado_solvencia === 'SOLVENTE') {
            setCurrentStep(4);
          }
        }
      }
    } catch (error) {
      console.error("Error polling status:", error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    // Poll in Step 2 (Payment Approval)
    const isWaitingPayment = currentStep === 2 && createdTramiteId && (paymentStatus === 'PENDIENTE' || paymentStatus === 'OBSERVADO');
    // Poll in Step 3 (Library/Biblioteca)
    const isWaitingSolvencia = currentStep === 3 && createdTramiteId && (solvenciaState?.estado_solvencia === 'PENDIENTE_VERIFICACION' || solvenciaState?.estado_solvencia === 'CON_DEUDAS');

    if (isWaitingPayment || isWaitingSolvencia) {
      interval = setInterval(checkWizardStatus, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep, createdTramiteId, paymentStatus, solvenciaState?.estado_solvencia]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVoucherFile(e.target.files[0]);
    }
  };

  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Guardar progreso automáticamente
      if (nextStep >= 1) {
        await saveProgress(nextStep);
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!user) return;
    try {
      setIsLoadingAction(true);

      const paymentForm = new FormData();
      paymentForm.append('userId', user.id_usuario.toString());
      paymentForm.append('items', JSON.stringify(cart.map(i => ({ id: i.id, price: i.price }))));
      paymentForm.append('totalPrice', cartTotal.toString());
      paymentForm.append('studentData', JSON.stringify(formData));
      paymentForm.append('invoiceData', JSON.stringify(invoiceData));
      if (voucherFile) {
        paymentForm.append('voucher', voucherFile);
      }

      const res = await fetch('/api/estudiante/pago/confirmar', {
        method: 'POST',
        body: paymentForm
      });

      if (res.ok) {
        const data = await res.json();
        const mainTramite = data.tramites?.[0];
        if (mainTramite) {
          router.replace(`/estudiante/tramites/seguimiento/${mainTramite.id}`);
        } else {
          router.replace('/estudiante/tramites/historial');
        }
      } else {
        const errorData = await res.json();
        alert(`Error al procesar el pago: ${errorData.error || "Intenta de nuevo"}`);
      }
    } catch (error) {
      console.error("Error confirming payment in wizard:", error);
      alert("Error de conexión al procesar el pago.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleStepBack = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const addToCart = (trm: TipoTramite) => {
    const existing = cart.find(i => i.id === trm.id);
    if (existing) {
      setCart(cart.map(i => i.id === trm.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { id: trm.id, name: trm.nombre, price: trm.price, qty: 1 }]);
    }
  };
  const updateQty = (id: number, delta: number) => {
    setCart(cart.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : i;
      }
      return i;
    }));
  };
  const removeCartItem = (id: number) => setCart(cart.filter(i => i.id !== id));
  const emptyCart = () => setCart([]);
  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  const totalItems = cart.reduce((acc, curr) => acc + curr.qty, 0);

  const isFormComplete = formData.carrera.trim().length > 0 && formData.anio.trim().length > 0;
  const isInvoiceComplete = invoiceData.nombre.trim().length > 0 && invoiceData.nit_ci.trim().length > 0 && invoiceData.razon_social.trim().length > 0;
  const canProceedPagos = cartTotal > 0 && voucherFile !== null && isInvoiceComplete;

  const renderStepper = () => {
    return (
      <Card className="mb-10 border-0 shadow-sm rounded-[3rem] px-12 py-10 bg-white overflow-hidden">
        <div className="flex justify-between items-center relative w-full px-8">
          <div className="absolute left-[10%] right-[10%] top-[1.1rem] h-[1px] bg-slate-100 z-0"></div>

          <div
            className="absolute left-[10%] top-[1.1rem] h-[1px] bg-univalle-primary z-0 transition-all duration-300"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 80}%` }}
          ></div>

          {STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            const canGoBack = idx < currentStep;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleStepBack(idx)}
                disabled={!canGoBack}
                className={cn(
                  "flex flex-col items-center gap-3 relative z-10 bg-white px-3 group transition-all",
                  canGoBack ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
                )}
              >
                {canGoBack && (
                  <div className="absolute -top-6 h-6 w-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-univalle-primary group-hover:text-white transition-colors">
                    <ArrowLeft size={13} strokeWidth={3} />
                  </div>
                )}
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500",
                    (isActive || isCompleted)
                      ? "bg-univalle-primary text-white scale-110 shadow-lg shadow-univalle-primary/20"
                      : "bg-white text-slate-300 border-2 border-slate-100"
                  )}
                >
                  {isCompleted ? <Check size={18} strokeWidth={4} /> : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest text-center",
                  (isActive || isCompleted) ? "text-slate-800" : "text-slate-300"
                )}>
                  {step}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-univalle-primary" size={48} />
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Cargando recursos...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-12 px-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 rounded-3xl bg-red-50 text-univalle-primary flex items-center justify-center mx-auto mb-8 shadow-inner shadow-red-100/50 ring-1 ring-red-100">
              <BookOpen size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Trámite de Programas Analíticos</h2>
            <p className="text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed font-medium">
              Obtén tus programas analíticos certificados de manera 100% digital. Sigue los pasos para completar tu solicitud.
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-3xl max-w-2xl mx-auto p-8 text-left mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-univalle-primary/10 text-univalle-primary rounded-lg">
                  <Info size={18} />
                </div>
                <span className="font-black text-xs uppercase tracking-widest text-slate-800">Requisitos indispensables</span>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-center text-sm text-slate-600 font-bold">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  MATRICULACIÓN VIGENTE
                </li>
                <li className="flex gap-3 items-center text-sm text-slate-600 font-bold">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  NO TENER DEUDAS EN BIBLIOTECA
                </li>
                <li className="flex gap-3 items-center text-sm text-slate-600 font-bold">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  PAGO DE ARANCELES (BS. 50 POR PROGRAMA)
                </li>
              </ul>
            </div>
            <div className="mt-12 flex gap-4 justify-center">
              <Button disabled variant="outline" className="w-48 h-12 rounded-xl">Anterior</Button>
              <Button onClick={handleNext} className="w-48 h-12 bg-univalle-primary hover:bg-univalle-hover text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-univalle-primary/20 transition-all hover:scale-105">Empezar ahora</Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="py-12 animate-in fade-in slide-in-from-right-4">
            {/* Sección de Datos de Estudiante */}
            <div className="px-8 sm:px-16 max-w-3xl mx-auto mb-16">
              <h3 className="text-3xl font-black mb-2 text-slate-900 tracking-tight text-center">Tus Datos de Estudiante</h3>
              <p className="text-slate-500 text-center text-sm mb-12 font-medium">Confirma que la información sea correcta antes de proseguir.</p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombres y Apellidos</label>
                    <Input value={studentProfile.nombre || `${user?.nombres} ${user?.apellidos}`} disabled className="bg-slate-50 border-0 rounded-xl text-slate-900 h-12 font-bold focus:ring-0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Código Estudiante</label>
                    <Input value={user?.codigo_login} disabled className="bg-slate-50 border-0 rounded-xl text-slate-900 h-12 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula de Identidad</label>
                    <Input value={studentProfile.ci || 'Sin registrar'} disabled className="bg-slate-50 border-0 rounded-xl text-slate-900 h-12 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Complemento</label>
                    <Input value={studentProfile.complemento || 'Sin complemento'} disabled className="bg-slate-50 border-0 rounded-xl text-slate-900 h-12 font-bold" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de estudiante</label>
                    <Input value={studentProfile.tipoEstudiante} disabled className="bg-slate-50 border-0 rounded-xl text-slate-900 h-12 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Carrera <span className="text-red-500">*</span></label>
                  <select
                    className="w-full flex h-12 rounded-xl border-0 bg-slate-50 px-4 py-2 text-sm text-slate-900 font-bold focus:ring-2 focus:ring-univalle-primary transition-all shadow-sm"
                    value={formData.carrera}
                    onChange={(e) => setFormData({ ...formData, carrera: e.target.value })}
                  >
                    <option value="" disabled>Selecciona tu carrera actual</option>
                    {carreras.map(c => (
                      <option key={c.id_carrera} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Año de Ingreso / Titulación <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="Ej: 2024"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    className="bg-slate-100 border-0 rounded-xl text-slate-900 h-12 font-bold placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-10 mx-16"></div>

            {/* Sección de Selección de Trámite y Pago */}
            <div className="px-8">
              <h3 className="text-2xl font-black mb-10 text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-univalle-primary/10 text-univalle-primary rounded-xl">
                  <ShoppingCart size={24} />
                </div>
                Selecciona tus trámites y realiza el pago
              </h3>

              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiposTramite.filter(t => t.id !== 0).map(t => (
                    <Card key={t.id} className="border-0 shadow-sm rounded-2xl bg-white hover:shadow-xl transition-all hover:-translate-y-1 group">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-univalle-primary/10 group-hover:text-univalle-primary rounded-xl transition-colors">
                            <FileText size={20} />
                          </div>
                          <span className="font-black text-lg text-univalle-action">BS. {t.price}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-[15px] leading-tight mb-2 h-10 line-clamp-2">{t.nombre}</h4>
                        <p className="text-[11px] text-slate-400 mb-6 font-medium leading-relaxed">{t.descripcion || 'Servicio académico para estudiantes regulares.'}</p>
                        <Button onClick={() => addToCart(t)} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all group-active:scale-95">
                          Añadir al carrito
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="lg:w-1/3">
                  <div className="border border-slate-100 rounded-[32px] bg-white p-8 sticky top-4 shadow-2xl shadow-slate-200/50">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-5 mb-6">
                      <h4 className="font-black text-sm uppercase tracking-widest text-slate-800">CARRITO DE COMPRA</h4>
                      <span className="bg-univalle-primary text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">{totalItems}</span>
                    </div>

                    {cart.length === 0 ? (
                      <div className="text-center py-12 opacity-30 flex flex-col items-center gap-3 scale-75">
                        <ShoppingCart size={64} />
                        <p className="font-black uppercase tracking-tighter text-sm">Tu bolsa está vacía</p>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {cart.map(item => (
                          <div key={item.id} className="bg-slate-50/50 border border-slate-50 p-4 rounded-2xl animate-in slide-in-from-right-2">
                            <div className="flex justify-between items-start w-full">
                              <span className="font-bold text-[11px] text-slate-700 leading-tight pr-4">{item.name}</span>
                              <button onClick={() => removeCartItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                              <div className="flex items-center bg-white rounded-lg shadow-sm px-2">
                                <button onClick={() => updateQty(item.id, -1)} className="p-1.5 text-slate-400 hover:text-univalle-primary transition-colors"><Minus size={10} /></button>
                                <span className="text-xs font-black text-slate-800 px-2">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="p-1.5 text-slate-400 hover:text-univalle-primary transition-colors"><Plus size={10} /></button>
                              </div>
                              <span className="font-black text-xs text-univalle-action">BS. {item.price * item.qty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-10 pt-6 border-t border-slate-100">
                      <span className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Monto Total</span>
                      <span className="font-black text-univalle-action text-2xl tracking-tighter">Bs. {cartTotal}</span>
                    </div>

                    {cartTotal > 0 && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pago QR Simple</label>
                          <div className="border-2 border-dashed border-emerald-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center bg-white relative group overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setShowQrModal(true)}
                              className="w-52 h-52 bg-white p-3 rounded-2xl shadow-lg border border-slate-100 mb-4 transition-transform group-hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                              aria-label="Ver QR de pago en grande"
                            >
                              <img
                                src="/img/qr-bnb.png"
                                alt="QR de pago BNB"
                                className="w-full h-full object-contain"
                              />
                            </button>
                            <p className="text-[11px] font-black text-slate-900 leading-relaxed">
                              Monto: Bs. {cartTotal.toFixed(2)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed mt-2">
                              Pagar a: Guarachi Ramos Vania<br />
                              Cuenta destino: 3503861630<br />
                              Concepto: Trámite Univalle
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {voucherFile ? (
                            <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-4 flex items-center gap-4 animate-in zoom-in">
                              <div className="p-2 bg-emerald-500 text-white rounded-full">
                                <Check size={16} strokeWidth={4} />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-0.5">Voucher Cargado</p>
                                <p className="text-[11px] text-emerald-600 font-bold truncate">{voucherFile.name}</p>
                              </div>
                              <label className="text-[10px] font-black text-univalle-primary hover:underline cursor-pointer">
                                CAMBIAR
                                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileUpload} />
                              </label>
                            </div>
                          ) : (
                            <label className="w-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white h-12 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer shadow-lg shadow-slate-200 transition-all hover:-translate-y-1">
                              <UploadCloud size={16} className="mr-3" /> Subir Comprobante
                              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileUpload} />
                            </label>
                          )}
                          <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest opacity-60">Formatos permitidos: JPG, PNG, PDF</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 mt-10">
              <div className="border-t border-slate-100 pt-10">
                <div className="max-w-5xl mx-auto bg-[#FAF7FF] border-2 border-purple-50 rounded-[2rem] p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                      <Receipt size={22} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Datos para la factura</h3>
                      <p className="text-sm text-slate-500 font-medium">El cajero usará estos datos registrados para emitir la factura.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre factura <span className="text-red-500">*</span></label>
                      <Input value={invoiceData.nombre} onChange={(e) => setInvoiceData({ ...invoiceData, nombre: e.target.value })} className="bg-white border-slate-100 rounded-xl h-12 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NIT / CI <span className="text-red-500">*</span></label>
                      <Input value={invoiceData.nit_ci} onChange={(e) => setInvoiceData({ ...invoiceData, nit_ci: e.target.value })} className="bg-white border-slate-100 rounded-xl h-12 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Correo de envío</label>
                      <Input value={invoiceData.correo_envio} onChange={(e) => setInvoiceData({ ...invoiceData, correo_envio: e.target.value })} className="bg-white border-slate-100 rounded-xl h-12 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Razón social <span className="text-red-500">*</span></label>
                      <Input value={invoiceData.razon_social} onChange={(e) => setInvoiceData({ ...invoiceData, razon_social: e.target.value })} className="bg-white border-slate-100 rounded-xl h-12 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección</label>
                      <Input value={invoiceData.direccion} onChange={(e) => setInvoiceData({ ...invoiceData, direccion: e.target.value })} placeholder="No especificado" className="bg-white border-slate-100 rounded-xl h-12 font-bold" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 flex gap-4 justify-center border-t border-slate-50 pt-10">
              <Button onClick={handlePrev} variant="ghost" className="w-[48%] h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Anterior</Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={!canProceedPagos || !isFormComplete || isLoadingAction}
                className={cn(
                  "w-[48%] h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all",
                  (canProceedPagos && isFormComplete && isInvoiceComplete) ? "bg-univalle-primary text-white hover:bg-univalle-hover shadow-univalle-primary/20" : "bg-slate-100 text-slate-300 pointer-events-none"
                )}
              >
                {isLoadingAction ? <Loader2 className="animate-spin" size={18} /> : "Proceder al Pago"}
              </Button>
            </div>
          </div>
        );

      case 2:
        const isRejected = paymentStatus === 'RECHAZADO' || paymentStatus === 'OBSERVADO';

        return (
          <div className="py-12 px-8 sm:px-16 animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto text-center">
            {(paymentStatus === 'PENDIENTE') && (
              <div className="space-y-8 animate-pulse">
                <div className="w-24 h-24 bg-univalle-primary/10 text-univalle-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 size={48} className="animate-spin" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Validando tu Pago</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                  Un cajero de Univalle está revisando tu comprobante ahora mismo.
                  <br /><span className="text-univalle-primary font-bold">Por favor, espera en esta pantalla.</span>
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button onClick={checkWizardStatus} variant="outline" className="rounded-xl px-8 h-12 font-bold uppercase text-[10px] tracking-widest">Verificar ahora</Button>
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="ghost"
                    className="text-slate-400 font-black hover:text-univalle-primary transition-colors text-[10px] uppercase tracking-widest"
                  >
                    Volver a subir comprobante
                  </Button>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="space-y-8">
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={48} />
                </div>
                <h3 className="text-3xl font-black text-red-600 tracking-tight">Pago Rechazado</h3>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-left max-w-md mx-auto">
                  <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-2">Motivo del rechazo:</p>
                  <p className="text-red-700 font-medium">{rejectionReason || "El comprobante no es legible o no corresponde al monto indicado."}</p>
                </div>
                <Button onClick={() => setCurrentStep(1)} className="bg-slate-900 text-white rounded-xl px-10 h-12 uppercase font-black tracking-widest text-[10px]">
                  Volver a subir comprobante
                </Button>
              </div>
            )}

            {paymentStatus === 'APROBADO' && (
              <div className="space-y-8">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-3xl font-black text-emerald-600 tracking-tight">Pago Aprobado</h3>
                <p className="text-slate-500 font-medium">Tu pago ha sido validado. Ahora debemos verificar tu solvencia en biblioteca.</p>
                <Button onClick={handleNext} className="bg-univalle-primary text-white rounded-xl px-10 h-12 uppercase font-black tracking-widest text-[10px] shadow-lg shadow-univalle-primary/20">
                  Continuar a Biblioteca
                </Button>
              </div>
            )}
          </div>
        );

      case 3:
        const isSolventeAtStep3 = solvenciaState?.estado_solvencia === 'SIN_DEUDAS' || solvenciaState?.estado_solvencia === 'SOLVENTE';
        const hasDebtsAtStep3 = solvenciaState?.estado_solvencia === 'CON_DEUDAS';
        const deudasAtStep3 = solvenciaState?.deudas || [];
        const isWaitingAtStep3 = !isSolventeAtStep3 && !hasDebtsAtStep3;
        const totalPriceValueAtStep3 = cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2);
        const fechaSolicitudAtStep3 = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        return (
          <div className="py-8 px-4 sm:px-8 animate-in fade-in slide-in-from-right-4">
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                <div className="lg:col-span-2 space-y-10">
                  <Card className="border-0 shadow-sm rounded-[3rem] overflow-hidden bg-white">
                    <div className="p-10 pb-12">
                      <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight mb-12">Verificación de Biblioteca</h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-12">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Fecha de Solicitud</p>
                          <p className="text-xl font-bold text-slate-700">{fechaSolicitudAtStep3}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Estado de Solvencia</p>
                          <div className="flex items-center gap-2">
                            <span className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.1em] shadow-lg bg-[#5E7693] text-white shadow-slate-200">
                              {isSolventeAtStep3 ? 'SOLVENTE' : (hasDebtsAtStep3 ? 'CON OBSERVACIONES' : 'EN REVISIÓN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#F8FAFC] rounded-[2rem] p-10 border border-slate-100 flex gap-6 items-start">
                        <div className="bg-blue-500 text-white p-2 rounded-lg mt-0.5">
                          <Info size={20} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-black text-slate-800 uppercase tracking-[0.1em] text-xs">Nota de Biblioteca</h4>
                          <p className="text-slate-500 text-[15px] leading-relaxed font-medium">
                            Estamos verificando que no tengas libros pendientes o deudas en el sistema de biblioteca. Este proceso es obligatorio para certificar tus programas.
                          </p>
                        </div>
                      </div>

                      {hasDebtsAtStep3 && (
                        <div className="mt-10 bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-10 space-y-6 shadow-sm animate-in zoom-in-95">
                          <div className="flex items-center gap-4 text-red-600">
                            <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-200">
                              <AlertCircle size={28} strokeWidth={3} />
                            </div>
                            <h4 className="text-2xl font-black uppercase tracking-tight">Deudas Detectadas</h4>
                          </div>

                          <div className="space-y-3 pt-2">
                            {deudasAtStep3.map((deuda: any, idx: number) => (
                              <div key={idx} className="bg-white p-6 rounded-[2rem] flex justify-between items-center border border-red-100">
                                <div>
                                  <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-1">{deuda.tipo_deuda}</p>
                                  <p className="text-sm text-red-700 font-bold">{deuda.descripcion}</p>
                                </div>
                                <p className="text-2xl font-black text-red-900 italic">Bs. {deuda.monto}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isWaitingAtStep3 && (
                        <div className="mt-10 py-20 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                          <Loader2 className="animate-spin text-univalle-primary" size={40} />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Consultando solvencia...</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="space-y-10">
                  <Card className="border-0 shadow-xl rounded-[3rem] bg-gradient-to-br from-[#EEF6FF] to-[#E3EFFF] border border-blue-100 overflow-hidden">
                    <CardContent className="p-10 space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-500 text-white p-3 rounded-2xl shadow-lg">
                          <CreditCard size={24} />
                        </div>
                        <h4 className="text-xl font-black text-blue-900 tracking-tight">Finanzas</h4>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 opacity-60">Monto total liquidado</p>
                          <p className="text-4xl font-black text-blue-950 tracking-tighter italic">Bs. {totalPriceValueAtStep3}</p>
                        </div>
                        <div className="pt-6 border-t border-blue-200/50">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 opacity-60">Situación Financiera</p>
                          <span className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-md inline-block bg-emerald-500 text-white">
                            PAGADO
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex gap-4 justify-center border-t border-slate-100 pt-10">
                <Button onClick={handlePrev} variant="ghost" className="w-1/3 h-14 rounded-2xl font-bold uppercase text-[10px] tracking-widest text-slate-400">Anterior</Button>
                <Button
                  onClick={handleNext}
                  className={cn(
                    "w-2/3 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all",
                    isSolventeAtStep3 ? "bg-univalle-primary text-white hover:bg-univalle-hover shadow-univalle-primary/20" : "bg-slate-100 text-slate-300 pointer-events-none"
                  )}
                >
                  {isSolventeAtStep3 ? 'Generar Factura' : 'Esperando Solvencia'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 4:
        const facturaUrl = facturaState?.ruta_pdf_factura || null;
        return (
          <div className="py-12 px-8 sm:px-16 animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto text-center">
            <div className="space-y-10 animate-in zoom-in-95 duration-500">
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50">
                  <Receipt size={40} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-3">Tu Factura</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Descarga el comprobante oficial de tu trámite certificado.</p>
              </div>

              <Card className="border-2 border-dashed border-emerald-100 shadow-sm rounded-[2rem] bg-emerald-50/40">
                <CardContent className="p-10 flex flex-col items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                    <Download size={30} />
                  </div>
                  {facturaUrl && (
                    <Button
                      onClick={() => window.open(facturaUrl, '_blank')}
                      className="w-full sm:w-72 h-14 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 transition-all gap-2"
                    >
                      <Download size={18} /> Descargar factura
                    </Button>
                  )}
                  {!facturaUrl && (
                    <div className="w-full sm:w-72 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black uppercase text-xs tracking-widest">
                      Factura pendiente
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handlePrev} variant="ghost" className="h-12 px-10 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500 gap-2">
                  <ArrowLeft size={16} /> Anterior
                </Button>
                <Button
                  onClick={handleNext}
                  className="h-12 px-10 bg-univalle-primary text-white hover:bg-univalle-hover rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-univalle-primary/20 transition-all"
                >
                  Finalizar Solicitud
                </Button>
              </div>
            </div>
          </div>
        );

      case 5:
        const isFinalized = tramiteEstado === 'FINALIZADO' || tramiteEstado === 'TRAMITE_COMPLETADO' || hasDocument;
        return (
          <div className="py-16 px-8 sm:px-16 animate-in fade-in slide-in-from-bottom-10 duration-700 max-w-3xl mx-auto text-center">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-200 rotate-12 transition-transform hover:rotate-0">
              <CheckCircle2 size={56} strokeWidth={1.5} />
            </div>

            <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">
              {isFinalized ? '¡Trámite Finalizado!' : '¡Solicitud Enviada!'}
            </h3>
            <p className="text-slate-500 text-lg mb-12 font-medium max-w-md mx-auto">
              {isFinalized 
                ? 'Tu documento ha sido emitido exitosamente. Puedes descargarlo en la pantalla de seguimiento.'
                : 'Tu proceso ha sido registrado. Puedes hacer seguimiento con el siguiente código oficial:'}
            </p>

            <div className="bg-white p-8 border-2 border-slate-100 rounded-[32px] inline-block mb-12 shadow-2xl shadow-slate-200/50 relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-univalle-primary text-white text-[9px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] shadow-lg">CÓDIGO DE SEGUIMIENTO</div>
              <p className="text-4xl font-black text-univalle-action tracking-[0.1em] font-mono group-hover:scale-105 transition-transform">{trackingCode}</p>
            </div>

            {!isFinalized && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-lg mx-auto">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Próximo paso</p>
                  <p className="font-bold text-slate-800 text-sm">Validación administrativa Univalle en curso.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tiempo estimado</p>
                  <p className="font-bold text-slate-800 text-sm">24 a 48 horas hábiles.</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push(createdTramiteId ? `/estudiante/tramites/seguimiento/${createdTramiteId}` : '/estudiante/tramites/historial')}
                className="h-14 px-10 bg-univalle-primary hover:bg-univalle-hover text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-univalle-primary/20"
              >
                {isFinalized ? 'Ver Documento Emitido' : 'Ver Seguimiento'}
              </Button>
              <Button
                onClick={() => router.push('/estudiante/tramites/historial')}
                variant="outline"
                className="h-14 px-10 border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-600 hover:bg-slate-50"
              >
                Ir a Mis Trámites
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4">
      {showQrModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl p-5 sm:p-8 max-w-lg w-full relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 h-10 w-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Cerrar QR"
            >
              <X size={22} />
            </button>
            <div className="pt-8 flex flex-col items-center text-center">
              <img
                src="/img/qr-bnb.png"
                alt="QR de pago BNB ampliado"
                className="w-full max-w-[420px] aspect-square object-contain"
              />
              <p className="mt-5 text-sm font-black text-slate-900">Monto: Bs. {cartTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 pt-4">
        <button
          onClick={() => router.push('/estudiante/dashboard')}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-univalle-primary transition-colors group"
        >
          <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-50 group-hover:bg-univalle-primary group-hover:text-white transition-all">
            <ArrowLeft size={16} />
          </div>
          Cerrar Asistente
        </button>
      </div>

      {renderStepper()}

      <Card className="border-0 shadow-2xl rounded-[40px] bg-white overflow-hidden min-h-[600px] ring-1 ring-slate-100">
        <CardContent className="p-0">
          {renderContent()}
        </CardContent>
      </Card>

    </div>
  );
}
