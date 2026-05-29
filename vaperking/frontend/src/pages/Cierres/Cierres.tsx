import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';

interface Cierre {
    id: number;
    sede_id: number;
    fecha: string;
    balance_sistema: number;
    efectivo_reportado: number;
    transferencia_reportada: number;
    diferencia: number;
    observaciones: string;
    sede_nombre?: string;
    cerrado_por?: number;
    nombre_usuario?: string;
}

const Cierres: React.FC<{ isAdmin: boolean; sedeId: number | null; sedeNombre: string }> = ({ isAdmin, sedeId, sedeNombre }) => {
    const [cierres, setCierres] = useState<Cierre[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSede, setSelectedSede] = useState<number | null>(sedeId);
    const [sedes, setSedes] = useState<any[]>([]);
    const [preview, setPreview] = useState<any>(null);
    const [editingCierre, setEditingCierre] = useState<Cierre | null>(null);
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        efectivo_reportado: 0,
        transferencia_reportada: 0,
        observaciones: ''
    });

    useEffect(() => {
        cargarCierres();
        if (isAdmin) {
            cargarSedes();
        }
        cargarPreview();
    }, [selectedSede]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarCierres = async () => {
        try {
            const sede = selectedSede || sedeId;
            const params = sede ? `?sede_id=${sede}` : '';
            const response = await apiClient.get(`/cierres/${params}`);
            setCierres(response.data);
        } catch (error) {
            console.error('Error cargando cierres:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarPreview = async () => {
        try {
            const sede = selectedSede || sedeId;
            if (sede) {
                const response = await apiClient.get(`/cierres/preview?sede_id=${sede}&fecha=${new Date().toISOString().split('T')[0]}`);
                setPreview(response.data);
            }
        } catch (error) {
            console.error('Error cargando preview:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            const sede = selectedSede || sedeId;
            await apiClient.post('/cierres/', {
                sede_id: sede,
                ...formData
            });
            setShowModal(false);
            setFormData({ fecha: new Date().toISOString().split('T')[0], efectivo_reportado: 0, transferencia_reportada: 0, observaciones: '' });
            cargarCierres();
            cargarPreview();
        } catch (error) {
            console.error('Error guardando cierre:', error);
            alert('Error al guardar el cierre');
        }
    };

    const handleUpdate = async () => {
        if (!editingCierre) return;
        
        try {
            await apiClient.put(`/cierres/${editingCierre.id}`, {
                efectivo_reportado: formData.efectivo_reportado,
                transferencia_reportada: formData.transferencia_reportada,
                observaciones: formData.observaciones
            });
            setShowEditModal(false);
            setEditingCierre(null);
            setFormData({ fecha: new Date().toISOString().split('T')[0], efectivo_reportado: 0, transferencia_reportada: 0, observaciones: '' });
            cargarCierres();
            cargarPreview();
        } catch (error) {
            console.error('Error actualizando cierre:', error);
            alert('Error al actualizar el cierre');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Eliminar este cierre? Esta acción no se puede deshacer.')) {
            try {
                await apiClient.delete(`/cierres/${id}`);
                cargarCierres();
                cargarPreview();
            } catch (error) {
                console.error('Error eliminando cierre:', error);
                alert('Error al eliminar el cierre');
            }
        }
    };

    const openEditModal = (cierre: Cierre) => {
        setEditingCierre(cierre);
        setFormData({
            fecha: cierre.fecha,
            efectivo_reportado: cierre.efectivo_reportado || 0,
            transferencia_reportada: cierre.transferencia_reportada || 0,
            observaciones: cierre.observaciones || ''
        });
        setShowEditModal(true);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.9rem', color: '#00ff88', fontSize: '0.9rem' }}>CARGANDO CIERRES...</div>;

    return (
        <div style={{ padding: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.42rem', flexWrap: 'wrap', gap: '0.95rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.18rem' }}>📅 CIERRES DIARIOS</h3>
                <div style={{ display: 'flex', gap: '0.95rem' }}>
                    {isAdmin && (
                        <select
                            value={selectedSede || ''}
                            onChange={(e) => setSelectedSede(parseInt(e.target.value) || null)}
                            style={{
                                padding: '0.47rem',
                                background: '#0a0a0a',
                                border: '1px solid #1e293b',
                                borderRadius: '0.47rem',
                                color: 'white',
                                fontSize: '0.8rem'
                            }}
                        >
                            <option value="">Todas las sedes</option>
                            {sedes.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={() => setShowModal(true)} className="btn-login" style={{ width: 'auto', padding: '0.47rem 0.95rem', fontSize: '0.8rem' }}>
                        + NUEVO CIERRE
                    </button>
                </div>
            </div>

            {!isAdmin && sedeNombre && (
                <div style={{ marginBottom: '0.95rem', padding: '0.47rem', background: 'rgba(0,255,136,0.1)', borderRadius: '0.47rem', fontSize: '0.7rem', color: '#00ff88' }}>
                    📍 Sede: {sedeNombre}
                </div>
            )}

            {preview && (
                <div style={{
                    background: 'rgba(0, 255, 136, 0.05)',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    borderRadius: '0.7rem',
                    padding: '0.95rem',
                    marginBottom: '1.42rem'
                }}>
                    <h4 style={{ color: '#00ff88', marginBottom: '0.47rem', fontSize: '1rem' }}>📊 RESUMEN DEL DÍA</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(142px, 1fr))', gap: '0.95rem' }}>
                        <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Balance Sistema</div>
                            <div style={{ fontSize: '1.14rem', fontWeight: 'bold', color: '#00ff88' }}>${preview.balance_sistema?.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Ventas Efectivo</div>
                            <div style={{ fontSize: '1.14rem', fontWeight: 'bold' }}>${preview.ventas_efectivo?.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Ventas Transferencia</div>
                            <div style={{ fontSize: '1.14rem', fontWeight: 'bold' }}>${preview.ventas_transferencia?.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Total Ventas</div>
                            <div style={{ fontSize: '1.14rem', fontWeight: 'bold' }}>{preview.total_ventas || 0}</div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Fecha</th>
                            {isAdmin && <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Sede</th>}
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Balance</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Efectivo</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Transferencia</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Diferencia</th>
                            {isAdmin && <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {cierres.map((c) => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{c.fecha}</td>
                                {isAdmin && <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{c.sede_nombre || `Sede ${c.sede_id}`}</td>}
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem' }}>${c.balance_sistema?.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem' }}>${c.efectivo_reportado?.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem' }}>${c.transferencia_reportada?.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', color: c.diferencia === 0 ? '#00ff88' : '#ff4444' }}>
                                    ${c.diferencia?.toLocaleString()}
                                </td>
                                {isAdmin && (
                                    <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                        <button
                                            onClick={() => openEditModal(c)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem', color: '#00ff88' }}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ff4444' }}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {cierres.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    No hay cierres registrados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Nuevo Cierre */}
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
                        <h3 style={{ color: '#00ff88', marginBottom: '0.95rem', fontSize: '1.18rem' }}>📅 NUEVO CIERRE</h3>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>FECHA</label>
                            <input
                                type="date"
                                value={formData.fecha}
                                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>EFECTIVO REPORTADO</label>
                            <input
                                type="number"
                                value={formData.efectivo_reportado}
                                onChange={(e) => setFormData({ ...formData, efectivo_reportado: parseFloat(e.target.value) || 0})}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>TRANSFERENCIA REPORTADA</label>
                            <input
                                type="number"
                                value={formData.transferencia_reportada}
                                onChange={(e) => setFormData({ ...formData, transferencia_reportada: parseFloat(e.target.value) || 0})}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>OBSERVACIONES</label>
                            <textarea
                                value={formData.observaciones}
                                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                className="input-field"
                                rows={2}
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.47rem', fontSize: '0.76rem' }}>
                                REGISTRAR
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
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

            {/* Modal de Editar Cierre */}
            {showEditModal && editingCierre && isAdmin && (
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
                        <h3 style={{ color: '#00ff88', marginBottom: '0.95rem', fontSize: '1.18rem' }}>✏️ EDITAR CIERRE</h3>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>FECHA</label>
                            <input
                                type="date"
                                value={formData.fecha}
                                disabled
                                style={{
                                    padding: '0.47rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#64748b',
                                    fontSize: '0.8rem',
                                    width: '100%'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>EFECTIVO REPORTADO</label>
                            <input
                                type="number"
                                value={formData.efectivo_reportado}
                                onChange={(e) => setFormData({ ...formData, efectivo_reportado: parseFloat(e.target.value) || 0})}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>TRANSFERENCIA REPORTADA</label>
                            <input
                                type="number"
                                value={formData.transferencia_reportada}
                                onChange={(e) => setFormData({ ...formData, transferencia_reportada: parseFloat(e.target.value) || 0})}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>OBSERVACIONES</label>
                            <textarea
                                value={formData.observaciones}
                                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                className="input-field"
                                rows={2}
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>BALANCE SISTEMA</label>
                            <input
                                type="text"
                                value={`$${(editingCierre.balance_sistema || 0).toLocaleString()}`}
                                disabled
                                style={{
                                    padding: '0.47rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#00ff88',
                                    fontSize: '0.8rem',
                                    width: '100%',
                                    fontWeight: 'bold'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button onClick={handleUpdate} className="btn-login" style={{ flex: 1, padding: '0.47rem', fontSize: '0.76rem' }}>
                                ACTUALIZAR
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingCierre(null);
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

export default Cierres;