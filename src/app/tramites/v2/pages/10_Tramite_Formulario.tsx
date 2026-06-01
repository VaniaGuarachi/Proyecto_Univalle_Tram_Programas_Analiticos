"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, FileText, Check,
  Fingerprint, Lock, ShieldCheck, Users
} from 'lucide-react';
import { EstudianteConTramites, Tramite, FirmaDisponible } from '../types';
import { cn } from '@/lib/utils';

const FIRMAS_DISPONIBLES: FirmaDisponible[] = [
  { id: 'firma1', nombre: 'Edgar Pary Chambi', cargo: 'Ministro de Educación' },
  { id: 'firma2', nombre: 'Marcela Gabriela Felix Erguicia', cargo: 'Encargada de Legalizaciones' },
  { id: 'firma3', nombre: 'Dr. Roberto Aguilar', cargo: 'Director Académico' },
];

interface Props {
  estudiante: EstudianteConTramites;
  tramite: Tramite;
  onBack: () => void;
  onContinue: (data: any) => void;
}

export default function TramiteFormulario({ estudiante, tramite, onBack, onContinue }: Props) {
  const [formData, setFormData] = useState({
    id_tramite: tramite.id_db,
    nombreEstudiante: estudiante.nombre,
    detalleDocumento: '',
    fechaEmision: new Date().toLocaleDateString(),
    nroCertificacion: '',
    codigoSeguridad: '',
    firmaMinistro: null as FirmaDisponible | null,
    firmaResponsable: null as FirmaDisponible | null,
  });

  const [draggedFirma, setDraggedFirma] = useState<FirmaDisponible | null>(null);

  useEffect(() => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    setFormData(prev => ({ ...prev, codigoSeguridad: `UNV-${timestamp}-${random}` }));
  }, []);

  const handleDropSignature = (type: 'ministro' | 'responsable') => {
    if (draggedFirma) {
      if (type === 'ministro') setFormData(prev => ({ ...prev, firmaMinistro: draggedFirma }));
      else setFormData(prev => ({ ...prev, firmaResponsable: draggedFirma }));
      setDraggedFirma(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in zoom-in-95 duration-700">
      <div className="flex items-center gap-6 mb-12">
        <button 
          onClick={onBack}
          className="p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-univalle-primary active:scale-90"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic uppercase">Formulario de Emisión</h2>
          <p className="text-xs font-black text-univalle-primary uppercase tracking-[0.3em] opacity-70">Certificación Técnica de Documentos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Signatures Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">Firmas Disponibles</h3>
            <div className="space-y-4">
              {FIRMAS_DISPONIBLES.map((firma) => (
                <div
                  key={firma.id}
                  draggable
                  onDragStart={() => setDraggedFirma(firma)}
                  className="p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Fingerprint size={20} className="text-white/60" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate uppercase">{firma.nombre}</p>
                      <p className="text-[9px] font-bold text-white/40 uppercase truncate">{firma.cargo}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest">
              <Lock size={14} />
              Protocolo Seguro SSL
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ayuda Técnica</p>
             <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
               "Arrastre la firma de la autoridad correspondiente hacia los recuadros punteados del formulario principal."
             </p>
          </div>
        </div>

        {/* Main Form Area */}
        <div className="lg:col-span-6 space-y-8">
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[3.5rem] p-12 shadow-[0_30px_100px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-univalle-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                <FileText size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Detalles del Documento</h3>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nro. de Certificación</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 0234/2026"
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-univalle-primary focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
                    value={formData.nroCertificacion}
                    onChange={(e) => setFormData({ ...formData, nroCertificacion: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Código de Seguridad (QR)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly
                      className="w-full px-6 py-5 bg-slate-100 border-2 border-slate-100 rounded-2xl font-mono text-slate-500 font-bold"
                      value={formData.codigoSeguridad}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500">
                      <ShieldCheck size={20} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Detalle y Observaciones Técnicas</label>
                <textarea 
                  rows={6}
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-univalle-primary focus:bg-white outline-none transition-all font-medium text-slate-600 shadow-inner resize-none"
                  placeholder="Escriba los detalles oficiales del documento..."
                  value={formData.detalleDocumento}
                  onChange={(e) => setFormData({ ...formData, detalleDocumento: e.target.value })}
                />
              </div>

              <div className="pt-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-univalle-action rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Fingerprint size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">Áreas de Firma</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-univalle-primary/5', 'border-univalle-primary/30'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-univalle-primary/5', 'border-univalle-primary/30'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-univalle-primary/5', 'border-univalle-primary/30');
                      handleDropSignature('ministro');
                    }}
                    className={cn(
                      "h-44 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all",
                      formData.firmaMinistro ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    {formData.firmaMinistro ? (
                      <div className="text-center">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                          <Check size={20} strokeWidth={4} />
                        </div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">{formData.firmaMinistro.nombre}</p>
                        <button 
                          onClick={() => setFormData({ ...formData, firmaMinistro: null })}
                          className="text-[8px] font-bold text-red-400 uppercase mt-1 hover:text-red-600"
                        >Quitar Firma</button>
                      </div>
                    ) : (
                      <>
                        <Fingerprint className="text-slate-200" size={32} />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma Autoridad</p>
                      </>
                    )}
                  </div>

                  <div 
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-univalle-primary/5', 'border-univalle-primary/30'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-univalle-primary/5', 'border-univalle-primary/30'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-univalle-primary/5', 'border-univalle-primary/30');
                      handleDropSignature('responsable');
                    }}
                    className={cn(
                      "h-44 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all",
                      formData.firmaResponsable ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    {formData.firmaResponsable ? (
                      <div className="text-center">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                          <Check size={20} strokeWidth={4} />
                        </div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">{formData.firmaResponsable.nombre}</p>
                        <button 
                          onClick={() => setFormData({ ...formData, firmaResponsable: null })}
                          className="text-[8px] font-bold text-red-400 uppercase mt-1 hover:text-red-600"
                        >Quitar Firma</button>
                      </div>
                    ) : (
                      <>
                        <Fingerprint className="text-slate-200" size={32} />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma Responsable</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-univalle-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Información del Trámite</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                   <Users size={18} />
                </div>
                <div className="min-w-0">
                   <p className="text-[10px] font-black text-slate-400 uppercase">Estudiante</p>
                   <p className="text-xs font-black text-slate-800 truncate">{estudiante.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                   <FileText size={18} />
                </div>
                <div className="min-w-0">
                   <p className="text-[10px] font-black text-slate-400 uppercase">Tipo</p>
                   <p className="text-xs font-black text-slate-800 truncate">{tramite.tipo}</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onContinue(formData)}
            disabled={!formData.firmaMinistro || !formData.firmaResponsable || !formData.nroCertificacion}
            className={cn(
              "w-full py-6 rounded-3xl font-black text-sm tracking-[0.2em] uppercase transition-all duration-500 shadow-2xl flex items-center justify-center gap-3 active:scale-95",
              (!formData.firmaMinistro || !formData.firmaResponsable || !formData.nroCertificacion)
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-univalle-action hover:bg-black text-white shadow-univalle-action/20"
            )}
          >
            CONTINUAR
            <ArrowRight size={20} />
          </button>
          
          <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100">
             <div className="flex gap-3 text-emerald-700">
                <ShieldCheck size={20} className="shrink-0" />
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tight">
                  Toda la información capturada será integrada en el documento digital final con firma criptográfica.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
