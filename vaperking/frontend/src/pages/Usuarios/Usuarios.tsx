import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';

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
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        nombre_completo: '',
        password: '',
        rol: 'vendedor',
        sede_id: null as number | null
    });

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

    const handleSubmit = async () => {
        try {
            if (editingUser) {
                await apiClient.put(`/usuarios/${editingUser.id}`, formData);
            } else {
                await apiClient.post('/usuarios/', formData);
            }
            setShowModal(false);
            setEditingUser(null);
            setFormData({ username: '', nombre_completo: '', password: '', rol: 'vendedor', sede_id: null });
            cargarUsuarios();
        } catch (error) {
            console.error('Error guardando usuario:', error);
            alert('Error al guardar el usuario');
        }
    };

    const handleToggleStatus = async (usuario: Usuario) => {
        try {
            await apiClient.put(`/usuarios/${usuario.id}`, { ...usuario, activo: !usuario.activo });
            cargarUsuarios();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    const handleDelete = async (usuario: Usuario) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${usuario.username}"? Esta acción lo desactivará permanentemente.`)) {
            try {
                await apiClient.delete(`/usuarios/${usuario.id}`);
                cargarUsuarios();
            } catch (error) {
                console.error('Error eliminando usuario:', error);
                alert('Error al eliminar el usuario');
            }
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.9rem', color: '#00ff88' }}>CARGANDO USUARIOS...</div>;

    return (
        <div style={{ padding: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.42rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.18rem' }}>👥 GESTIÓN DE USUARIOS</h3>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({ username: '', nombre_completo: '', password: '', rol: 'vendedor', sede_id: null });
                        setShowModal(true);
                    }}
                    className="btn-login"
                    style={{ width: 'auto', padding: '0.47rem 0.95rem', fontSize: '0.8rem' }}
                >
                    + NUEVO USUARIO
                </button>
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
                                </td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => {
                                            setEditingUser(u);
                                            setFormData({
                                                username: u.username,
                                                nombre_completo: u.nombre_completo,
                                                password: '',
                                                rol: u.rol,
                                                sede_id: u.sede_id
                                            });
                                            setShowModal(true);
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem' }}
                                        title="Editar usuario"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(u)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ff4444' }}
                                        title="Eliminar usuario"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Usuario - tamaños reducidos */}
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

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>USUARIO</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>NOMBRE COMPLETO</label>
                            <input
                                type="text"
                                value={formData.nombre_completo}
                                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>CONTRASEÑA</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={editingUser ? 'Dejar en blanco para no cambiar' : ''}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>ROL</label>
                            <select
                                value={formData.rol}
                                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            >
                                <option value="admin">Administrador</option>
                                <option value="vendedor">Vendedor</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>SEDE</label>
                            <select
                                value={formData.sede_id || ''}
                                onChange={(e) => setFormData({ ...formData, sede_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            >
                                <option value="">Todas las sedes (solo admin)</option>
                                {sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.47rem', fontSize: '0.76rem' }}>
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
        </div>
    );
};

export default Usuarios;