import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../context/PermisosContext';

interface Permiso {
    id: number;
    nombre: string;
    descripcion: string;
    modulo: string;
}

interface PanelPermisosProps {
    usuarioId: number;
    usuarioNombre: string;
    usuarioRol?: string;
    onClose: () => void;
    onSave: () => void;
}

// Permisos por defecto según el rol base
const PERMISOS_POR_DEFECTO = {
    admin: [
        'dashboard_ver',
        'ventas_ver', 'ventas_crear', 'ventas_anular', 'ventas_ajustar_precio',
        'inventario_ver', 'inventario_ajustar',
        'productos_ver', 'productos_crear', 'productos_editar', 'productos_eliminar',
        'gastos_ver', 'gastos_crear', 'gastos_editar', 'gastos_eliminar',
        'cierres_ver', 'cierres_crear',
        'observaciones_ver', 'observaciones_crear',
        'reportes_ver', 'reportes_exportar',
        'sedes_ver', 'sedes_crear', 'sedes_editar', 'sedes_eliminar',
        'usuarios_ver', 'usuarios_crear', 'usuarios_editar', 'usuarios_eliminar',
        'sueldos_ver', 'sueldos_crear', 'sueldos_editar', 'sueldos_eliminar',
        'danados_ver', 'danados_crear', 'danados_eliminar',
        'historial_ver'
    ],
    vendedor: [
        'dashboard_ver',
        'ventas_ver', 'ventas_crear', 'ventas_ajustar_precio',
        'inventario_ver',
        'productos_ver',
        'gastos_ver', 'gastos_crear',
        'cierres_ver', 'cierres_crear',
        'observaciones_ver', 'observaciones_crear',
        'reportes_ver',
        'danados_crear', 'danados_ver'
    ]
};

// Módulos del dashboard para agrupar
const MODULOS: Record<string, string> = {
    dashboard: '📊 Dashboard',
    ventas: '💰 Ventas',
    inventario: '📦 Inventario',
    productos: '🏷️ Productos',
    gastos: '💸 Gastos',
    cierres: '🔒 Cierres Diarios',
    observaciones: '📝 Observaciones',
    reportes: '📈 Reportes',
    sedes: '🏢 Sedes',
    usuarios: '👥 Usuarios',
    sueldos: '💵 Sueldos',
    danados: '⚠️ Productos Dañados',
    historial: '📜 Historial',
    general: '📌 General'
};

const PanelPermisos: React.FC<PanelPermisosProps> = ({ 
    usuarioId, 
    usuarioNombre, 
    usuarioRol = 'vendedor',
    onClose, 
    onSave 
}) => {
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [permisosUsuario, setPermisosUsuario] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { recargarPermisos } = usePermisos();

    useEffect(() => {
        if (usuarioId) {
            cargarPermisos();
        }
    }, [usuarioId]);

    const cargarPermisos = async () => {
        try {
            setLoading(true);
            console.log('Cargando permisos para usuario:', usuarioId, 'Rol base:', usuarioRol);
            
            const responsePermisos = await apiClient.get('/permisos/');
            const todosLosPermisos = responsePermisos.data;
            setPermisos(todosLosPermisos);

            try {
                const responseUsuarioPermisos = await apiClient.get(`/usuarios/${usuarioId}/permisos`);
                const permisosAsignados = responseUsuarioPermisos.data.map((p: any) => p.id);
                setPermisosUsuario(permisosAsignados);
                console.log('Permisos actuales del usuario:', permisosAsignados);
            } catch (error) {
                console.log('Usuario sin permisos personalizados, usando permisos por defecto');
                const permisosDefecto = PERMISOS_POR_DEFECTO[usuarioRol as keyof typeof PERMISOS_POR_DEFECTO] || PERMISOS_POR_DEFECTO.vendedor;
                const permisosDefectoIds = todosLosPermisos
                    .filter((p: Permiso) => permisosDefecto.includes(p.nombre))
                    .map((p: Permiso) => p.id);
                setPermisosUsuario(permisosDefectoIds);
            }
        } catch (error) {
            console.error('Error cargando permisos:', error);
            alert('Error al cargar los permisos');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermiso = (permisoId: number) => {
        setPermisosUsuario(prev =>
            prev.includes(permisoId)
                ? prev.filter(id => id !== permisoId)
                : [...prev, permisoId]
        );
    };

    const handleSave = async () => {
        if (!usuarioId) {
            alert('Error: ID de usuario no válido');
            return;
        }

        try {
            setSaving(true);
            
            const response = await apiClient.post(`/usuarios/${usuarioId}/permisos`, {
                permisos_ids: permisosUsuario
            });
            
            if (response.status === 200) {
                alert('✅ Permisos guardados correctamente');
                
                // Recargar permisos globales si es el usuario actual
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const currentUser = JSON.parse(userStr);
                    if (currentUser.id === usuarioId) {
                        await recargarPermisos();
                        console.log('Permisos globales recargados');
                    }
                }
                
                onSave();
                onClose();
            }
        } catch (error) {
            console.error('Error guardando permisos:', error);
            alert('Error al guardar los permisos');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefault = () => {
        const permisosDefecto = PERMISOS_POR_DEFECTO[usuarioRol as keyof typeof PERMISOS_POR_DEFECTO] || PERMISOS_POR_DEFECTO.vendedor;
        const permisosDefectoIds = permisos
            .filter(p => permisosDefecto.includes(p.nombre))
            .map(p => p.id);
        setPermisosUsuario(permisosDefectoIds);
    };

    // Agrupar permisos por módulo
    const permisosPorModulo = permisos.reduce((acc, permiso) => {
        const modulo = permiso.modulo || 'general';
        if (!acc[modulo]) {
            acc[modulo] = [];
        }
        acc[modulo].push(permiso);
        return acc;
    }, {} as Record<string, Permiso[]>);

    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{ textAlign: 'center', color: '#00ff88' }}>
                    <div>CARGANDO PERMISOS...</div>
                    <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: '#64748b' }}>
                        Usuario: {usuarioNombre} (Rol base: {usuarioRol})
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflow: 'auto'
        }}>
            <div style={{
                background: '#0a0a0a',
                border: '1px solid #00ff88',
                borderRadius: '0.95rem',
                padding: '1.9rem',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '85vh',
                overflow: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.25rem', fontSize: '1.18rem' }}>
                            🔐 PERMISOS DE USUARIO
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            Usuario: <strong style={{ color: '#00ff88' }}>{usuarioNombre}</strong>
                            <span style={{ 
                                marginLeft: '0.5rem', 
                                background: usuarioRol === 'admin' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.23rem',
                                fontSize: '0.7rem'
                            }}>
                                {usuarioRol === 'admin' ? '👑 Rol base: Administrador' : '🛒 Rol base: Vendedor'}
                            </span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleResetToDefault}
                            style={{
                                background: 'rgba(255, 165, 0, 0.1)',
                                border: '1px solid #ffa500',
                                borderRadius: '0.23rem',
                                padding: '0.3rem 0.7rem',
                                color: '#ffa500',
                                cursor: 'pointer',
                                fontSize: '0.7rem'
                            }}
                        >
                            🔄 Restablecer por defecto
                        </button>
                    </div>
                </div>

                <div style={{
                    background: '#1a1a1a',
                    borderRadius: '0.47rem',
                    padding: '0.5rem 1rem',
                    marginBottom: '1.42rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        Permisos seleccionados:
                    </span>
                    <span style={{ color: '#00ff88', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {permisosUsuario.length} / {permisos.length}
                    </span>
                </div>

                {Object.keys(permisosPorModulo).length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                        No hay permisos disponibles en el sistema
                    </p>
                ) : (
                    Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => {
                        const moduloNombre = MODULOS[modulo] || modulo.toUpperCase();
                        const seleccionadosEnModulo = permisosModulo.filter(p => permisosUsuario.includes(p.id)).length;
                        
                        return (
                            <div key={modulo} style={{ marginBottom: '1.42rem' }}>
                                <h4 style={{
                                    color: '#00ff88',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.7rem',
                                    borderBottom: '1px solid #1a1a1a',
                                    paddingBottom: '0.47rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>{moduloNombre}</span>
                                    <span style={{ 
                                        fontSize: '0.65rem', 
                                        color: '#64748b',
                                        background: '#1a1a1a',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '0.23rem'
                                    }}>
                                        {seleccionadosEnModulo}/{permisosModulo.length}
                                    </span>
                                </h4>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {permisosModulo.map(permiso => {
                                        const esPermisoPorDefecto = PERMISOS_POR_DEFECTO[usuarioRol as keyof typeof PERMISOS_POR_DEFECTO]?.includes(permiso.nombre);
                                        
                                        return (
                                            <label
                                                key={permiso.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    padding: '0.4rem',
                                                    background: permisosUsuario.includes(permiso.id) ? 'rgba(0, 255, 136, 0.08)' : 'transparent',
                                                    borderRadius: '0.23rem',
                                                    transition: 'all 0.3s',
                                                    border: permisosUsuario.includes(permiso.id) ? '1px solid rgba(0, 255, 136, 0.2)' : '1px solid transparent'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={permisosUsuario.includes(permiso.id)}
                                                    onChange={() => handleTogglePermiso(permiso.id)}
                                                    style={{
                                                        marginRight: '0.7rem',
                                                        cursor: 'pointer',
                                                        width: '1rem',
                                                        height: '1rem',
                                                        accentColor: '#00ff88'
                                                    }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ 
                                                        color: '#e2e8f0', 
                                                        fontSize: '0.8rem', 
                                                        fontWeight: '500',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        flexWrap: 'wrap'
                                                    }}>
                                                        {permiso.nombre.replace(/_/g, ' ').toUpperCase()}
                                                        {esPermisoPorDefecto && (
                                                            <span style={{
                                                                fontSize: '0.6rem',
                                                                background: 'rgba(0, 255, 136, 0.2)',
                                                                padding: '0.15rem 0.4rem',
                                                                borderRadius: '0.23rem',
                                                                color: '#00ff88'
                                                            }}>
                                                                Por defecto
                                                            </span>
                                                        )}
                                                    </div>
                                                    {permiso.descripcion && (
                                                        <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '0.2rem' }}>
                                                            {permiso.descripcion}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}

                <div style={{ display: 'flex', gap: '0.95rem', marginTop: '1.42rem', paddingTop: '1rem', borderTop: '1px solid #1a1a1a' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            fontSize: '0.8rem',
                            background: saving ? '#1a5a3a' : '#00ff88',
                            color: saving ? '#94a3b8' : '#0a0a0a',
                            border: 'none',
                            borderRadius: '0.47rem',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.3s'
                        }}
                    >
                        {saving ? '💾 GUARDANDO...' : '💾 GUARDAR PERMISOS'}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            fontSize: '0.8rem',
                            background: 'transparent',
                            border: '1px solid #1e293b',
                            borderRadius: '0.47rem',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#ff4444';
                            e.currentTarget.style.color = '#ff4444';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#1e293b';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        ❌ CANCELAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PanelPermisos;