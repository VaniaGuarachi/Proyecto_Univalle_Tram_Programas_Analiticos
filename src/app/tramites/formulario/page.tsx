"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopySlash, Save, LayoutTemplate, PenTool, CheckCircle2 } from "lucide-react";

export default function FormularioPlantillasFirmas() {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  const [zones, setZones] = useState({
    ministro: null as string | null,
    encargada: null as string | null,
    director: null as string | null,
  });

  const availableSignatures = [
    { id: 'sig-1', name: 'Firma Ministro', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { id: 'sig-2', name: 'Firma Encargada', color: 'bg-amber-100 border-amber-300 text-amber-800' },
    { id: 'sig-3', name: 'Firma Director', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, zone: keyof typeof zones) => {
    e.preventDefault();
    if (draggedItem) {
       setZones({ ...zones, [zone]: draggedItem });
       setDraggedItem(null);
    }
  };

  const isComplete = zones.ministro && zones.encargada && zones.director;

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plantilla de Solicitud Administrativa</h1>
        <p className="text-slate-500 mt-1">Arrastre los bloques de firmas digitales a las posiciones oficiales para inicializar el template PDF.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
        <div className="lg:col-span-1 border-r-0 lg:border-r border-slate-200 pr-0 lg:pr-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PenTool size={18} /> Componentes
          </h3>
          <p className="text-xs text-slate-500 mb-6">Arrastre estos tokens hacia el documento que está a la derecha.</p>
          
          <div className="space-y-3">
             {availableSignatures.map(sig => {
                const isAssigned = Object.values(zones).includes(sig.id);
                return (
                  <div 
                    key={sig.id}
                    draggable={!isAssigned}
                    onDragStart={(e) => handleDragStart(e, sig.id)}
                    className={`p-4 border-2 border-dashed rounded-[10px] font-semibold flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${isAssigned ? 'opacity-30 grayscale cursor-not-allowed' : `${sig.color} hover:shadow-md hover:-translate-y-1`}`}
                  >
                    {isAssigned ? 'Asignado ✔' : sig.name}
                  </div>
                );
             })}
          </div>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-0 shadow-lg bg-slate-50 relative min-h-[600px]">
            <CardHeader className="bg-white rounded-t-[10px] border-b border-slate-200">
               <CardTitle className="text-center font-serif text-2xl text-slate-800">DOCUMENTO OFICIAL UNIVALLE</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
               <div className="w-full h-8 bg-slate-200 rounded-sm mb-4" />
               <div className="w-3/4 h-8 bg-slate-200 rounded-sm mb-4" />
               <div className="w-5/6 h-8 bg-slate-200 rounded-sm mb-12" />

               <div className="border border-slate-300 h-40 bg-white shadow-inner p-4 text-slate-400 font-mono text-sm">
                 [ Cuerpo del documento autogenerado irá aquí ]
               </div>

               <div className="mt-16 pt-16 border-t-2 border-slate-300 grid grid-cols-3 gap-8 text-center text-sm font-bold text-slate-400">
                 
                 {(['encargada', 'director', 'ministro'] as const).map(zone => (
                    <div 
                      key={zone}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, zone)}
                      className={`h-32 border-2 border-dashed rounded-[10px] flex flex-col items-center justify-center p-4 transition-colors ${zones[zone] ? 'border-univalle-primary bg-white' : 'border-slate-300 bg-slate-100 hover:border-slate-400 hover:bg-slate-200'}`}
                    >
                      {zones[zone] ? (
                        <>
                           <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                           <span className="text-slate-800">{availableSignatures.find(s => s.id === zones[zone])?.name}</span>
                           <button onClick={() => setZones({...zones, [zone]: null})} className="text-xs text-red-500 font-normal mt-2 underline">Quitar</button>
                        </>
                      ) : (
                        `Drop Zona: ${zone.charAt(0).toUpperCase() + zone.slice(1)}`
                      )}
                    </div>
                 ))}

               </div>
            </CardContent>
            
            <CardFooter className="bg-white rounded-b-[10px] border-t border-slate-200 p-6 flex justify-end">
               <Button size="lg" className="w-full md:w-auto h-12 px-8 gap-2" disabled={!isComplete}>
                 <Save size={18} /> Guardar Plantilla de Firmas
               </Button>
            </CardFooter>
          </Card>
        </div>

      </div>
    </div>
  );
}
