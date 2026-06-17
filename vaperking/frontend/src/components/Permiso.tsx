import React from 'react';
import { usePermisos } from '../context/PermisosContext';

interface PermisoProps {
    permiso: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const Permiso: React.FC<PermisoProps> = ({ permiso, children, fallback = null }) => {
    const { tienePermiso, loading } = usePermisos();

    if (loading) return null;
    
    return tienePermiso(permiso) ? <>{children}</> : <>{fallback}</>;
};

export default Permiso;