"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import DocumentoOficial, { DocumentoData } from "@/components/DocumentoOficial";

function VerificacionDocumentoContent() {
  const searchParams = useSearchParams();
  const codigo = searchParams?.get("codigo");
  const router = useRouter();
  
  const [data, setData] = useState<DocumentoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!codigo) {
        setError("No se proporcionó un código de verificación.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/verificacion?codigo=${encodeURIComponent(codigo)}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Documento no encontrado o no válido.");
        }

        const docData: DocumentoData = {
          numero_documento: json.numero_documento,
          codigo_verificacion: json.codigo_verificacion,
          fecha_emision: json.fecha_emision,
          estado_documento: json.estado_documento,
          ruta_pdf_firmado: json.ruta_pdf_firmado,
          firma_autoridad: json.firma_autoridad,
          firma_responsable: json.firma_responsable,
          observaciones: json.observaciones,
          tramite_nombre: json.tramite_nombre,
          estudiante_nombre: json.estudiante_nombre,
          estudiante_matricula: json.estudiante_matricula
        };

        setData(docData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [codigo]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-univalle-primary" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Verificando y cargando documento oficial...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-red-50 p-8 rounded-3xl max-w-md w-full text-center border-2 border-red-100">
          <h2 className="text-2xl font-black text-red-800 mb-2">Error de Verificación</h2>
          <p className="text-red-600 font-medium mb-6">{error}</p>
          <Button onClick={() => router.push('/verificacion')} className="w-full bg-red-600 hover:bg-red-700">Volver a Verificación</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Barra superior de herramientas - No se imprime */}
      <div className="bg-white border-b border-slate-200 p-4 print:hidden sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(`/verificacion?codigo=${data.codigo_verificacion}`)} className="text-slate-600 font-bold gap-2">
          <ArrowLeft size={18} />
          Volver a Detalles
        </Button>
        <div className="flex items-center gap-3">
          <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800 font-black uppercase text-xs tracking-widest gap-2">
            <Printer size={16} />
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      <DocumentoOficial data={data} />
    </div>
  );
}

export default function VerificacionDocumentoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <VerificacionDocumentoContent />
    </Suspense>
  );
}
