import { create } from 'zustand';

export interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    rol: string;
    sede_id: number | null;
}

interface AuthState {
    usuario: Usuario | null;
    isAuthenticated: boolean;
    token: string | null;
    login: (token: string, usuario: Usuario) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    usuario: null,
    isAuthenticated: false,
    token: null,
    login: (token: string, usuario: Usuario) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(usuario));
        set({ 
            usuario, 
            token, 
            isAuthenticated: true 
        });
    },
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        set({ 
            usuario: null, 
            token: null, 
            isAuthenticated: false 
        });
    },
}));