import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';

export interface Permiso {
    id: number;
    nombre: string;
    descripcion: string;
    modulo: string;
}

export interface PermisosContextType {
    permisos: string[];
    loading: boolean;
    isAdmin: boolean;
    isVendedor: boolean;
    tienePermiso: (permiso: string) => boolean;
    recargarPermisos: () => Promise<void>;
}

// Exportamos el contexto para que el hook pueda usarlo
export const PermisosContext = createContext<PermisosContextType | undefined>(undefined);

let permisosGlobal: string[] = [];

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
                setIsVendedor(false);
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

            // Para vendedores, intentamos cargar permisos
            if (usuario.id) {
                try {
                    const response = await apiClient.get(`/usuarios/${usuario.id}/permisos`);
                    permisosGlobal = response.data.map((p: Permiso) => p.nombre);
                    setPermisos(permisosGlobal);
                    console.log('✅ Permisos cargados:', permisosGlobal);
                } catch (error: any) {
                    console.error('Error cargando permisos:', error);
                    // Si es 403 o 404, asignamos permisos por defecto
                    if (error.response?.status === 403 || error.response?.status === 404) {
                        console.log('⚠️ Usando permisos por defecto para vendedor');
                        const permisosDefecto = [
                            'dashboard_ver',
                            'ventas_ver', 'ventas_crear', 'ventas_ajustar_precio',
                            'productos_ver',
                            'inventario_ver',
                            'gastos_ver', 'gastos_crear',
                            'cierres_ver', 'cierres_crear',
                            'observaciones_ver', 'observaciones_crear',
                            'reportes_ver',
                            'danados_crear', 'danados_ver'
                        ];
                        permisosGlobal = permisosDefecto;
                        setPermisos(permisosDefecto);
                    } else {
                        setPermisos([]);
                    }
                }
            }
        } catch (error) {
            console.error('Error en cargarPermisos:', error);
            setPermisos([]);
        } finally {
            setLoading(false);
        }
    };

    const recargarPermisos = async () => {
        await cargarPermisos();
    };

    useEffect(() => {
        console.log('🔄 useEffect de PermisosContext - usuario:', usuario);
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