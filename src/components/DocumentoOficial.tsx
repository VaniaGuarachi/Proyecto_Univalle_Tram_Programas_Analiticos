"use client";

import React from "react";

export interface DocumentoData {
  numero_documento: string;
  codigo_verificacion: string;
  fecha_emision: string;
  estado_documento: string;
  ruta_pdf_firmado: string;
  firma_autoridad: string | null;
  firma_responsable: string | null;
  observaciones: string | null;
  tramite_nombre: string;
  estudiante_nombre: string;
  estudiante_matricula: string | null;
}

interface Props {
  data: DocumentoData;
}

export default function DocumentoOficial({ data }: Props) {
  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verificacion?codigo=${data.codigo_verificacion}`
    : `https://tramites.univalle.edu/verificacion?codigo=${data.codigo_verificacion}`;

  const qrImageUrl = `/api/qr?data=${encodeURIComponent(qrUrl)}`;

  const dateStr = new Date(data.fecha_emision).toLocaleDateString("es-BO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full flex justify-center bg-slate-100 p-8 print:p-0 print:bg-white min-h-screen">
      <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[20mm] relative border border-slate-200 print:border-none">
        {/* Encabezado Institucional */}
        <div className="flex justify-between items-center border-b-2 border-[#8C1B1B] pb-6 mb-10">
          <div className="flex items-center gap-4">
            <img src="/img/Logo_Doc.png" alt="Univalle" className="w-20 h-16 object-contain" />
            <div>
              <h1 className="text-2xl font-black text-[#8C1B1B] uppercase tracking-widest font-serif">Univalle</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Universidad Privada del Valle</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nº {data.numero_documento}</p>
            <p className="text-[10px] text-slate-400 uppercase">Emitido: {dateStr}</p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-16 mt-8">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-widest mb-3 font-serif">Certificación Académica</h2>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">Departamento de Registro y Trámites</h3>
        </div>

        {/* Contenido del Certificado */}
        <div className="space-y-8 text-justify text-slate-800 leading-loose">
          <p className="text-lg">
            La Universidad Privada del Valle certifica que, habiendo cumplido con todos los requisitos académicos y administrativos establecidos en los reglamentos vigentes, se emite el presente documento correspondiente al trámite de:
          </p>

          <div className="bg-slate-50 p-6 border-l-4 border-[#8C1B1B] rounded-r-xl my-8">
            <p className="text-xl font-black text-[#8C1B1B] uppercase tracking-widest">{data.tramite_nombre}</p>
          </div>

          <p className="text-lg">
            A favor del estudiante:
          </p>

          <div className="text-center my-8">
            <p className="text-2xl font-black text-slate-900 uppercase tracking-wider">{data.estudiante_nombre}</p>
            {data.estudiante_matricula && (
              <p className="text-sm font-bold text-slate-500 tracking-[0.2em] mt-2">MATRÍCULA / CÓDIGO: {data.estudiante_matricula}</p>
            )}
          </div>

          {data.observaciones && (
            <div className="text-sm text-slate-600 mt-8 italic">
              <strong>Observaciones:</strong> {data.observaciones}
            </div>
          )}

          <p className="text-lg mt-8">
            Y para que conste y surta los efectos oportunos que el interesado requiera, se expide y firma el presente certificado digital, registrado en los archivos institucionales.
          </p>
        </div>

        {/* Firmas y Sellos - Espacio flexible para empujar hacia abajo */}
        <div className="mt-32 mb-20">
          <div className="grid grid-cols-2 gap-16 px-10">
            {data.firma_responsable && (
              <div className="text-center border-t border-slate-300 pt-4">
                <p className="font-black text-sm uppercase text-slate-800">{data.firma_responsable}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Responsable de Emisión</p>
              </div>
            )}
            
            {data.firma_autoridad && (
              <div className="text-center border-t border-slate-300 pt-4">
                <p className="font-black text-sm uppercase text-slate-800">{data.firma_autoridad}</p>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Autoridad Académica</p>
              </div>
            )}
          </div>
        </div>

        {/* Pie de Página de Validación */}
        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] border-t-2 border-slate-100 pt-6 flex justify-between items-end">
          <div className="text-[10px] text-slate-500 max-w-sm">
            <p className="font-black uppercase tracking-widest text-slate-800 mb-1">Verificación de Autenticidad</p>
            <p className="leading-relaxed">
              Este documento es una representación digital válida. Para comprobar su autenticidad, escanee el código QR o ingrese el código de seguridad en nuestro portal de verificación.
            </p>
            <p className="mt-2 font-mono font-bold text-slate-700 bg-slate-100 inline-block px-2 py-1 rounded">CÓDIGO: {data.codigo_verificacion}</p>
          </div>
          
          <div className="w-28 h-28 border-4 border-white shadow-sm rounded-lg overflow-hidden shrink-0">
            <img src={qrImageUrl} alt="QR de Verificación" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
