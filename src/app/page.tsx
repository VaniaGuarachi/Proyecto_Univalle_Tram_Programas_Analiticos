import Link from "next/link";
import Image from "next/image";
import { TramiteSearch } from "@/components/TramiteSearch";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ClipboardList,
  Clock,
  CreditCard,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-univalle-dark via-univalle-primary to-univalle-light text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.14),transparent_32rem)]" />
        <div className="container-custom grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="relative">
            <span className="text-xs font-black uppercase tracking-[0.24em] text-univalle-gold">
              Universidad Privada del Valle
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Portal institucional de trámites estudiantiles
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/82 md:text-lg">
              Consulta el estado actual y el registro histórico de tus solicitudes académicas y administrativas desde una experiencia segura y moderna.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-black text-univalle-primary shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-gray-100">
                Iniciar sesión
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/registro" className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/8 px-6 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-univalle-primary">
                Registrarse
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <div className="relative h-56 w-full">
                <Image src="/img/carrusel1.jpg" alt="Campus Univalle" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" priority />
              </div>
              <div className="p-8">
                <div className="mb-6 flex items-center gap-4">
                  <Image src="/img/logo.png" alt="Logo Univalle" width={56} height={56} className="rounded-2xl bg-white object-contain" />
                  <div>
                    <h3 className="text-xl font-black">Sistema de Legalización</h3>
                    <p className="text-sm text-gray-200">Gestión de Trámites Académicos</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <HeroCheck text="Tramites en linea 24/7" />
                  <HeroCheck text="Seguimiento en tiempo real" />
                  <HeroCheck text="Seguridad y confidencialidad" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TramiteSearch />

      <section className="bg-slate-50 py-16">
        <div className="container-custom">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
              Servicios Estudiantiles
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Gestiona todos tus trámites académicos, administrativos y financieros desde un solo lugar.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <ServiceCard icon={<BookOpenCheck className="h-8 w-8" />} title="Académico" text="Consulta y seguimiento de solicitudes relacionadas con documentos académicos." href="/estudiante/tramites" />
            <ServiceCard icon={<ClipboardList className="h-8 w-8" />} title="Administrativo" text="Certificados, legalizaciones y trámites gestionados por secretaría." href="/estudiante/tramites" />
            <ServiceCard icon={<CreditCard className="h-8 w-8" />} title="Financiero" text="Validación de pagos y seguimiento de comprobantes de trámite." href="/estudiante/pago" />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-univalle-dark via-univalle-primary to-univalle-light py-16 text-white">
        <div className="container-custom grid gap-8 text-center md:grid-cols-4">
          <Metric value="10K+" label="Estudiantes Activos" />
          <Metric value="50+" label="Programas Academicos" />
          <Metric value="15K+" label="Tramites Realizados" />
          <Metric value="98%" label="Satisfaccion Estudiantil" />
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container-custom">
          <div className="rounded-[2rem] border border-white/20 bg-gradient-to-r from-univalle-dark to-univalle-primary p-8 text-white shadow-2xl shadow-univalle-primary/15 md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="mb-2 text-2xl font-black tracking-tight md:text-3xl">¿Listo para iniciar tu trámite?</h3>
                <p className="text-gray-100">Accede a nuestro sistema y realiza tus solicitudes en minutos.</p>
              </div>
              <Link href="/estudiante/tramites" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-black text-univalle-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-100">
                Comenzar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container-custom grid gap-8 md:grid-cols-3">
          <Feature icon={<Clock className="h-8 w-8" />} title="Disponibilidad 24/7" text="Realiza tus trámites en cualquier momento, desde cualquier lugar." />
          <Feature icon={<ShieldCheck className="h-8 w-8" />} title="Seguridad Garantizada" text="Tus datos estan protegidos con una sesion segura y cookie HTTP-only." />
          <Feature icon={<Users className="h-8 w-8" />} title="Soporte Personalizado" text="Equipo de soporte disponible para ayudarte en cada paso." />
        </div>
      </section>
    </div>
  );
}

function HeroCheck({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <BadgeCheck className="h-5 w-5 text-univalle-gold" />
      <span className="font-medium text-white/88">{text}</span>
    </div>
  );
}

function ServiceCard({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-univalle-primary/8 text-univalle-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-black text-gray-900">{title}</h3>
      <p className="mb-4 text-gray-600">{text}</p>
      <Link href={href} className="inline-flex items-center font-semibold text-univalle-primary transition hover:gap-2">
        Ver más
        <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="mb-2 text-4xl font-bold">{value}</div>
      <div className="text-gray-200">{label}</div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-univalle-primary/10 text-univalle-primary">
        {icon}
      </div>
      <h4 className="mb-2 text-lg font-bold">{title}</h4>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}
