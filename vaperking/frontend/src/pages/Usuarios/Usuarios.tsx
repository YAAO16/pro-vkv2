import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import PanelPermisos from '../PanelPermisos/PanelPermisos';

interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    rol: string;
    sede_id: number | null;
    activo: boolean;
}

interface Sede {
    id: number;
    nombre: string;
}

const Usuarios: React.FC = () => {
    const { isAdmin, tienePermiso, recargarPermisos } = usePermisos();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estado para el modal de usuario
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        nombre_completo: '',
        password: '',
        rol: 'vendedor',
        sede_id: null as number | null
    });

    // Estado para el modal de permisos
    const [showPermisosModal, setShowPermisosModal] = useState(false);
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);

    // Permisos del usuario actual
    const puedeCrear = isAdmin || tienePermiso('usuarios_crear');
    const puedeEditar = isAdmin || tienePermiso('usuarios_editar');
    const puedeEliminar = isAdmin || tienePermiso('usuarios_eliminar');
    const puedeVerPermisos = isAdmin || tienePermiso('usuarios_editar');

    useEffect(() => {
        cargarUsuarios();
        cargarSedes();
    }, []);

    const cargarUsuarios = async () => {
        try {
            const response = await apiClient.get('/usuarios/');
            setUsuarios(response.data);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    // Crear o editar usuario
    const handleSubmit = async () => {
        try {
            if (editingUser) {
                // Editar usuario
                const data: any = {
                    nombre_completo: formData.nombre_completo,
                    rol: formData.rol,
                    sede_id: formData.sede_id
                };
                if (formData.password) {
                    data.password = formData.password;
                }
                await apiClient.put(`/usuarios/${editingUser.id}`, data);
            } else {
                // Crear usuario
                await apiClient.post('/usuarios/', {
                    username: formData.username,
                    nombre_completo: formData.nombre_completo,
                    password: formData.password,
                    rol: formData.rol,
                    sede_id: formData.sede_id
                });
            }
            setShowModal(false);
            setEditingUser(null);
            setFormData({ username: '', nombre_completo: '', password: '', rol: 'vendedor', sede_id: null });
            cargarUsuarios();
        } catch (error: any) {
            console.error('Error guardando usuario:', error);
            alert(error.response?.data?.detail || 'Error al guardar el usuario');
        }
    };

    // Cambiar estado (activo/inactivo)
    const handleToggleStatus = async (usuario: Usuario) => {
        if (!puedeEditar) {
            alert('No tienes permiso para editar usuarios');
            return;
        }
        try {
            await apiClient.put(`/usuarios/${usuario.id}`, { activo: !usuario.activo });
            cargarUsuarios();
        } catch (error) {
            console.error('Error cambiando estado:', error);
            alert('Error al cambiar el estado del usuario');
        }
    };

    // Eliminar usuario (desactivar)
    const handleDelete = async (usuario: Usuario) => {
        if (!puedeEliminar) {
            alert('No tienes permiso para eliminar usuarios');
            return;
        }
        if (window.confirm(`¿Estás seguro de que deseas desactivar al usuario "${usuario.username}"?`)) {
            try {
                await apiClient.delete(`/usuarios/${usuario.id}`);
                cargarUsuarios();
            } catch (error) {
                console.error('Error eliminando usuario:', error);
                alert('Error al eliminar el usuario');
            }
        }
    };

    // Abrir modal para editar
    const openEditModal = (usuario: Usuario) => {
        setEditingUser(usuario);
        setFormData({
            username: usuario.username,
            nombre_completo: usuario.nombre_completo,
            password: '',
            rol: usuario.rol,
            sede_id: usuario.sede_id
        });
        setShowModal(true);
    };

    // Abrir modal para crear
    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ username: '', nombre_completo: '', password: '', rol: 'vendedor', sede_id: null });
        setShowModal(true);
    };

    if (loading) {
        return <div style={{ color: '#00ff88', textAlign: 'center', padding: '2rem' }}>CARGANDO USUARIOS...</div>;
    }

    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#00ff88' }}>👥 GESTIÓN DE USUARIOS</h3>
                {puedeCrear && (
                    <button
                        onClick={openCreateModal}
                        style={{
                            background: '#00ff88',
                            color: '#0a0a0a',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.47rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                        }}
                    >
                        + NUEVO USUARIO
                    </button>
                )}
            </div>

            <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>ID</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Usuario</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Nombre</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Rol</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Sede</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Estado</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Acciones</th>
                            {puedeVerPermisos && (
                                <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Permisos</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map((u) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{u.id}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{u.username}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{u.nombre_completo}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    <span style={{
                                        background: u.rol === 'admin' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(100, 100, 100, 0.15)',
                                        padding: '0.19rem 0.47rem',
                                        borderRadius: '0.23rem',
                                        color: u.rol === 'admin' ? '#00ff88' : '#94a3b8',
                                        fontSize: '0.7rem'
                                    }}>
                                        {u.rol}
                                    </span>
                                </td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>
                                    {sedes.find(s => s.id === u.sede_id)?.nombre || 'Todas'}
                                </td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    {puedeEditar ? (
                                        <button
                                            onClick={() => handleToggleStatus(u)}
                                            style={{
                                                background: u.activo ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                                                border: 'none',
                                                borderRadius: '0.23rem',
                                                padding: '0.23rem 0.47rem',
                                                cursor: 'pointer',
                                                color: u.activo ? '#00ff88' : '#ff4444',
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            {u.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </button>
                                    ) : (
                                        <span style={{ color: u.activo ? '#00ff88' : '#ff4444', fontSize: '0.7rem' }}>
                                            {u.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    {puedeEditar && (
                                        <button
                                            onClick={() => openEditModal(u)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '0.3rem' }}
                                            title="Editar usuario"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    {puedeEliminar && (
                                        <button
                                            onClick={() => handleDelete(u)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ff4444' }}
                                            title="Eliminar usuario"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </td>
                                {puedeVerPermisos && (
                                    <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedUsuario(u);
                                                setShowPermisosModal(true);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                            title="Configurar permisos"
                                        >
                                            🔐
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Usuario (Crear/Editar) */}
            {showModal && (
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
                    <div style={{
                        background: '#0a0a0a',
                        border: '1px solid #00ff88',
                        borderRadius: '0.95rem',
                        padding: '1.9rem',
                        width: '90%',
                        maxWidth: '427px'
                    }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.95rem', fontSize: '1.18rem' }}>
                            {editingUser ? '✏️ EDITAR USUARIO' : '➕ NUEVO USUARIO'}
                        </h3>

                        {!editingUser && (
                            <div style={{ marginBottom: '0.95rem' }}>
                                <label className="input-label" style={{ fontSize: '0.57rem', color: '#64748b' }}>USUARIO</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="input-field"
                                    style={{ padding: '0.47rem', fontSize: '0.8rem', width: '100%', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.47rem', color: '#e2e8f0' }}
                                    required
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem', color: '#64748b' }}>NOMBRE COMPLETO</label>
                            <input
                                type="text"
                                value={formData.nombre_completo}
                                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem', width: '100%', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.47rem', color: '#e2e8f0' }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem', color: '#64748b' }}>CONTRASEÑA</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem', width: '100%', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.47rem', color: '#e2e8f0' }}
                                required={!editingUser}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem', color: '#64748b' }}>ROL</label>
                            <select
                                value={formData.rol}
                                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem', width: '100%', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.47rem', color: '#e2e8f0' }}
                            >
                                <option value="vendedor">Vendedor</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem', color: '#64748b' }}>SEDE</label>
                            <select
                                value={formData.sede_id || ''}
                                onChange={(e) => setFormData({ ...formData, sede_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem', width: '100%', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.47rem', color: '#e2e8f0' }}
                            >
                                <option value="">Todas las sedes</option>
                                {sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button
                                onClick={handleSubmit}
                                className="btn-login"
                                style={{ flex: 1, padding: '0.47rem', fontSize: '0.76rem', background: '#00ff88', color: '#0a0a0a', border: 'none', borderRadius: '0.47rem', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {editingUser ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingUser(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.47rem',
                                    background: 'transparent',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.76rem'
                                }}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Permisos */}
            {showPermisosModal && selectedUsuario && (
                <PanelPermisos
                    usuarioId={selectedUsuario.id}
                    usuarioNombre={selectedUsuario.nombre_completo}
                    usuarioRol={selectedUsuario.rol}
                    onClose={() => {
                        setShowPermisosModal(false);
                        setSelectedUsuario(null);
                    }}
                    onSave={async () => {
                        await cargarUsuarios();
                        await recargarPermisos();
                        setShowPermisosModal(false);
                        setSelectedUsuario(null);
                    }}
                />
            )}
        </div>
    );
};

export default Usuarios;