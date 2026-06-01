import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#24141a] text-white">
      <div className="bg-gradient-to-r from-univalle-dark via-univalle-primary to-univalle-light">
        <div className="container-custom flex flex-col gap-2 py-3 text-sm font-medium text-white/88 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Horario de Atencion: Lun-Vie 8:00 - 17:00</span>
            <span className="hidden sm:inline">|</span>
            <span>WhatsApp: +591 12345678</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="transition hover:text-gray-300">Facebook</a>
            <a href="#" className="transition hover:text-gray-300">Twitter</a>
            <a href="#" className="transition hover:text-gray-300">Instagram</a>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Image src="/img/logo.png" alt="Logo Univalle" width={42} height={42} className="rounded-xl bg-white object-contain" />
              <h3 className="text-lg font-black">Sistema de Legalización</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Plataforma oficial para la gestion y seguimiento de tramites de legalizacion de documentos academicos.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-gray-200">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/estudiante/tramites/historial" className="text-gray-400 transition hover:text-white">Mis Solicitudes</Link></li>
              <li><Link href="/estudiante/tramites" className="text-gray-400 transition hover:text-white">Nueva Solicitud</Link></li>
              <li><Link href="/verificacion" className="text-gray-400 transition hover:text-white">Verificar Codigo</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-gray-200">Contacto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Campus Tiquipaya, Cochabamba</li>
              <li>(591) 4-4318800</li>
              <li>legalizacion@univalle.edu</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-gray-200">Horarios de Atención</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Lunes a Viernes: 8:00 - 17:00</li>
              <li>Sabados: 9:00 - 13:00</li>
              <li>Domingos: Cerrado</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700">
        <div className="container-custom flex flex-col items-center justify-between gap-3 py-6 text-sm text-gray-400 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Universidad del Valle - Bolivia. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="#" className="transition hover:text-white">Politica de Privacidad</Link>
            <Link href="#" className="transition hover:text-white">Terminos y Condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
