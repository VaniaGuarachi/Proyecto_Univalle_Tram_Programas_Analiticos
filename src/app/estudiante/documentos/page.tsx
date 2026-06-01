"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, FileWarning, Loader2, Mail, UserRound, GraduationCap, Hash, ExternalLink } from "lucide-react";

interface UploadedDocument {
  label: string;
  url: string;
}

interface EmittedDocument {
  id_documento_emitido: number;
  numero_documento: string;
  tramite: string;
  fecha_emision: string;
  estado_documento: string;
  ruta_pdf_firmado: string | null;
}

interface DocumentsData {
  student: {
    nombres: string;
    apellidos: string;
    codigo_login: string;
    correo_institucional: string;
    carrera: string;
    semestre: number | null;
  };
  uploadedDocuments: UploadedDocument[];
  emittedDocuments: EmittedDocument[];
}

function isImage(url: string) {
  return /\.(png|jpe?g|webp)$/i.test(url);
}

export default function DocumentosEstudiante() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DocumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      if (!user?.id_usuario) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/estudiante/documentos?userId=${user.id_usuario}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error al cargar documentos");
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar documentos");
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [user?.id_usuario]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 py-20">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
        <p className="text-slate-500 font-medium">Cargando tus documentos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center">
        <p className="text-red-600">{error || "No se pudo cargar la información."}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700">Reintentar</Button>
      </div>
    );
  }

  const student = data.student;

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mis Documentos</h1>
        <p className="text-slate-500 mt-1">Información académica y documentos registrados.</p>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="bg-univalle-primary p-6 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">Estudiante</p>
          <h2 className="text-2xl font-black mt-1">{student.nombres} {student.apellidos}</h2>
        </div>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Info icon={<Hash size={18} />} label="Código/usuario" value={student.codigo_login} />
          <Info icon={<Mail size={18} />} label="Correo" value={student.correo_institucional} />
          <Info icon={<GraduationCap size={18} />} label="Carrera" value={student.carrera} />
          <Info icon={<UserRound size={18} />} label="Semestre" value={student.semestre ? String(student.semestre) : "No definido"} />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-slate-900">Documentos subidos</h2>
        {data.uploadedDocuments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <FileWarning className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-bold">No se subieron documentos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.uploadedDocuments.map((doc) => (
              <Card key={doc.label} className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-univalle-primary rounded-lg">
                        <FileText size={22} />
                      </div>
                      <h3 className="font-black text-slate-800">{doc.label}</h3>
                    </div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-univalle-action hover:text-univalle-hover">
                      <ExternalLink size={20} />
                    </a>
                  </div>
                  <div className="h-80 bg-slate-50">
                    {isImage(doc.url) ? (
                      <img src={doc.url} alt={doc.label} className="w-full h-full object-contain" />
                    ) : (
                      <iframe src={doc.url} title={doc.label} className="w-full h-full" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {data.emittedDocuments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-black text-slate-900">Documentos emitidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.emittedDocuments.map((doc) => (
              <Card key={doc.id_documento_emitido} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="font-black text-slate-900">{doc.tramite}</p>
                  <p className="text-xs font-mono text-univalle-action mt-1">N° {doc.numero_documento}</p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(doc.fecha_emision).toLocaleDateString("es-BO")}</p>
                  {doc.ruta_pdf_firmado && (
                    <a href={doc.ruta_pdf_firmado} target="_blank" rel="noreferrer">
                      <Button className="w-full mt-4 gap-2"><ExternalLink size={16} /> Ver documento</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <div className="flex items-center gap-2 text-univalle-primary mb-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <p className="font-bold text-slate-800 break-words">{value}</p>
    </div>
  );
}
