"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Loader2, FileText, CheckCircle2, XCircle,
  Clock, Eye, BookOpen
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface DeudaHistorial {
  tipo_deuda: string;
  descripcion: string;
  monto: number;
  estado_deuda: string;
}

interface RegistroHistorial {
  id_verificacion_solvencia: number;
  fecha_verificacion: string;
  resultado: string;
  comentario: string;
  codigo_seguimiento: string;
  nombre_tramite: string;
  monto_tramite: number;
  nombres_estudiante: string;
  apellidos_estudiante: string;
  codigo_estudiante: string;
  factura_nombre: string | null;
  deudas: DeudaHistorial[];
}

export default function BibliotecarioHistorial() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState<RegistroHistorial[]>([]);

  // Modal de detalle
  const [showModal, setShowModal] = useState(false);
  const [selectedReg, setSelectedReg] = useState<RegistroHistorial | null>(null);

  useEffect(() => {
    const fetchHistorial = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/bibliotecario/historial?userId=${user.id_usuario}`);
        const data = await res.json();
        setHistorial(data.historial || []);
      } catch (error) {
        console.error("Error fetching historial:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, [user]);

  const openDetalle = (reg: RegistroHistorial) => {
    setSelectedReg(reg);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Historial de Verificaciones</h1>
          <p className="text-slate-500 font-medium">Registro de todas las verificaciones de deudas realizadas</p>
        </div>
        <Link
          href="/bibliotecario/dashboard"
          className="text-sm font-black text-univalle-primary hover:text-univalle-hover transition-colors uppercase tracking-widest flex items-center gap-2"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      {/* Lista de historial */}
      <div className="space-y-4">
        {historial.length === 0 ? (
          <div className="py-24 text-center space-y-4 bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Clock size={40} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay registros en el historial</p>
          </div>
        ) : (
          historial.map((reg) => (
            <Card key={reg.id_verificacion_solvencia} className="border-0 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-8 bg-white/80">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                  {/* Info principal */}
                  <div className="space-y-3 flex-1">
                    {/* Nombre + badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-black text-slate-800">
                        {reg.nombres_estudiante} {reg.apellidos_estudiante}
                      </h3>
                      {reg.resultado === 'SIN_DEUDAS' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Sin Deudas
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full border border-red-100 flex items-center gap-1">
                          <XCircle size={10} /> Con Deudas
                        </span>
                      )}
                    </div>

                    {/* Datos del trámite */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black w-16">Código:</span>
                        <span className="font-medium text-slate-700">{reg.codigo_estudiante}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black w-16">Fecha:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(reg.fecha_verificacion).toLocaleString('es-BO', {
                            timeZone: 'America/La_Paz',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black w-16">Trámite:</span>
                        <span className="font-medium text-slate-700">{reg.nombre_tramite}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black w-16">Monto:</span>
                        <span className="font-black text-slate-800">Bs. {reg.monto_tramite}</span>
                      </div>
                    </div>

                    {/* Factura */}
                    {reg.factura_nombre && (
                      <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                        <FileText size={12} /> {reg.factura_nombre}
                      </span>
                    )}

                    {/* Bloque de deudas registradas */}
                    {reg.resultado === 'CON_DEUDAS' && reg.deudas.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2 mt-2">
                        <p className="text-xs font-black text-red-700 uppercase tracking-widest mb-3">Deudas registradas:</p>
                        <ul className="space-y-1.5">
                          {reg.deudas.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span className="text-red-700 font-medium">
                                {d.tipo_deuda}: <span className="font-black">Bs. {d.monto}</span>
                                {d.descripcion && <span className="font-normal text-red-500"> — {d.descripcion}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="pt-2 border-t border-red-200 mt-2">
                          <p className="text-sm font-black text-red-700">
                            Total deudas: <span className="text-red-800">
                              Bs. {reg.deudas.reduce((acc, d) => acc + Number(d.monto), 0)}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Comentario */}
                    {reg.comentario && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-500 italic">
                        "{reg.comentario}"
                      </div>
                    )}
                  </div>

                  {/* Botón VER DETALLES */}
                  <div className="shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => openDetalle(reg)}
                      className="h-11 px-5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-black gap-2 text-sm"
                    >
                      <Eye size={16} /> VER DETALLES
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Detalle completo */}
      {showModal && selectedReg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Detalle de Verificación</h2>
                  <p className="text-sm text-slate-400 mt-1">{selectedReg.codigo_seguimiento}</p>
                </div>
                {selectedReg.resultado === 'SIN_DEUDAS' ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={24} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <XCircle size={24} />
                  </div>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-5 text-sm">
                {[
                  ['Estudiante', `${selectedReg.nombres_estudiante} ${selectedReg.apellidos_estudiante}`],
                  ['Código', selectedReg.codigo_estudiante],
                  ['Trámite', selectedReg.nombre_tramite],
                  ['Monto', `Bs. ${selectedReg.monto_tramite}`],
                  ['Fecha verificación', new Date(selectedReg.fecha_verificacion).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
                  ['Resultado', selectedReg.resultado === 'SIN_DEUDAS' ? '✅ Sin Deudas' : '❌ Con Deudas'],
                  ...(selectedReg.factura_nombre ? [['Factura', selectedReg.factura_nombre]] : []),
                  ...(selectedReg.comentario ? [['Comentario', `"${selectedReg.comentario}"`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-wider shrink-0">{label}</span>
                    <span className="font-medium text-slate-700 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {selectedReg.resultado === 'CON_DEUDAS' && selectedReg.deudas.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-black text-red-700 uppercase tracking-widest">Detalle de Deudas</p>
                  {selectedReg.deudas.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-red-600">{d.tipo_deuda} {d.descripcion ? `— ${d.descripcion}` : ''}</span>
                      <span className="font-black text-red-700">Bs. {d.monto}</span>
                    </div>
                  ))}
                  <div className="border-t border-red-200 pt-2 flex justify-between font-black text-red-800">
                    <span>Total</span>
                    <span>Bs. {selectedReg.deudas.reduce((acc, d) => acc + Number(d.monto), 0)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowModal(false)}
                className="w-full h-12 rounded-2xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
