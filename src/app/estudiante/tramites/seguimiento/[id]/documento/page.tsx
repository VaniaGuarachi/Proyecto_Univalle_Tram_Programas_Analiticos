"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import DocumentoOficial, { DocumentoData } from "@/components/DocumentoOficial";

export default function EstudianteDocumentoPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<DocumentoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!params?.id) return;
      try {
        const res = await fetch(`/api/estudiante/tramites/seguimiento/${params.id}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Error al cargar el documento");
        }

        if (!json.documento || (json.documento.estado_documento !== 'EMITIDO' && json.documento.estado_documento !== 'FIRMADO')) {
          throw new Error("El documento no está disponible o no ha sido emitido aún.");
        }

        const docData: DocumentoData = {
          numero_documento: json.documento.numero_documento,
          codigo_verificacion: json.documento.codigo_verificacion,
          fecha_emision: json.documento.fecha_emision,
          estado_documento: json.documento.estado_documento,
          ruta_pdf_firmado: json.documento.ruta_pdf_firmado,
          firma_autoridad: json.documento.firma_autoridad,
          firma_responsable: json.documento.firma_responsable,
          observaciones: json.documento.observaciones,
          tramite_nombre: json.tramite.tramite_nombre,
          estudiante_nombre: json.tramite.estudiante_nombre,
          estudiante_matricula: json.tramite.estudiante_matricula
        };

        setData(docData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al cargar el documento");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (data?.ruta_pdf_firmado) window.open(data.ruta_pdf_firmado, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando documento oficial...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-red-50 p-8 rounded-3xl max-w-md w-full text-center border-2 border-red-100">
          <h2 className="text-2xl font-black text-red-800 mb-2">Error</h2>
          <p className="text-red-600 font-medium mb-6">{error}</p>
          <Button onClick={() => router.back()} className="w-full bg-red-600 hover:bg-red-700">Volver Atrás</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Barra superior de herramientas - No se imprime */}
      <div className="bg-white border-b border-slate-200 p-4 print:hidden sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-600 font-bold gap-2">
          <ArrowLeft size={18} />
          Volver al Seguimiento
        </Button>
        <div className="flex items-center gap-3">
          {data.ruta_pdf_firmado && (
            <Button onClick={handleDownload} className="bg-univalle-primary text-white hover:bg-black font-black uppercase text-xs tracking-widest gap-2">
              <Download size={16} />
              Descargar PDF completo
            </Button>
          )}
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-xs tracking-widest gap-2">
            <Printer size={16} />
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      {data.ruta_pdf_firmado ? (
        <div className="flex-1 p-4 md:p-8 print:p-0">
          <iframe
            src={`${data.ruta_pdf_firmado}#toolbar=1`}
            className="w-full h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xl border border-slate-200 print:h-screen print:rounded-none print:border-0 print:shadow-none"
          />
        </div>
      ) : (
        <DocumentoOficial data={data} />
      )}
    </div>
  );
}
