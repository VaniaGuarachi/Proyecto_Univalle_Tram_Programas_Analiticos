"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, ClipboardList, Info, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface TipoTramite {
  id: number;
  nombre: string;
  descripcion: string;
  price: number;
  requiere_pago: number;
  requiere_solvencia: number;
}

export default function TramitesEstudiante() {
  const router = useRouter();
  const [tramites, setTramites] = useState<TipoTramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTramites() {
      try {
        setLoading(true);
        const res = await fetch('/api/tipos-tramite');
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al cargar trámites");

        setTramites(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTramites();
  }, []);

  const getIcon = (nombre: string) => {
    if (nombre.toLowerCase().includes('analítico') || nombre.toLowerCase().includes('programa')) {
      return <ClipboardList size={24} />;
    }
    return <FileText size={24} />;
  };

  const getHref = (nombre: string) => {
    const nombreLower = nombre.toLowerCase();
    if (nombreLower.includes('analíticos') || nombreLower.includes('analiticos')) {
      return '/estudiante/tramites/programas-analiticos?mode=new';
    }
    return '#'; // Otros trámites aún sin formulario específico
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-[50vh] gap-4 py-20">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
        <p className="text-slate-500 font-medium">Cargando trámites disponibles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-red-50 border border-red-100 rounded-2xl text-center">
        <AlertCircle className="text-red-500 mx-auto mb-4" size={40} />
        <h3 className="font-bold text-red-800 mb-2">Error al cargar</h3>
        <p className="text-red-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-10 pt-4 px-2">
        <h1 className="text-3xl font-medium text-slate-800 tracking-tight">Tipos de Trámites</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tramites.length === 0 ? (
          <div className="col-span-2 text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No hay trámites activos en este momento.</p>
          </div>
        ) : (
          tramites.map(tramite => (
            <Card key={tramite.id} className="border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[20px] overflow-hidden bg-white">
              <CardContent className="p-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 bg-[#8C1B1B] text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-900/10 group-hover:scale-110 transition-transform">
                    {getIcon(tramite.nombre)}
                  </div>
                </div>

                <h3 className="font-bold text-2xl text-slate-800 tracking-tight leading-tight mb-3 capitalize">
                  {tramite.nombre.toLowerCase().startsWith('trámite') ? tramite.nombre : `Trámite de ${tramite.nombre}`}
                </h3>
                <p className="text-base text-slate-500 mb-10 min-h-[48px] leading-relaxed">
                  {tramite.descripcion || 'Sin descripción disponible.'}
                </p>

                <Button
                  onClick={() => router.push(getHref(tramite.nombre))}
                  className="w-full bg-[#8C1B1B] hover:bg-[#7a1717] text-white rounded-xl h-14 font-bold text-lg tracking-wide shadow-lg shadow-red-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Iniciar trámite
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
