"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList,
  FolderOpen,
  Home,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_MENUS: Record<string, { label: string; href: string; icon: React.ReactNode }[]> = {
  ESTUDIANTE: [
    { label: "Inicio", href: "/estudiante/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Historial", href: "/estudiante/tramites/historial", icon: <ClipboardList size={20} /> },
    { label: "Trámites", href: "/estudiante/tramites", icon: <FileText size={20} /> },
    { label: "Documentos", href: "/estudiante/documentos", icon: <FolderOpen size={20} /> },
  ],
  CAJERO: [
    { label: "Inicio", href: "/cajero/dashboard", icon: <Home size={20} /> },
    { label: "Pagos", href: "/cajero/pagos", icon: <DollarSign size={20} /> },
    { label: "Historial", href: "/cajero/historial", icon: <FileText size={20} /> },
  ],
  BIBLIOTECARIO: [
    { label: "Inicio", href: "/bibliotecario/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Historial", href: "/bibliotecario/historial", icon: <FileText size={20} /> },
  ],
  TRAMITES: [
    { label: "Inicio",    href: "/tramites/dashboard", icon: <Home size={20} /> },
    { label: "Historial", href: "/tramites/historial",  icon: <FileText size={20} /> },
  ]
};

interface SidebarProps {
  activeMenu?: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  userType?: string;
}

export function Sidebar({ activeMenu, onMenuChange, onLogout, userType }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const menuItems = (userType === 'tramite' || user?.rol === 'TRAMITES') 
    ? ROLE_MENUS['TRAMITES'] 
    : (user?.rol ? ROLE_MENUS[user.rol as string] : []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.14),transparent_30rem)] pointer-events-none" />
      <div className="relative px-6 mb-8 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-xl shadow-black/10 ring-1 ring-white/30">
          <img src="/img/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col text-white">
          <span className="font-black text-base tracking-tight leading-tight">Universidad Privada<br/>del Valle</span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">Gestión académica</span>
        </div>
      </div>

      <nav className="relative flex-1 px-4 space-y-1.5">
        {menuItems?.map((item) => {
          let isActive = false;
          if (activeMenu) {
            isActive = activeMenu === item.label;
          } else {
            if (user?.rol === 'ESTUDIANTE') {
              // Regla especial para estudiante: exacto o rama específica
              if (item.label === "Inicio") isActive = pathname === item.href;
              else if (item.label === "Historial") isActive = pathname?.startsWith(item.href) || pathname?.includes('/seguimiento/');
              else if (item.label === "Trámites") isActive = pathname === item.href;
              else isActive = pathname?.startsWith(item.href);
            } else {
              isActive = pathname?.startsWith(item.href);
            }
          }
          
          const content = (
            <>
              {item.icon}
              {item.label}
            </>
          );

          if (onMenuChange) {
            return (
              <button
                key={item.label}
                onClick={() => onMenuChange(item.label)}
                className={cn(
                  "group relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-[12px] uppercase tracking-[0.14em]",
                  isActive 
                    ? "bg-white text-univalle-action shadow-xl shadow-black/15 scale-[1.01]" 
                    : "text-white/72 hover:bg-white/10 hover:text-white hover:translate-x-0.5"
                )}
              >
                {isActive && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-univalle-gold" />}
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-[12px] uppercase tracking-[0.14em]",
                isActive 
                  ? "bg-white text-univalle-action shadow-xl shadow-black/15 scale-[1.01]" 
                  : "text-white/72 hover:bg-white/10 hover:text-white hover:translate-x-0.5"
              )}
            >
              {isActive && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-univalle-gold" />}
              {content}
            </Link>
          );
        })}
      </nav>
      
      <div className="relative px-6 mt-auto">
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-wider"
          >
            <FolderOpen size={18} />
            Salir
          </button>
        )}
        <div className="py-4 border-t border-white/15 text-xs text-white/55">
          <p>© 2026 Universidad Privada del Valle</p>
          <p className="mt-1">Sistema Web Académico</p>
        </div>
      </div>
    </div>
  );
}
