export interface EstudianteConTramites {
  id: string;
  nombre: string;
  codigo: string;
  carrera: string;
  totalTramites: number;
  tramitesPendientes: number;
  tramitesCompletados: number;
  ultimaActividad: string; // formato: "DD/MM/YYYY HH:mm"
}

export interface Tramite {
  id: string; // codigo_seguimiento
  id_db?: number; // id_tramite en DB
  tipo: string;
  descripcion: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  fechaSolicitud: string;
}

export interface FirmaDisponible {
  id: string;
  nombre: string;
  cargo: string;
  url?: string;
}
