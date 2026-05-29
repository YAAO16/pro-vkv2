import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    rol: string;
    sede_id: number | null;
    activo: boolean;
}

interface AuthState {
    token: string | null;
    usuario: Usuario | null;
    isAuthenticated: boolean;
    login: (token: string, usuario: Usuario) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            usuario: null,
            isAuthenticated: false,
            login: (token, usuario) => {
                localStorage.setItem('token', token);
                set({ token, usuario, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem('token');
                set({ token: null, usuario: null, isAuthenticated: false });
            },
        }),
        {
            name: 'vaperking-auth',
        }
    )
);