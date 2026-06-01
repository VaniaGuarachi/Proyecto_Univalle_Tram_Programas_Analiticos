"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import TramitesDashboard from './pages/08_Tramites_Dashboard';
import TramitesEstudiante from './pages/09_Tramites_Estudiante';
import TramiteRevision from './pages/11_Tramite_Revision';
import { EstudianteConTramites, Tramite } from './types';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

type ViewID = '08' | '09' | '11';
type ActiveMenu = 'Inicio' | 'Historial';
type NavigatePayload = {
  estudiante?: EstudianteConTramites;
  tramite?: Tramite;
};
type FinalizePayload = {
  codigo: string;
  success: boolean;
};

export default function TramitesV2Page() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewID>('08');
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('Inicio');
  
  const [selectedEstudiante, setSelectedEstudiante] = useState<EstudianteConTramites | null>(null);
  const [selectedTramite, setSelectedTramite] = useState<Tramite | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCode, setSuccessCode] = useState('');

  const handleNavigate = (viewId: ViewID | '01', data?: NavigatePayload) => {
    if (viewId === '01') {
      router.push('/login');
      return;
    }
    
    if (viewId === '08') {
      setActiveView('08');
      setSelectedEstudiante(null);
      setSelectedTramite(null);
    } else if (viewId === '09') {
      if (data?.estudiante) setSelectedEstudiante(data.estudiante);
      setActiveView('09');
    } else if (viewId === '11') {
      if (data?.tramite) setSelectedTramite(data.tramite);
      setActiveView('11');
    }
  };

  const handleFinalize = (finalData: FinalizePayload) => {
    setSuccessCode(finalData.codigo);
    setShowSuccess(true);
    handleNavigate('08');
  };

  const renderView = () => {
    switch (activeView) {
      case '08':
        return (
          <TramitesDashboard 
            onVerTramites={(est) => handleNavigate('09', { estudiante: est })} 
            activeMenu={activeMenu}
          />
        );
      case '09':
        return selectedEstudiante ? (
          <TramitesEstudiante 
            estudiante={selectedEstudiante} 
            onBack={() => handleNavigate('08')}
            onProcesar={(tramite) => handleNavigate('11', { tramite })}
          />
        ) : null;
      case '11':
        return (selectedEstudiante && selectedTramite) ? (
          <TramiteRevision 
            estudiante={selectedEstudiante}
            tramite={selectedTramite}
            onBack={() => handleNavigate('09')}
            onFinalize={handleFinalize}
          />
        ) : null;
      default:
        return <TramitesDashboard onVerTramites={(est) => handleNavigate('09', { estudiante: est })} activeMenu={activeMenu} />;
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case '08': return activeMenu === 'Inicio' ? 'Dashboard Trámites' : 'Historial de Trámites';
      case '09': return 'Detalle Estudiante';
      case '11': return 'Panel de Emisión';
      default: return 'Sistema de Trámites';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fa] subtle-grid">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-[0_35px_75px_rgba(0,0,0,0.28)] border border-white relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-univalle-primary via-univalle-action to-univalle-primary" />
            
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-100 rotate-3 animate-bounce">
              <CheckCircle2 size={42} strokeWidth={3} />
            </div>

            <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-2">Trámite Completado</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-5 leading-relaxed">
              El documento ha sido emitido, firmado y cargado al servidor con éxito. <br />
              El estudiante ya puede descargar su certificación oficial.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Código de Verificación Único</p>
               <p className="text-lg font-black text-univalle-primary font-mono tracking-wider">{successCode}</p>
            </div>

            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full py-4 bg-slate-900 hover:bg-univalle-action text-white rounded-xl font-black text-xs tracking-[0.22em] uppercase transition-all duration-300 shadow-lg active:scale-95"
            >
              ENTENDIDO Y CONTINUAR
            </button>
          </div>
        </div>
      )}

      {/* Custom Sidebar for this role module */}
      <div className="hidden md:block w-80 shrink-0 h-full bg-gradient-to-b from-[#61152d] via-univalle-primary to-[#35101d] shadow-[18px_0_55px_rgba(53,16,29,0.22)] relative z-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.16),transparent_26rem)] pointer-events-none" />
        <Sidebar 
          activeMenu={activeMenu}
          onMenuChange={(menu) => {
            setActiveMenu(menu as ActiveMenu);
            setActiveView('08');
          }}
          userType="tramite"
        />
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="relative z-20 shadow-sm">
          <Header 
            title={getPageTitle()}
            onLogout={() => handleNavigate('01')}
            userName="Responsable de Trámites"
            userRole="Gestión Académica"
          />
        </div>
        
        <main 
          className="flex-1 p-5 md:p-8 lg:p-10 overflow-y-auto relative custom-scrollbar scroll-smooth"
          style={{
            background: `
              radial-gradient(at 0% 0%, rgba(116, 19, 50, 0.07) 0px, transparent 48%),
              radial-gradient(at 100% 0%, rgba(217, 180, 95, 0.11) 0px, transparent 48%),
              linear-gradient(135deg, #f7f3f4 0%, #eef1f5 54%, #f8fafc 100%)
            `
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-univalle-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-univalle-gold/10 rounded-full blur-[110px] -ml-48 -mb-48" />

          <div className="max-w-7xl mx-auto relative z-10">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
