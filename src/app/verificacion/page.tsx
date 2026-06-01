"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Search, FileText } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";

interface VerificationData {
  numero_documento: string;
  codigo_verificacion: string;
  fecha_emision: string;
  estado_documento: string;
  ruta_pdf_firmado: string;
  tramite_nombre: string;
  estudiante_nombre: string;
}

function VerificacionContent() {
  const searchParams = useSearchParams();
  const initCode = searchParams?.get("codigo") || searchParams?.get("code") || "";
  
  const [code, setCode] = useState(initCode);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'VALID' | 'INVALID'>('IDLE');
  const [docData, setDocData] = useState<VerificationData | null>(null);

  const handleVerify = useCallback(async (verifyCode: string = code) => {
    if (!verifyCode) return;
    setStatus('LOADING');
    setDocData(null);
    try {
      const res = await fetch(`/api/verificacion?codigo=${encodeURIComponent(verifyCode)}`);
      if (res.ok) {
        const data = await res.json();
        setDocData(data);
        setStatus('VALID');
      } else {
        setStatus('INVALID');
      }
    } catch (error) {
      console.error("Error verifying:", error);
      setStatus('INVALID');
    }
  }, [code]);

  useEffect(() => {
    if (initCode) {
      handleVerify(initCode);
    }
  }, [handleVerify, initCode]);

  return (
    <div className="min-h-screen flex flex-col p-6 items-center pt-12 md:pt-24 relative">
      <div className="absolute top-6 left-6 md:top-10 md:left-10 z-10 w-full max-w-7xl mx-auto px-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2 bg-white/50 backdrop-blur-md shadow-sm">
            <ArrowLeft size={18} />
            Volver
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-lg mb-8 text-center animate-in fade-in slide-in-from-bottom-4">
        <h1 className="text-3xl font-bold text-slate-900">Verificación de Trámites</h1>
        <p className="text-slate-600 mt-2">Valide la autenticidad de los documentos emitidos</p>
      </div>

      <Card className="w-full max-w-lg shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white/95 backdrop-blur-xl border-0 animate-in fade-in slide-in-from-bottom-8">
        <CardContent className="p-8">
          <div className="flex gap-3 mb-8">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej. UNV-1234-567"
              className="flex h-12 w-full rounded-[10px] border border-slate-300 bg-slate-50 px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-univalle-primary uppercase"
            />
            <Button onClick={() => handleVerify(code)} className="h-12 px-6 shadow-md" disabled={status === 'LOADING' || !code}>
              <Search size={20} />
            </Button>
          </div>

          {status === 'LOADING' && (
            <div className="py-12 text-center text-slate-500 animate-pulse">
              <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-univalle-action rounded-full animate-spin mb-4" />
              <p>Consultando base de datos...</p>
            </div>
          )}

          {status === 'VALID' && docData && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-[10px] p-6 text-center animate-in zoom-in-95 duration-300">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-emerald-800 mb-1">Documento Válido</h3>
              <p className="text-emerald-600 font-mono mb-6">{docData.codigo_verificacion}</p>
              
              <div className="bg-white rounded-lg p-4 text-left shadow-sm space-y-3 mb-6 border border-emerald-100">
                <div className="flex justify-between items-center border-b border-emerald-50 pb-2">
                  <span className="text-sm text-slate-500">Tipo de Trámite</span>
                  <span className="font-semibold text-slate-800">{docData.tramite_nombre}</span>
                </div>
                <div className="flex justify-between items-center border-b border-emerald-50 pb-2">
                  <span className="text-sm text-slate-500">Solicitante</span>
                  <span className="font-semibold text-slate-800">{docData.estudiante_nombre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Fecha de Emisión</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(docData.fecha_emision).toLocaleDateString('es-BO')}
                  </span>
                </div>
              </div>

              <div className="mx-auto w-32 h-32 bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
                 <img 
                   src={`/api/qr?data=${encodeURIComponent(window.location.origin + '/verificacion?codigo=' + docData.codigo_verificacion)}`}
                   alt="QR Verification"
                   className="w-full h-full opacity-80 mix-blend-multiply" 
                 />
              </div>
              <p className="text-xs text-slate-400 mt-3">Código QR de validación inalterable</p>

              <div className="mt-6 pt-4 border-t border-emerald-100 flex flex-col gap-3">
                <Link href={`/verificacion/documento?codigo=${docData.codigo_verificacion}`} className="w-full">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold tracking-widest text-xs uppercase"
                  >
                    <CheckCircle2 size={16} className="mr-2" />
                    Ver Documento Oficial
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  onClick={() => window.open(docData.ruta_pdf_firmado && !docData.ruta_pdf_firmado.startsWith('/') ? `/uploads/${docData.ruta_pdf_firmado}` : docData.ruta_pdf_firmado, '_blank')}
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold tracking-widest text-xs uppercase"
                >
                  <FileText size={16} className="mr-2" />
                  Ver archivo adjunto original
                </Button>
              </div>
            </div>
          )}

          {status === 'INVALID' && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] p-8 text-center animate-in zoom-in-95 duration-300">
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-800 mb-2">Trámite No Encontrado</h3>
              <p className="text-red-600 mb-4">El código verificado no existe en nuestros registros o el documento aún no ha sido emitido.</p>
              <Button variant="outline" onClick={() => {setCode(''); setStatus('IDLE');}}>Intentar otra vez</Button>
            </div>
          )}

        </CardContent>
      </Card>
      
      <div className="mt-auto pt-10 pb-6 text-center text-slate-500 text-sm">
        <p>Sistema de Verificación Univalle © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

export default function VerificacionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f6fa]" />}>
      <VerificacionContent />
    </Suspense>
  );
}
