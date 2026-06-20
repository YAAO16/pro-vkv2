import { useContext } from 'react';
import { PermisosContext } from '../context/PermisosContext';
import type { PermisosContextType } from '../context/PermisosContext';

export const usePermisos = (): PermisosContextType => {
    const context = useContext(PermisosContext);
    if (!context) {
        throw new Error('usePermisos debe usarse dentro de PermisosProvider');
    }
    return context;
};
