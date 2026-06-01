"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Plus, Edit2, Trash2, Settings2, 
  FileText, Loader2 
} from "lucide-react";

interface TipoTramite {
  id: number;
  nombre: string;
  price: number;
  requires: string[];
}

export default function TramitesTipos() {
  const [loading, setLoading] = useState(true);
  const [tipos, setTipos] = useState<TipoTramite[]>([]);

  const fetchTipos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tipos-tramite');
      const data = await res.json();
      if (res.ok) {
        setTipos(data);
      }
    } catch (error) {
      console.error("Error fetching tipos trámites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  if (loading && tipos.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catálogo de Tipos</h1>
          <p className="text-slate-500 mt-1">Gestión de requisitos, precios y flujos de cada tipo de trámite.</p>
        </div>
        <Button className="gap-2 shadow-md">
          <Plus size={18} /> Nuevo Tipo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tipos.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-white rounded-2xl border border-dashed border-slate-200">
             No hay tipos de trámite registrados
          </div>
        ) : (
          tipos.map((tipo) => (
            <Card key={tipo.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Settings2 size={24} />
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg text-univalle-primary block">Bs. {tipo.price}</span>
                    <span className="text-xs text-slate-400 font-medium">Costo Base</span>
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-4 h-12 leading-tight">{tipo.nombre}</h3>
                
                <div className="space-y-2 mb-6 min-h-[60px]">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Requisitos Configurables:</p>
                  <div className="flex flex-wrap gap-2">
                    {tipo.requires && tipo.requires.length > 0 ? (
                      tipo.requires.map((req, i) => (
                        <span key={i} className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md flex items-center gap-1 border border-slate-200/50">
                          <FileText size={12} className="text-univalle-primary"/> {req}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] italic text-slate-400">Sin requisitos específicos</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1 gap-2 text-slate-700 font-bold text-xs uppercase">
                    <Edit2 size={16} /> Editar
                  </Button>
                  <Button variant="outline" className="text-red-600 hover:text-white hover:bg-red-600 border-red-200">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
