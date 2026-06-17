import React from 'react';
import { usePermisos } from '../context/PermisosContext';

interface BotonConPermisoProps {
    permiso: string;
    onClick: () => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    disabled?: boolean;
}

const BotonConPermiso: React.FC<BotonConPermisoProps> = ({ 
    permiso, 
    onClick, 
    children, 
    style, 
    className, 
    disabled 
}) => {
    const { tienePermiso, loading } = usePermisos();

    if (loading) return null;
    
    if (!tienePermiso(permiso)) return null;

    return (
        <button
            onClick={onClick}
            style={style}
            className={className}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default BotonConPermiso;