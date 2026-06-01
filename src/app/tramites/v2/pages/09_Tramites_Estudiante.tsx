"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileText, Clock, CheckCircle2, 
  AlertCircle, ChevronRight, FileCheck, Users,
  Check
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/Card";
import { EstudianteConTramites, Tramite } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  estudiante: EstudianteConTramites;
  onBack: () => void;
  onProcesar: (tramite: Tramite) => void;
}

export default function TramitesEstudiante({ estudiante, onBack, onProcesar }: Props) {
  const [loading, setLoading] = useState(true);
  const [tramites, setTramites] = useState<Tramite[]>([]);

  useEffect(() => {
    const fetchTramites = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tramites/v2/estudiante-tramites?id=${estudiante.id}`);
        const data = await res.json();
        
        if (res.ok) {
          const mapped = data.tramites.map((t: any) => ({
            id: t.codigo_seguimiento,
            id_db: t.id_tramite,
            tipo: t.tipo_nombre,
            descripcion: t.tipo_descripcion || 'Trámite en proceso administrativo.',
            estado: t.es_final ? 'completado' : 'en_proceso',
            fechaSolicitud: new Date(t.fecha_solicitud).toLocaleDateString()
          }));
          setTramites(mapped);
        }
      } catch (error) {
        console.error("Error fetching student tramites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTramites();
  }, [estudiante.id]);

  return (
    <div className="space-y-10 animate-in slide-in-from-right-10 duration-700">
      {/* Premium Student Profile Header */}
      <div className="relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white rounded-[3.5rem] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-univalle-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="relative">
            <div className="w-40 h-40 rounded-[3rem] bg-gradient-to-br from-univalle-primary to-univalle-action p-1 shadow-2xl rotate-3">
              <div className="w-full h-full rounded-[2.8rem] bg-white p-1">
                <div className="w-full h-full rounded-[2.6rem] bg-slate-100 flex items-center justify-center text-univalle-primary font-black text-5xl italic">
                  {estudiante.nombre.charAt(0)}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 border-4 border-white rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Check size={24} strokeWidth={4} />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-univalle-primary/10 text-univalle-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Users size={14} />
              Perfil del Estudiante
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2 italic uppercase">{estudiante.nombre}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="px-6 py-3 bg-slate-900/5 rounded-2xl border border-slate-900/5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-univalle-action" />
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{estudiante.carrera}</span>
              </div>
              <div className="px-6 py-3 bg-slate-900/5 rounded-2xl border border-slate-900/5 flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</span>
                <span className="text-xs font-black text-slate-800 font-mono">{estudiante.codigo}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center min-w-[140px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trámites</p>
              <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{estudiante.tramitesPendientes}</p>
              <p className="text-[9px] font-bold text-orange-500 uppercase mt-1">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase italic">
          <div className="w-8 h-1.5 bg-univalle-primary rounded-full" />
          Listado de Trámites
        </h2>
        <button 
          onClick={onBack}
          className="px-8 py-3 bg-white border border-slate-200 hover:border-univalle-primary text-slate-500 hover:text-univalle-primary rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all shadow-sm active:scale-95"
        >
          Volver al Dashboard
        </button>
      </div>

      {/* Premium Trámite List */}
      <div className="grid grid-cols-1 gap-6 pb-10">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/50 rounded-[2.5rem] animate-pulse" />
          ))
        ) : tramites.length === 0 ? (
          <div className="py-32 text-center bg-white/40 backdrop-blur-sm rounded-[4rem] border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-8">
              <FileText size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-400 tracking-tight uppercase italic">No se encontraron trámites activos</h3>
            <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Este estudiante no tiene solicitudes pendientes en esta área.</p>
          </div>
        ) : (
          tramites.map((tramite) => (
            <div 
              key={tramite.id} 
              className="group bg-white/90 backdrop-blur-xl border border-white rounded-[3rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col lg:flex-row items-center gap-10"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2rem] flex items-center justify-center text-slate-400 group-hover:from-univalle-primary group-hover:to-univalle-action group-hover:text-white transition-all duration-500 shadow-inner">
                <FileText size={40} />
              </div>
              
              <div className="flex-1 text-center lg:text-left space-y-2">
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-2">
                  <span className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                    {tramite.id}
                  </span>
                  <span className={cn(
                    "px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-widest shadow-sm",
                    tramite.estado === 'completado' ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
                  )}>
                    {tramite.estado === 'completado' ? '✅ Finalizado' : '⏳ En Proceso'}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-univalle-action transition-colors uppercase italic">{tramite.tipo}</h3>
                <p className="text-slate-500 font-medium max-w-2xl italic leading-relaxed">"{tramite.descripcion}"</p>
                <div className="flex items-center justify-center lg:justify-start gap-2 pt-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iniciado: {tramite.fechaSolicitud}</span>
                </div>
              </div>

              <div className="w-full lg:w-auto shrink-0 flex flex-col gap-3">
                <button 
                  onClick={() => onProcesar(tramite)}
                  disabled={tramite.estado === 'completado'}
                  className={cn(
                    "w-full lg:w-64 py-5 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all duration-300 shadow-xl flex items-center justify-center gap-3 active:scale-95",
                    tramite.estado === 'completado' 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                      : "bg-[#7D1D3F] hover:bg-black text-white shadow-red-900/10"
                  )}
                >
                  {tramite.estado === 'completado' ? 'VER CERTIFICADO' : 'PROCESAR TRÁMITE'}
                  <ChevronRight size={18} />
                </button>
                <button className="text-[10px] font-black text-slate-400 hover:text-univalle-primary uppercase tracking-widest transition-colors py-2">
                  Ver Detalles Técnicos
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
