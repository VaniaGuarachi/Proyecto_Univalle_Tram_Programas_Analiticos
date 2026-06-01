"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  AlertCircle, CheckCircle2, XCircle,
  Eye, FileText, Plus, Trash2, Loader2,
  Bell, UserCircle, BookOpen, RefreshCw
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

interface Deuda {
  monto: number;
  descripcion: string;
}

interface SolvenciaItem {
  id_solvencia:     number;
  id_tramite:       number;
  codigo_seguimiento: string;
  nombre_tramite:   string;
  monto_tramite:    number;
  nombres:          string;
  apellidos:        string;
  codigo_estudiante: string;
  estado_solvencia: string;
  factura_nombre:   string | null;
  fecha_resolucion?: string;
  fecha_solicitud?: string;
  // Datos extra para el modal detalle
  email:     string | null;
  telefono:  string | null;
  semestre:  number | null;
  carrera:   string | null;
}

export default function BibliotecarioDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({ pendientes: 0, sinDeudas: 0, conDeudas: 0 });
  const [pendientes, setPendientes] = useState<SolvenciaItem[]>([]);
  const [verificados, setVerificados] = useState<SolvenciaItem[]>([]);

  // ---- Modal VER DETALLES ----
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleItem, setDetalleItem]           = useState<SolvenciaItem | null>(null);

  // ---- Modal VERIFICAR / RE‑VERIFICAR ----
  const [showVerificarModal, setShowVerificarModal]     = useState(false);
  const [selectedAlumno, setSelectedAlumno]             = useState<SolvenciaItem | null>(null);
  const [verificacionModo, setVerificacionModo]         = useState<'SIN_DEUDAS' | 'CON_DEUDAS' | null>(null);
  const [deudas, setDeudas]                             = useState<Deuda[]>([]);
  const [comentario, setComentario]                     = useState('');
  const [saving, setSaving]                             = useState(false);
  const [successMsg, setSuccessMsg]                     = useState('');

  /* ── fetch ── */
  const fetchData = async () => {
    try {
      setLoading(true);
      const res  = await fetch('/api/bibliotecario/dashboard');
      const data = await res.json();
      setStats(data.stats ?? { pendientes: 0, sinDeudas: 0, conDeudas: 0 });
      setPendientes(data.pendientes  ?? []);
      setVerificados(data.verificados ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── helpers deudas ── */
  const addDeuda    = () => setDeudas(d => [...d, { monto: 0, descripcion: '' }]);
  const removeDeuda = (i: number) => setDeudas(d => d.filter((_, j) => j !== i));
  const updateDeuda = (i: number, field: keyof Deuda, val: any) =>
    setDeudas(d => d.map((x, j) => j === i ? { ...x, [field]: val } : x));

  const totalDeudas = deudas.reduce((acc, d) => acc + (Number(d.monto) || 0), 0);

  /* ── abrir modales ── */
  const openDetalle = (item: SolvenciaItem) => { setDetalleItem(item); setShowDetalleModal(true); };

  const openVerificar = (item: SolvenciaItem) => {
    setSelectedAlumno(item);
    setVerificacionModo(null);
    setDeudas([]);
    setComentario('');
    setSuccessMsg('');
    setShowVerificarModal(true);
  };

  /* ── guardar verificación ── */
  const handleSave = async () => {
    if (!selectedAlumno || !verificacionModo || !user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bibliotecario/solvencia/verificar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_solvencia:            selectedAlumno.id_solvencia,
          id_usuario_bibliotecario: user.id_usuario,
          resultado:               verificacionModo,
          comentario,
          deudas: verificacionModo === 'CON_DEUDAS' ? deudas : []
        })
      });
      if (res.ok) {
        setSuccessMsg('✅ Verificación guardada correctamente');
        setTimeout(() => { setShowVerificarModal(false); fetchData(); }, 1300);
      } else {
        const err = await res.json();
        alert(err.error ?? 'Error al guardar');
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  /* ── badge de estado ── */
  const EstadoBadge = ({ estado }: { estado: string }) => {
    if (estado === 'PENDIENTE_VERIFICACION')
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">Pendiente de Verificación</span>;
    if (estado === 'SIN_DEUDAS')
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">✓ Sin Deudas</span>;
    if (estado === 'CON_DEUDAS')
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">⚠ Con Deudas</span>;
    return null;
  };

  /* ── loader ── */
  if (loading && pendientes.length === 0 && verificados.length === 0)
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin text-univalle-primary" size={48} /></div>;

  const allItems = [...pendientes, ...verificados];

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">

      {/* ── Header de página ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Bibliotecario</h1>
          <p className="text-slate-500 font-medium">Panel de control y verificación de solvencias.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 text-slate-400 hover:text-univalle-primary transition-colors" title="Actualizar">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="relative p-2 text-slate-400 hover:text-univalle-primary">
            <Bell size={22} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
            <UserCircle size={28} className="text-slate-400" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-700 leading-tight">Bibliotecario(a)</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Bibliotecario</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Pendientes', value: stats.pendientes, icon: <AlertCircle size={26} />, color: 'amber' },
          { label: 'Sin Pendientes', value: stats.sinDeudas,  icon: <CheckCircle2 size={26} />, color: 'emerald' },
          { label: 'Con Pendientes', value: stats.conDeudas,  icon: <XCircle size={26} />,     color: 'red' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} className="border-0 shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-4xl font-black text-slate-800">{value || 0}</p>
              </div>
              <div className={`w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform
                ${color === 'amber'   ? 'bg-amber-50   text-amber-500'   : ''}
                ${color === 'emerald' ? 'bg-emerald-50 text-emerald-500' : ''}
                ${color === 'red'     ? 'bg-red-50     text-red-500'     : ''}
              `}>{icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Lista principal ── */}
      <div className="bg-white/40 backdrop-blur-sm rounded-[2rem] p-8 border border-white/50 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 mb-6">Verificación de pendientes de biblioteca</h2>

        <div className="space-y-4">
          {allItems.length === 0 ? (
            <div className="py-20 text-center bg-white/50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay registros de solvencias</p>
            </div>
          ) : allItems.map((item) => (
            <Card key={item.id_solvencia} className="border-0 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white">
                {/* Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-black text-slate-800">{item.nombres} {item.apellidos}</h3>
                    <EstadoBadge estado={item.estado_solvencia} />
                  </div>
                  <div className="text-sm text-slate-600 space-y-0.5">
                    <p>Código: <span className="font-semibold">{item.codigo_estudiante}</span></p>
                    <p>Trámite: <span className="font-semibold">{item.nombre_tramite}</span></p>
                    <p>Monto del trámite: <span className="font-bold text-slate-800">Bs. {item.monto_tramite}</span></p>
                    {item.fecha_solicitud && (
                      <p>Fecha de Solicitud: <span className="font-medium text-slate-500">
                        {new Date(item.fecha_solicitud).toLocaleString('es-BO', {
                          timeZone: 'America/La_Paz',
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span></p>
                    )}
                  </div>
                  {item.factura_nombre ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      <FileText size={12} /> Factura: {item.factura_nombre}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <FileText size={12} /> Sin factura adjunta
                    </span>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-3 shrink-0">
                  <Button
                    variant="ghost"
                    onClick={() => openDetalle(item)}
                    className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
                  >
                    <Eye size={15} /> VER DETALLES
                  </Button>

                  {item.estado_solvencia === 'PENDIENTE_VERIFICACION' ? (
                    <Button
                      onClick={() => openVerificar(item)}
                      className="h-10 px-5 rounded-lg bg-univalle-action hover:bg-univalle-hover text-white font-bold text-xs gap-1.5 shadow-md"
                    >
                      <CheckCircle2 size={15} /> VERIFICAR PENDIENTES
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openVerificar(item)}
                      className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
                    >
                      <RefreshCw size={15} /> RE-VERIFICAR
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ══════════════ MODAL: VER DETALLES ══════════════ */}
      {showDetalleModal && detalleItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowDetalleModal(false)}
        >
          <div
            className="w-full max-w-[540px] bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Detalles del Estudiante</h2>

              {/* Grid de info personal */}
              <div className="grid grid-cols-2 gap-x-10 gap-y-5 mb-6">
                <InfoField label="Nombre"   value={`${detalleItem.nombres} ${detalleItem.apellidos}`} bold />
                <InfoField label="Código"   value={detalleItem.codigo_estudiante} bold />
                <InfoField label="Carrera"  value={detalleItem.carrera  ?? '—'} />
                <InfoField label="Semestre" value={detalleItem.semestre ? `${detalleItem.semestre}do Semestre` : '—'} />
                <InfoField label="Teléfono" value={detalleItem.telefono ? `+591 ${detalleItem.telefono}` : '—'} />
                <InfoField label="Email"    value={detalleItem.email ?? '—'} />
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 mb-6" />

              {/* Info del trámite */}
              <div className="mb-2">
                <InfoField label="Trámite" value={detalleItem.nombre_tramite} bold />
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4 mt-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Monto</p>
                  <p className="text-xl font-black text-slate-900">Bs. {detalleItem.monto_tramite}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Factura</p>
                  {detalleItem.factura_nombre ? (
                    <p className="text-sm font-bold text-emerald-600">{detalleItem.factura_nombre}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Sin factura</p>
                  )}
                </div>
              </div>

              {/* Botón cerrar */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowDetalleModal(false)}
                  className="px-8 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: VERIFICAR / RE‑VERIFICAR ══════════════ */}
      {showVerificarModal && selectedAlumno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-[560px] bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 space-y-6">
              {/* Título */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Verificar pendientes del estudiante</h2>
                <p className="text-sm text-slate-600">
                  Estudiante: <span className="font-bold text-slate-800">{selectedAlumno.nombres} {selectedAlumno.apellidos}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Código: <span className="font-bold text-slate-800">{selectedAlumno.codigo_estudiante}</span>
                </p>
              </div>

              {/* Éxito */}
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-xl p-4 text-sm text-center">
                  {successMsg}
                </div>
              )}

              {/* Pregunta */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-4">¿El estudiante tiene deudas o pendientes de biblioteca?</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setVerificacionModo('SIN_DEUDAS')}
                    className={cn(
                      'h-[88px] rounded-xl border-2 flex flex-col items-center justify-center gap-2 font-semibold transition-all',
                      verificacionModo === 'SIN_DEUDAS'
                        ? 'bg-green-500 border-green-500 text-white shadow-lg'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:bg-green-50'
                    )}
                  >
                    <CheckCircle2 size={28} />
                    <span className="text-sm">NO - Sin pendientes</span>
                  </button>

                  <button
                    onClick={() => { setVerificacionModo('CON_DEUDAS'); if (deudas.length === 0) addDeuda(); }}
                    className={cn(
                      'h-[88px] rounded-xl border-2 flex flex-col items-center justify-center gap-2 font-semibold transition-all',
                      verificacionModo === 'CON_DEUDAS'
                        ? 'bg-red-500 border-red-500 text-white shadow-lg'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50'
                    )}
                  >
                    <XCircle size={28} />
                    <span className="text-sm">SÍ - Con pendientes</span>
                  </button>
                </div>
              </div>

              {/* Formulario de pendientes */}
              {verificacionModo === 'CON_DEUDAS' && (
                <div className="space-y-4 animate-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">Detalle de deuda o pendiente</p>
                    <button
                      onClick={addDeuda}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Agregar
                    </button>
                  </div>

                  {deudas.map((d, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3 relative">
                      <button onClick={() => removeDeuda(i)} className="absolute top-3 right-3 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendiente #{i + 1}</p>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Descripción de pendiente</label>
                        <textarea
                          value={d.descripcion}
                          onChange={e => updateDeuda(i, 'descripcion', e.target.value)}
                          className="w-full h-20 bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-univalle-primary"
                          placeholder="Describe la deuda o pendiente"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Monto opcional (Bs.)</label>
                        <Input type="number" value={d.monto} onChange={e => updateDeuda(i, 'monto', e.target.value)} placeholder="0" className="text-sm bg-white rounded-lg" />
                      </div>
                    </div>
                  ))}

                  {deudas.length > 0 && (
                    <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded-xl p-4">
                      <span className="font-bold text-red-700 text-sm">Total registrado</span>
                      <span className="font-black text-red-800 text-lg">Bs. {totalDeudas}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Comentario opcional */}
              {verificacionModo && (
                <div className="animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Comentario u observación opcional</label>
                  <textarea
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-univalle-primary"
                    placeholder="Detalle del problema pendiente"
                  />
                </div>
              )}

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setShowVerificarModal(false)}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !verificacionModo}
                  className="h-12 rounded-xl bg-univalle-action hover:bg-univalle-hover text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : 'Guardar Verificación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Componente auxiliar para filas del modal detalle ── */
function InfoField({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm text-slate-800 ${bold ? 'font-bold' : 'font-medium'}`}>{value}</p>
    </div>
  );
}
