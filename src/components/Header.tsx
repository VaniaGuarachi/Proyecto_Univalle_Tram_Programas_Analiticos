"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  title?: string;
  onLogout?: () => void;
  userName?: string;
  userRole?: string;
}

export function Header({ title, onLogout, userName, userRole }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      logout();
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/78 px-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl md:px-8">
      <div className="flex-1">
        {title && (
          <h1 className="text-base font-black uppercase tracking-[0.08em] text-slate-800 md:text-lg">
            {title}
          </h1>
        )}
      </div>

      <div className="relative">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 rounded-2xl border border-transparent p-1.5 transition-all hover:border-slate-200/70 hover:bg-white hover:shadow-sm focus:outline-none"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black leading-tight text-slate-900">
              {userName || (user ? `${user.nombres} ${user.apellidos}` : "Usuario")}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {userRole || user?.rol || "Invitado"} {user?.codigo_login ? `- ${user?.codigo_login}` : ""}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-univalle-primary/10 bg-univalle-primary/10 text-univalle-primary shadow-inner">
            <UserIcon size={20} />
          </div>
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200/70 bg-white/95 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
