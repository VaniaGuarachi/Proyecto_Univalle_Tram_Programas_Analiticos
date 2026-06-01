import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ESTUDIANTE' | 'CAJERO' | 'BIBLIOTECARIO' | 'TRAMITES' | null;

interface User {
  id_usuario: number;
  codigo_login: string;
  nombres: string;
  apellidos: string;
  rol: Role;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'univalle-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
