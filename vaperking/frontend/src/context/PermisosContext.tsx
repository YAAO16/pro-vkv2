import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';

interface Permiso {
    id: number;
    nombre: string;
    descripcion: string;
    modulo: string;
}

interface PermisosContextType {
    permisos: string[];
    loading: boolean;
    isAdmin: boolean;
    isVendedor: boolean;
    tienePermiso: (permiso: string) => boolean;
    recargarPermisos: () => Promise<void>;
}

const PermisosContext = createContext<PermisosContextType | undefined>(undefined);

let permisosGlobal: string[] = [];

export const usePermisos = () => {
    const context = useContext(PermisosContext);
    if (!context) {
        throw new Error('usePermisos debe usarse dentro de PermisosProvider');
    }
    return context;
};

interface PermisosProviderProps {
    children: ReactNode;
}

export function PermisosProvider({ children }: PermisosProviderProps) {
    const { usuario, isAuthenticated } = useAuthStore();
    const [permisos, setPermisos] = useState<string[]>(permisosGlobal);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isVendedor, setIsVendedor] = useState(false);

    const cargarPermisos = async () => {
        try {
            setLoading(true);
            
            if (!usuario) {
                setPermisos([]);
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            const userRol = usuario.rol;
            setIsAdmin(userRol === 'admin');
            setIsVendedor(userRol === 'vendedor');

            if (userRol === 'admin') {
                permisosGlobal = ['*'];
                setPermisos(['*']);
                setLoading(false);
                return;
            }

            if (usuario.id) {
                const response = await apiClient.get(`/usuarios/${usuario.id}/permisos`);
                permisosGlobal = response.data.map((p: Permiso) => p.nombre);
                setPermisos(permisosGlobal);
            }
        } catch (error) {
            console.error('Error cargando permisos:', error);
            setPermisos([]);
        } finally {
            setLoading(false);
        }
    };

    const recargarPermisos = async () => {
        await cargarPermisos();
    };

    useEffect(() => {
        cargarPermisos();
    }, [usuario, isAuthenticated]);

    const tienePermiso = (permiso: string): boolean => {
        if (isAdmin) return true;
        return permisos.includes(permiso);
    };

    return (
        <PermisosContext.Provider value={{
            permisos,
            loading,
            isAdmin,
            isVendedor,
            tienePermiso,
            recargarPermisos
        }}>
            {children}
        </PermisosContext.Provider>
    );
}