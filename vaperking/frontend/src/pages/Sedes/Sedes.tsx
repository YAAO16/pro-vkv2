import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';

interface Sede {
    id: number;
    nombre: string;
    ciudad: string;
    direccion: string;
    telefono: string;
    activo: boolean;
}

const Sedes: React.FC = () => {
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSede, setEditingSede] = useState<Sede | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        ciudad: '',
        direccion: '',
        telefono: ''
    });

    useEffect(() => {
        cargarSedes();
    }, []);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingSede) {
                await apiClient.put(`/sedes/${editingSede.id}`, formData);
            } else {
                await apiClient.post('/sedes/', formData);
            }
            setShowModal(false);
            setEditingSede(null);
            setFormData({ nombre: '', ciudad: '', direccion: '', telefono: '' });
            cargarSedes();
        } catch (error) {
            console.error('Error guardando sede:', error);
            alert('Error al guardar la sede');
        }
    };

    const handleToggleStatus = async (sede: Sede) => {
        try {
            await apiClient.put(`/sedes/${sede.id}`, { ...sede, activo: !sede.activo });
            cargarSedes();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    const handleDelete = async (sede: Sede) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar la sede "${sede.nombre}"? Esta acción la desactivará permanentemente.`)) {
            try {
                await apiClient.delete(`/sedes/${sede.id}`);
                cargarSedes();
            } catch (error) {
                console.error('Error eliminando sede:', error);
                alert('Error al eliminar la sede');
            }
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.9rem', color: '#00ff88' }}>CARGANDO SEDES...</div>;

    return (
        <div style={{ padding: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.42rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.18rem' }}>🏢 GESTIÓN DE SEDES</h3>
                <button
                    onClick={() => {
                        setEditingSede(null);
                        setFormData({ nombre: '', ciudad: '', direccion: '', telefono: '' });
                        setShowModal(true);
                    }}
                    className="btn-login"
                    style={{ width: 'auto', padding: '0.47rem 0.95rem', fontSize: '0.8rem' }}
                >
                    + NUEVA SEDE
                </button>
            </div>

            <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>ID</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Nombre</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Ciudad</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Teléfono</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Estado</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sedes.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{s.id}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{s.nombre}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{s.ciudad}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{s.telefono}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleToggleStatus(s)}
                                        style={{
                                            background: s.activo ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                                            border: 'none',
                                            borderRadius: '0.23rem',
                                            padding: '0.23rem 0.47rem',
                                            cursor: 'pointer',
                                            color: s.activo ? '#00ff88' : '#ff4444',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        {s.activo ? '✓ Activa' : '✗ Inactiva'}
                                    </button>
                                </td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => {
                                            setEditingSede(s);
                                            setFormData({
                                                nombre: s.nombre,
                                                ciudad: s.ciudad,
                                                direccion: s.direccion || '',
                                                telefono: s.telefono || ''
                                            });
                                            setShowModal(true);
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem' }}
                                        title="Editar sede"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ff4444' }}
                                        title="Eliminar sede"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Sede - tamaños reducidos */}
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
                            {editingSede ? '✏️ EDITAR SEDE' : '➕ NUEVA SEDE'}
                        </h3>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>NOMBRE</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>CIUDAD</label>
                            <input
                                type="text"
                                value={formData.ciudad}
                                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>DIRECCIÓN</label>
                            <input
                                type="text"
                                value={formData.direccion}
                                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>TELÉFONO</label>
                            <input
                                type="text"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.47rem', fontSize: '0.76rem' }}>
                                {editingSede ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingSede(null);
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

export default Sedes;