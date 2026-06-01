"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Check, X, Image as ImageIcon,
  FileEdit, Loader2, Info, Upload,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface Pago {
  id_pago: number;
  id_tramite: number;
  amount: number;
  date: string;
  status: string;
  metodo_pago: string;
  rejection_reason?: string;
  nombres: string;
  apellidos: string;
  email: string;
  code: string;
  semestre: string;
  carrera: string;
  tramite: string;
  voucher: string | null;
  id_comprobante_pago: number;
  id_factura?: number;
  numero_factura?: string;
  ruta_pdf_factura?: string;
  nombre_factura?: string;
  nit_ci?: string;
  razon_social?: string;
  direccion?: string;
  correo_envio?: string;
  biblioteca_estado?: string | null;
}

export default function CajeroPagos() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    stats: { pendientes: 0, aceptados: 0, enviados: 0, total: 0 },
    pagos: [] as Pago[]
  });
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [invoicePdf, setInvoicePdf] = useState<File | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const voucherSrc = (voucher: string) => {
    if (voucher.startsWith('http')) return voucher;
    const normalized = voucher.replace(/\\/g, '/');
    if (normalized.startsWith('/uploads/')) return normalized;
    if (normalized.includes('/uploads/')) return normalized.slice(normalized.indexOf('/uploads/'));
    return `/uploads/vouchers/${normalized.split('/').pop()}`;
  };

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cajero/pagos');
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching cajero pagos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagos();
  }, []);

  const handleAction = async (action: 'APROBAR' | 'RECHAZAR') => {
    if (!selectedPago) return;
    if (action === 'RECHAZAR' && !rejectionReason.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/cajero/pagos/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pago: selectedPago.id_pago,
          action,
          reason: rejectionReason,
          id_usuario_cajero: user?.id_usuario,
          invoiceData: {
             nombre: selectedPago.nombre_factura || `${selectedPago.nombres} ${selectedPago.apellidos}`,
             nit_ci: selectedPago.nit_ci || selectedPago.code,
             razon_social: selectedPago.razon_social || selectedPago.nombre_factura || `${selectedPago.nombres} ${selectedPago.apellidos}`,
             direccion: selectedPago.direccion || "",
             correo_envio: selectedPago.correo_envio || selectedPago.email,
             ruta_pdf_factura: selectedPago.ruta_pdf_factura || `/facturas/FACT-${String(selectedPago.id_pago).padStart(5, '0')}.pdf`
          }
        })
      });

      if (res.ok) {
        setShowVerifyModal(false);
        setShowRejectModal(false);
        setRejectionReason("");
        if (action === 'APROBAR') {
          setSelectedPago(null);
        }
        await fetchPagos();
      } else {
        const data = await res.json();
        setSuccessMessage(data.error || "No se pudo procesar la acción.");
      }
    } catch (error) {
      console.error("Error validating payment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvoiceToStudent = async () => {
    if (!selectedPago) return;
    if (!invoicePdf) {
      setInvoiceError("Selecciona la factura en PDF antes de enviar.");
      return;
    }

    try {
      setSubmitting(true);
      setInvoiceError(null);
      const formData = new FormData();
      formData.append('id_pago', String(selectedPago.id_pago));
      formData.append('action', 'APROBAR');
      formData.append('id_usuario_cajero', String(user?.id_usuario || ''));
      formData.append('invoicePdf', invoicePdf);
      formData.append('invoiceData', JSON.stringify({
        nombre: selectedPago.nombre_factura || `${selectedPago.nombres} ${selectedPago.apellidos}`,
        nit_ci: selectedPago.nit_ci || selectedPago.code,
        razon_social: selectedPago.razon_social || selectedPago.nombre_factura || `${selectedPago.nombres} ${selectedPago.apellidos}`,
        direccion: selectedPago.direccion || "",
        correo_envio: selectedPago.correo_envio || selectedPago.email
      }));

      const res = await fetch('/api/cajero/pagos/validar', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "No se pudo enviar la factura.");

      setShowInvoiceModal(false);
      setShowVerifyModal(false);
      setSelectedPago(null);
      setInvoicePdf(null);
      await fetchPagos();
    } catch (error: unknown) {
      setInvoiceError(error instanceof Error ? error.message : "No se pudo enviar la factura.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPagos = data.pagos.filter(p => 
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tramite.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && data.pagos.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 px-4">
      {successMessage && (
        <div className="fixed top-6 right-6 z-[80] max-w-md rounded-2xl border border-red-100 bg-white px-5 py-4 shadow-2xl shadow-slate-900/10 flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="bg-red-100 text-red-600 rounded-full p-2">
            <Info size={18} />
          </div>
          <p className="text-sm font-black text-slate-700">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-slate-300 hover:text-slate-500">
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 py-6 border-b border-slate-200">
        <div>
          <h1 className="text-[28px] font-black text-slate-800 tracking-tight">Gestión de Pagos por QR</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Verifica y aprueba comprobantes de pago de los estudiantes</p>
        </div>

        <div className="relative mt-6 md:mt-0 w-full md:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            placeholder="Buscar por estudiante, código o trámite..." 
            className="pl-12 h-14 bg-white border-slate-200 rounded-2xl w-full shadow-sm text-base focus-visible:ring-univalle-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border-2 border-orange-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-orange-500/10 text-orange-600 p-2 w-fit rounded-lg mb-4">
            <Loader2 size={18} />
          </div>
          <span className="text-xs font-black text-orange-600/60 uppercase tracking-widest">Pendientes</span>
          <div className="text-3xl font-black text-orange-600 mt-1">{data.stats.pendientes}</div>
        </div>
        <div className="bg-white border-2 border-emerald-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-emerald-500/10 text-emerald-600 p-2 w-fit rounded-lg mb-4">
            <Check size={18} />
          </div>
          <span className="text-xs font-black text-emerald-600/60 uppercase tracking-widest">Aceptados</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{data.stats.aceptados}</div>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-slate-500/10 text-slate-600 p-2 w-fit rounded-lg mb-4">
            <Info size={18} />
          </div>
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Trámites</span>
          <div className="text-3xl font-black text-slate-700 mt-1">{data.stats.total}</div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {filteredPagos.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 shadow-inner">
             <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <ImageIcon size={40} />
             </div>
             <p className="text-slate-400 font-bold text-lg tracking-tight">No se encontraron pagos registrados</p>
             <p className="text-slate-300 text-sm mt-1">Intenta ajustando los filtros de búsqueda</p>
          </div>
        ) : (
          filteredPagos.map((pago) => (
            <Card key={pago.id_pago} className={cn(
               "border-2 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white",
               pago.status === 'PAGADO' ? "border-emerald-50 bg-emerald-50/5" : "border-slate-50"
            )}>
              <CardContent className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-5">
                    <h3 className="font-black text-2xl text-slate-800 tracking-tight leading-none">{pago.nombres} {pago.apellidos}</h3>
                    <span className={cn(
                      "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm",
                      pago.status === 'PENDIENTE' ? "bg-orange-500 text-white" :
                      pago.status === 'PAGADO' ? "bg-emerald-500 text-white" : 
                      pago.status === 'RECHAZADO' ? "bg-red-500 text-white" :
                      "bg-blue-500 text-white"
                    )}>
                      {pago.status === 'PAGADO' ? '✓ Aceptado' : pago.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 text-[15px]">
                    <div className="space-y-2">
                       <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1 opacity-50">Información del Estudiante</p>
                       <p className="text-slate-700"><span className="font-black">Código:</span> {pago.code}</p>
                       <p className="text-slate-700">
                         <span className="font-black">Trámite:</span> <span className="text-univalle-primary font-bold">{pago.tramite}</span>
                       </p>
                    </div>
                    <div className="space-y-2">
                       <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1 opacity-50">Detalle Financiero</p>
                       <p className="font-black text-xl text-slate-800">💰 Monto: Bs. {pago.amount}</p>
                       <p className="text-[12px] text-slate-400 font-medium">Emitido: {new Date(pago.date).toLocaleString('es-BO', { 
                         timeZone: 'America/La_Paz', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                       })}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4">
                    {pago.voucher ? (
                      <button 
                        onClick={() => { setSelectedPago(pago); setShowVerifyModal(true); }}
                        className="flex items-center gap-2 text-xs font-black text-blue-600 hover:bg-blue-600 hover:text-white transition-all bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 uppercase tracking-wider"
                      >
                        <ImageIcon size={16} />
                        <span>Comprobante QR: {pago.voucher.split('/').pop()}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 italic uppercase tracking-wider">
                        Sin comprobante adjunto
                      </div>
                    )}
                    
                    {pago.id_factura && (
                      <button className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 uppercase tracking-wider">
                        <FileEdit size={16} />
                        <span>Factura: {pago.ruta_pdf_factura?.split('/').pop() || pago.numero_factura || `FACT-${String(pago.id_pago).padStart(5, '0')}.pdf`}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0 pt-6 lg:pt-0 border-t lg:border-0 border-slate-100">
                  {pago.status === 'PENDIENTE' ? (
                    <>
                      <Button 
                        onClick={() => { setSelectedPago(pago); setShowVerifyModal(true); }}
                        className="h-14 px-8 text-sm font-black gap-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      >
                        <Eye size={20} /> VER DETALLES
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        onClick={() => { setSelectedPago(pago); setShowVerifyModal(true); }}
                        className="h-14 px-8 text-sm font-black gap-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl shadow-lg uppercase tracking-widest"
                      >
                        <Eye size={20} /> VER DETALLES
                      </Button>
                      {pago.status === 'PAGADO' && (
                        <>
                        </>
                      )}
                    </>
                  )}
                </div>

              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Verification Modal */}
      {showVerifyModal && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[92vh]">
             {/* Modal Header */}
             <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100">
               <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Verificación de Comprobante QR</h2>
                  <p className="text-slate-500 font-bold mt-1">Revisa cuidadosamente el comprobante antes de aprobar o rechazar</p>
               </div>
               <button onClick={() => setShowVerifyModal(false)} className="bg-slate-100 p-4 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                 <X size={28} />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0">
               <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-8 min-h-full">
                 {/* Voucher Panel */}
                 <div className="bg-[#FFF9E6] rounded-[2.5rem] p-5 md:p-6 flex flex-col items-center relative border border-orange-100 min-h-[520px]">
                    <div className="bg-white/40 backdrop-blur-sm p-4 rounded-2xl mb-6">
                      <span className="text-2xl">📱</span>
                    </div>
                    <h3 className="text-2xl font-black text-[#855D00] uppercase tracking-wider mb-6 text-center leading-tight">
                       COMPROBANTE<br/>DE PAGO QR
                    </h3>
                    
                    
                    <div className="w-full flex-1 min-h-0 bg-white rounded-3xl p-4 shadow-xl relative">
                      {selectedPago.voucher ? (
                        <div className="h-[58vh] max-h-[620px] min-h-[360px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                           <img 
                              src={voucherSrc(selectedPago.voucher)}
                              alt="Comprobante QR" 
                              className="w-full h-full object-contain p-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/400x500?text=Comprobante+QR";
                              }}
                           />
                        </div>
                      ) : (
                        <div className="h-[58vh] max-h-[620px] min-h-[360px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center text-slate-300 gap-3">
                           <ImageIcon size={64} />
                           <span className="font-bold">Sin imagen adjunta</span>
                        </div>
                      )}
                      
                    </div>
                 </div>

                 {/* Info Panels */}
                 <div className="space-y-6">
                    {/* Student Data */}
                    <div className="bg-[#EEF6FF] rounded-[2.5rem] p-10 border-2 border-blue-100 relative overflow-hidden group">
                       <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-200/20 rounded-full blur-3xl group-hover:bg-blue-300/30 transition-all duration-700"></div>
                       <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-8">
                             <div className="bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                               <ImageIcon size={24} />
                             </div>
                             <h4 className="text-2xl font-black text-blue-900 tracking-tight">Datos del Estudiante</h4>
                          </div>
                          
                          <div className="space-y-6">
                             <div>
                               <p className="text-xs font-black text-blue-600/60 uppercase tracking-widest mb-1">Nombre Completo</p>
                               <p className="text-2xl font-black text-blue-950">{selectedPago.nombres} {selectedPago.apellidos}</p>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <p className="text-xs font-black text-blue-600/60 uppercase tracking-widest mb-1">Código</p>
                                 <p className="text-xl font-black text-blue-900">{selectedPago.code}</p>
                               </div>
                               <div>
                                 <p className="text-xs font-black text-blue-600/60 uppercase tracking-widest mb-1">Semestre</p>
                                 <p className="text-xl font-black text-blue-900">{selectedPago.semestre || 'No reg.'} Semestre</p>
                               </div>
                             </div>

                             <div>
                               <p className="text-xs font-black text-blue-600/60 uppercase tracking-widest mb-1">Carrera</p>
                               <p className="text-xl font-black text-blue-900 leading-tight">{selectedPago.carrera || 'Administración de Empresas'}</p>
                             </div>

                             <div>
                               <p className="text-xs font-black text-blue-600/60 uppercase tracking-widest mb-1">Email</p>
                               <p className="text-lg font-bold text-blue-600 underline decoration-blue-200">{selectedPago.email}</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Invoice Data */}
                    <div className="bg-[#F9F5FF] rounded-[2.5rem] p-10 border-2 border-purple-100 relative overflow-hidden">
                       <div className="flex items-center gap-4 mb-8">
                          <div className="bg-purple-500 text-white p-3 rounded-2xl shadow-lg shadow-purple-500/20">
                            <FileEdit size={24} />
                          </div>
                          <h4 className="text-2xl font-black text-purple-900 tracking-tight">Datos para Facturar</h4>
                       </div>

                       <div className="space-y-6">
                          <div>
                            <p className="text-xs font-black text-purple-600/60 uppercase tracking-widest mb-1">Nombre / Razón Social</p>
                            <p className="text-2xl font-black text-purple-950">{selectedPago.nombre_factura || `${selectedPago.nombres} ${selectedPago.apellidos}`}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-xs font-black text-purple-600/60 uppercase tracking-widest mb-1">NIT / CI</p>
                               <p className="text-xl font-black text-purple-900">{selectedPago.nit_ci || selectedPago.code.replace('EST-', '')}</p>
                            </div>
                            <div>
                               <p className="text-xs font-black text-purple-600/60 uppercase tracking-widest mb-1">Dirección</p>
                               <p className="text-lg font-bold text-slate-500">{selectedPago.direccion || 'No especificado'}</p>
                            </div>
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
             </div>

             {/* Modal Footer Actions */}
             <div className="p-8 bg-slate-50 flex items-center gap-4">
               <Button 
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 h-16 bg-[#E11D48] hover:bg-red-700 text-white rounded-2xl text-lg font-black tracking-widest uppercase transition-all shadow-xl shadow-red-200 active:scale-95"
                  disabled={submitting}
               >
                 <X size={24} className="mr-2" /> RECHAZAR COMPROBANTE
               </Button>
               <Button 
                  onClick={() => {
                    setInvoicePdf(null);
                    setInvoiceError(null);
                    setShowInvoiceModal(true);
                  }}
                  className="flex-1 h-16 bg-[#059669] hover:bg-emerald-700 text-white rounded-2xl text-lg font-black tracking-widest uppercase transition-all shadow-xl shadow-emerald-200 active:scale-95"
                  disabled={submitting}
               >
                 {submitting ? <Loader2 size={24} className="animate-spin mr-2" /> : <Check size={24} className="mr-2" />} 
                 APROBAR PAGO
               </Button>
             </div>
          </div>
        </div>
      )}

      {/* Invoice Upload Modal */}
      {showInvoiceModal && selectedPago && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-500 flex flex-col max-h-[95vh]">
              <div className="p-6 md:p-10 overflow-y-auto">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 tracking-tight">Subir factura PDF</h2>
                       <p className="text-sm font-bold text-slate-500 mt-1">Adjunta la factura para enviarla al estudiante y derivar el trámite a Biblioteca.</p>
                    </div>
                    <button onClick={() => setShowInvoiceModal(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                      <X size={30} />
                    </button>
                 </div>

                 {/* Invoice Table */}
                 <div className="overflow-hidden rounded-2xl border border-slate-100 mb-8">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                          <tr>
                             <th className="px-6 py-4">Cantidad</th>
                             <th className="px-6 py-4">Descripción</th>
                             <th className="px-6 py-4 text-right">Precio Unit.</th>
                             <th className="px-6 py-4 text-right">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          <tr>
                             <td className="px-6 py-5 font-black text-slate-700">1</td>
                             <td className="px-6 py-5 font-bold text-slate-600">{selectedPago.tramite}</td>
                             <td className="px-6 py-5 text-right font-bold text-slate-600">Bs. {selectedPago.amount}</td>
                             <td className="px-6 py-5 text-right font-black text-slate-800">Bs. {selectedPago.amount}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-between mb-8 border border-slate-100">
                    <span className="text-xl font-black text-slate-400 uppercase tracking-widest">Total a Pagar:</span>
                    <span className="text-5xl font-black text-[#A11B1B]">Bs. {selectedPago.amount}</span>
                 </div>

                 <div className="bg-[#FAF7FF] rounded-3xl p-8 border-2 border-purple-50 mb-8">
                    <h5 className="text-xs font-black text-purple-600/70 uppercase tracking-[0.2em] mb-6">Datos de factura recibidos del estudiante</h5>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Nombre / Razón social:</p>
                          <p className="font-black text-slate-800 tracking-tight">{selectedPago.nombre_factura || `${selectedPago.nombres} ${selectedPago.apellidos}`}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">NIT / CI:</p>
                          <p className="font-black text-slate-800 tracking-tight">{selectedPago.nit_ci || selectedPago.code}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Dirección:</p>
                          <p className="font-bold text-slate-700 tracking-tight">{selectedPago.direccion || 'No especificado'}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Correo:</p>
                          <p className="font-bold text-blue-600 truncate">{selectedPago.correo_envio || selectedPago.email}</p>
                       </div>
                    </div>
                 </div>

                 <label className="block mb-8">
                    <span className="text-sm font-black text-slate-800 ml-1 mb-3 block">Factura en PDF</span>
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center hover:border-emerald-300 transition-colors">
                       <input
                         type="file"
                         accept="application/pdf,.pdf"
                         className="hidden"
                         onChange={(e) => {
                           const file = e.target.files?.[0] || null;
                           setInvoicePdf(file);
                           setInvoiceError(null);
                         }}
                       />
                       <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                         <Upload size={28} />
                       </div>
                       <p className="font-black text-slate-800">{invoicePdf ? invoicePdf.name : "Seleccionar archivo PDF"}</p>
                       <p className="text-xs font-bold text-slate-400 mt-1">Solo archivos .pdf</p>
                    </div>
                 </label>

                 {invoiceError && (
                   <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                     {invoiceError}
                   </div>
                 )}

                 <div className="flex gap-4">
                    <Button 
                       onClick={() => setShowInvoiceModal(false)}
                       className="flex-1 h-16 bg-white border-2 border-slate-100 text-slate-500 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-widest transition-all"
                    >
                       Cancelar
                    </Button>
                    <Button 
                       onClick={handleSendInvoiceToStudent}
                       disabled={submitting}
                       className="flex-[2] h-16 bg-[#8C1B1B] hover:bg-red-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-3"
                    >
                       {submitting ? <Loader2 size={24} className="animate-spin" /> : <Mail size={24} />} Enviar factura
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && selectedPago && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-10">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Rechazar Comprobante</h2>
                    <button onClick={() => setShowRejectModal(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                      <X size={32} />
                    </button>
                 </div>

                 <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-start gap-3 mb-8">
                    <Info className="shrink-0 mt-0.5" size={20} />
                    <p className="text-sm font-bold leading-tight">El estudiante recibirá una notificación con el motivo del rechazo para que pueda corregirlo.</p>
                 </div>

                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-8 grid grid-cols-2 gap-6">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estudiante</p>
                       <p className="font-black text-slate-800 text-lg">{selectedPago.nombres} {selectedPago.apellidos}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto</p>
                       <p className="font-black text-red-600 text-2xl">Bs. {selectedPago.amount}</p>
                    </div>
                    <div className="col-span-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trámite</p>
                       <p className="font-bold text-slate-700">{selectedPago.tramite}</p>
                    </div>
                 </div>

                 <div className="space-y-4 mb-10">
                    <label className="text-base font-black text-slate-800 ml-1 flex items-center gap-2">
                       Motivo del Rechazo <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                       placeholder="Ej: El comprobante no coincide con el monto solicitado. El código QR está vencido..."
                       className="w-full h-40 bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-base font-medium focus:outline-none focus:border-red-400 transition-colors resize-none"
                       value={rejectionReason}
                       onChange={(e) => setRejectionReason(e.target.value)}
                    ></textarea>
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                       <p className="text-slate-400 flex items-center gap-2">
                          <Info size={14} /> Mínimo 10 caracteres requeridos
                       </p>
                       <p className={cn(rejectionReason.length < 10 ? "text-orange-500" : "text-emerald-500")}>
                          {rejectionReason.length} / 10
                       </p>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <Button 
                       onClick={() => setShowRejectModal(false)}
                       className="flex-1 h-16 bg-white border-2 border-slate-100 text-slate-500 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-widest transition-all"
                    >
                       Cancelar
                    </Button>
                    <Button 
                       onClick={() => handleAction('RECHAZAR')}
                       disabled={submitting || rejectionReason.length < 10}
                       className="flex-[2] h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none"
                    >
                       {submitting ? <Loader2 className="animate-spin" size={24} /> : <X size={24} />} Rechazar y Notificar
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
