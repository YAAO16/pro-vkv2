import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/axiosClient';
import '../../App.css';

interface Observacion {
    id: number;
    sede_id: number;
    sede_nombre: string;
    usuario_id: number;
    nombre_usuario: string;
    observacion: string;
    created_at: string;
    updated_at: string;
}

interface Sede {
    id: number;
    nombre: string;
}

const Observaciones: React.FC = () => {
    const { isAdmin } = useAuth();
    const [observaciones, setObservaciones] = useState<Observacion[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingObs, setEditingObs] = useState<Observacion | null>(null);
    const [filtroSede, setFiltroSede] = useState<string>('');
    const [formData, setFormData] = useState({ observacion: '' });

    useEffect(() => {
        cargarObservaciones();
        if (isAdmin) {
            cargarSedes();
        }
    }, [filtroSede]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarObservaciones = async () => {
        try {
            const params: any = {};
            if (filtroSede) params.sede_id = filtroSede;
            const response = await apiClient.get('/observaciones/', { params });
            setObservaciones(response.data);
        } catch (error) {
            console.error('Error cargando observaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingObs) {
                await apiClient.put(`/observaciones/${editingObs.id}`, formData);
            } else {
                await apiClient.post('/observaciones/', formData);
            }
            setShowModal(false);
            setEditingObs(null);
            setFormData({ observacion: '' });
            cargarObservaciones();
        } catch (error) {
            console.error('Error guardando observación:', error);
            alert('Error al guardar la observación');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Eliminar esta observación?')) {
            try {
                await apiClient.delete(`/observaciones/${id}`);
                cargarObservaciones();
            } catch (error) {
                console.error('Error eliminando observación:', error);
                alert('Error al eliminar la observación');
            }
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.6rem', color: '#00ff88', fontSize: '0.8rem' }}>CARGANDO OBSERVACIONES...</div>;

    return (
        <div style={{ padding: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <h2 className="section-title" style={{ fontSize: '1.15rem', marginBottom: '0' }}>📝 OBSERVACIONES DE CAJA</h2>
                <button onClick={() => { setEditingObs(null); setFormData({ observacion: '' }); setShowModal(true); }} 
                    className="btn-login" style={{ width: 'auto', padding: '0.4rem 1.2rem', fontSize: '0.68rem' }}>
                    + NUEVA OBSERVACIÓN
                </button>
            </div>

            {isAdmin && (
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.6rem', padding: '0.8rem', marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '135px' }}>
                            <label className="input-label" style={{ fontSize: '0.5rem' }}>FILTRAR POR SEDE</label>
                            <select value={filtroSede} onChange={(e) => setFiltroSede(e.target.value)} 
                                style={{ width: '100%', padding: '0.4rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.4rem', color: 'white', fontSize: '0.68rem' }}>
                                <option value="">Todas las sedes</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setFiltroSede('')} 
                            style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.4rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem', height: '34px' }}>
                            LIMPIAR
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {observaciones.map((obs) => (
                    <div key={obs.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.6rem', padding: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.9rem' }}>📌</span>
                                    <strong style={{ color: '#00ff88', fontSize: '0.85rem' }}>{obs.nombre_usuario}</strong>
                                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{obs.sede_nombre}</span>
                                    <span style={{ fontSize: '0.55rem', color: '#64748b' }}>{new Date(obs.created_at).toLocaleString()}</span>
                                </div>
                                <div style={{ marginTop: '0.45rem', color: '#cbd5e1', fontSize: '0.72rem', lineHeight: '1.3' }}>
                                    {obs.observacion}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {isAdmin && (
                                    <button onClick={() => { setEditingObs(obs); setFormData({ observacion: obs.observacion }); setShowModal(true); }} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }} title="Editar">
                                        ✏️
                                    </button>
                                )}
                                {isAdmin && (
                                    <button onClick={() => handleDelete(obs.id)} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ff4444' }} title="Eliminar">
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {observaciones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.8rem', color: '#64748b', fontSize: '0.8rem' }}>No hay observaciones registradas</div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #00ff88', borderRadius: '0.8rem', padding: '1.6rem', width: '90%', maxWidth: '450px' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.8rem', fontSize: '1.05rem' }}>{editingObs ? '✏️ EDITAR OBSERVACIÓN' : '➕ NUEVA OBSERVACIÓN'}</h3>
                        
                        <div style={{ marginBottom: '0.8rem' }}>
                            <label className="input-label" style={{ fontSize: '0.5rem' }}>DESCRIPCIÓN</label>
                            <textarea value={formData.observacion} onChange={(e) => setFormData({ observacion: e.target.value })} 
                                className="input-field" rows={4} placeholder="Ej: Juanito sacó 8.000 de caja para comprar café..."
                                style={{ padding: '0.4rem', fontSize: '0.72rem' }} />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.4rem', fontSize: '0.68rem' }}>
                                {editingObs ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                            <button onClick={() => { setShowModal(false); setEditingObs(null); }} 
                                style={{ flex: 1, padding: '0.4rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.4rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem' }}>
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Observaciones;