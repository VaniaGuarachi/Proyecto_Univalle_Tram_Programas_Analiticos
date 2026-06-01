"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, CheckCircle2, Calendar, 
  Search, Filter, FileText, ChevronRight,
  History, Home
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/Card";
import { EstudianteConTramites } from '../types';

interface Props {
  onVerTramites: (estudiante: EstudianteConTramites) => void;
  activeMenu: 'Inicio' | 'Historial';
}

export default function TramitesDashboard({ onVerTramites, activeMenu }: Props) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [carreraFilter, setCarreraFilter] = useState('');
  const [estudiantes, setEstudiantes] = useState<EstudianteConTramites[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<{id_carrera: number, nombre: string}[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    completados: 0,
    actividad: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (carreraFilter) params.set('carrera', carreraFilter);
        
        const res = await fetch(`/api/tramites/dashboard?${params.toString()}`);
        const data = await res.json();
        
        if (res.ok) {
          // Mapear estudiantes del API al formato del componente
          const mappedEstudiantes = data.estudiantes.map((e: any) => ({
            id: e.id_estudiante.toString(),
            nombre: `${e.nombres} ${e.apellidos}`,
            codigo: e.codigo_estudiante,
            carrera: e.carrera || 'Sin carrera',
            totalTramites: Number(e.total),
            tramitesPendientes: Number(e.pendientes),
            tramitesCompletados: Number(e.completados),
            ultimaActividad: e.ultima_actividad ? new Date(e.ultima_actividad).toLocaleString('es-BO') : '—'
          }));
          
          setEstudiantes(mappedEstudiantes);
          setStats({
            total: data.stats.totalEstudiantes,
            pendientes: data.stats.pendientes,
            completados: data.stats.completados,
            actividad: data.stats.actividadHoy
          });
          setCarreras(data.carreras);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [search, carreraFilter]);

  useEffect(() => {
    if (activeMenu === 'Historial') {
      const fetchHistorial = async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/tramites/historial');
          const data = await res.json();
          if (res.ok) {
            setHistorial(data.historial);
          }
        } catch (error) {
          console.error("Error fetching historial:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchHistorial();
    }
  }, [activeMenu]);

  if (activeMenu === 'Historial') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-univalle-primary text-white rounded-lg shadow-lg">
            <History size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Historial de Trámites</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-univalle-primary/20 border-t-univalle-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-univalle-primary text-white">
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Estudiante</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Código</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Carrera</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Tipo de Trámite</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Fecha</th>
                    <th className="px-6 py-4 font-bold uppercase text-xs tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historial.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.nombres} {item.apellidos}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">{item.codigo_estudiante}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.carrera}</td>
                      <td className="px-6 py-4 text-sm font-medium text-univalle-action">{item.tipo_tramite}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(item.fecha_solicitud).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-tighter">
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Premium Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Estudiantes", value: stats.total, sub: "Base de datos activa", icon: <Users />, color: "from-[#7D1D3F] to-[#A51C30]", shadow: "shadow-red-900/20" },
          { label: "Pendientes", value: stats.pendientes, sub: "Esperando atención", icon: <Clock />, color: "from-[#F59E0B] to-[#D97706]", shadow: "shadow-amber-900/20" },
          { label: "Completados", value: stats.completados, sub: "Emitidos este mes", icon: <CheckCircle2 />, color: "from-[#10B981] to-[#059669]", shadow: "shadow-emerald-900/20" },
          { label: "Actividad", value: stats.actividad, sub: "Solicitudes de hoy", icon: <Calendar />, color: "from-[#3B82F6] to-[#2563EB]", shadow: "shadow-blue-900/20" },
        ].map((stat, i) => (
          <div key={i} className={`relative overflow-hidden group p-8 rounded-[2.5rem] bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-2xl transition-all duration-500 hover:-translate-y-2`}>
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-1000" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white shadow-inner">
                  {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 24, strokeWidth: 2.5 })}
                </div>
                <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tighter mb-2">{stat.value}</p>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{stat.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters Section */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[3rem] p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-univalle-action transition-colors" size={22} />
            <input 
              type="text" 
              placeholder="Buscar estudiante por nombre, código o CI..."
              className="w-full pl-16 pr-6 py-5 bg-slate-100/50 border-0 rounded-[1.5rem] focus:ring-4 focus:ring-univalle-action/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-80">
            <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <select 
              className="w-full pl-16 pr-10 py-5 bg-slate-100/50 border-0 rounded-[1.5rem] appearance-none outline-none focus:ring-4 focus:ring-univalle-action/10 font-bold text-slate-600 cursor-pointer"
              value={carreraFilter}
              onChange={(e) => setCarreraFilter(e.target.value)}
            >
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id_carrera} value={c.id_carrera}>{c.nombre}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronRight size={18} className="rotate-90 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Student List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[450px] bg-white/40 rounded-[3rem] animate-pulse border border-white/50" />
          ))
        ) : (
          estudiantes.map((est) => (
            <div key={est.id} className="group bg-white/80 backdrop-blur-md border border-white rounded-[3rem] p-10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(125,29,63,0.1)] transition-all duration-500 hover:-translate-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-univalle-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-univalle-primary/10 transition-colors" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-univalle-primary to-univalle-action flex items-center justify-center text-white font-black text-2xl shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  {est.nombre.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 group-hover:text-univalle-action transition-colors">{est.nombre}</h3>
                  <p className="text-[10px] font-black text-slate-400 font-mono tracking-widest uppercase">{est.codigo}</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carrera</span>
                  <span className="text-xs font-black text-slate-700 max-w-[150px] truncate text-right">{est.carrera}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                    <p className="text-[9px] font-black text-orange-400 uppercase mb-1">Pendientes</p>
                    <p className="text-xl font-black text-orange-600">{est.tramitesPendientes}</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Completados</p>
                    <p className="text-xl font-black text-emerald-600">{est.tramitesCompletados}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-2 pt-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <Clock size={14} className="opacity-50" />
                  <span>Última Actividad: {est.ultimaActividad}</span>
                </div>
              </div>

              <button 
                onClick={() => onVerTramites(est)}
                className="w-full py-5 bg-slate-900 hover:bg-univalle-action text-white rounded-2xl font-black text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl shadow-slate-900/10 active:scale-95"
              >
                GESTIONAR TRÁMITES
                <ChevronRight size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
