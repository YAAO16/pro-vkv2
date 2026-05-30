import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';

interface Gasto {
    id: number;
    fecha: string;
    motivo: string;
    valor: number;
    descripcion: string | null;
    sede_id: number;
    nombre_sede: string;
    usuario_id: number;
    nombre_usuario: string;
    created_at: string;
}

interface GastoResumen {
    total_gastos_hoy: number;
    total_gastos_semana: number;
    total_gastos_mes: number;
    ultimos_gastos: Gasto[];
}

const Gastos: React.FC = () => {
    const { usuario } = useAuthStore();
    const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'ADMIN';
    const isVendedor = usuario?.rol === 'vendedor' || usuario?.rol === 'VENDEDOR';
    const sedeId = usuario?.sede_id;

    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [resumen, setResumen] = useState<GastoResumen | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
    
    // Formulario
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        motivo: '',
        valor: 0,
        descripcion: '',
        sede_id: isVendedor ? sedeId || 1 : 1
    });
    
    const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
    const [filtroFechaFin, setFiltroFechaFin] = useState('');
    const [filtroSedeId, setFiltroSedeId] = useState<number | null>(null);
    const [sedes, setSedes] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        cargarGastos();
        cargarResumen();
        if (isAdmin) {
            cargarSedes();
        }
    }, [filtroFechaInicio, filtroFechaFin, filtroSedeId]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes || response.data);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarGastos = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (filtroFechaInicio) params.fecha_inicio = filtroFechaInicio;
            if (filtroFechaFin) params.fecha_fin = filtroFechaFin;
            if (filtroSedeId) params.sede_id = filtroSedeId;
            
            const response = await apiClient.get('/gastos/', { params });
            setGastos(response.data);
        } catch (error) {
            console.error('Error cargando gastos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarResumen = async () => {
        try {
            const params: any = {};
            if (filtroSedeId) params.sede_id = filtroSedeId;
            const response = await apiClient.get('/gastos/resumen', { params });
            setResumen(response.data);
        } catch (error) {
            console.error('Error cargando resumen:', error);
        }
    };

    const handleSubmit = async () => {
        if (!formData.motivo || formData.valor <= 0) {
            setError('Complete todos los campos requeridos');
            return;
        }

        try {
            if (editingGasto) {
                await apiClient.put(`/gastos/${editingGasto.id}`, formData);
                setSuccess('Gasto actualizado exitosamente');
            } else {
                await apiClient.post('/gastos/', formData);
                setSuccess('Gasto registrado exitosamente');
            }
            
            setShowModal(false);
            setEditingGasto(null);
            resetForm();
            cargarGastos();
            cargarResumen();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Error al guardar el gasto');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleDelete = async (gasto: Gasto) => {
        if (!isAdmin) {
            setError('No tiene permisos para eliminar gastos');
            return;
        }
        
        if (!confirm(`¿Eliminar gasto "${gasto.motivo}" por $${gasto.valor.toLocaleString()}?`)) return;
        
        try {
            await apiClient.delete(`/gastos/${gasto.id}`);
            setSuccess('Gasto eliminado exitosamente');
            cargarGastos();
            cargarResumen();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Error al eliminar el gasto');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleEdit = (gasto: Gasto) => {
        if (!isAdmin) {
            setError('No tiene permisos para editar gastos');
            return;
        }
        setEditingGasto(gasto);
        setFormData({
            fecha: gasto.fecha,
            motivo: gasto.motivo,
            valor: gasto.valor,
            descripcion: gasto.descripcion || '',
            sede_id: gasto.sede_id
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            fecha: new Date().toISOString().split('T')[0],
            motivo: '',
            valor: 0,
            descripcion: '',
            sede_id: isVendedor ? sedeId || 1 : 1
        });
    };

    const limpiarFiltros = () => {
        setFiltroFechaInicio('');
        setFiltroFechaFin('');
        setFiltroSedeId(null);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff88' }}>CARGANDO GASTOS...</div>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.2rem' }}>💰 GASTOS</h3>
                <button 
                    onClick={() => { resetForm(); setEditingGasto(null); setShowModal(true); }} 
                    className="btn-login" 
                    style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
                >
                    + NUEVO GASTO
                </button>
            </div>

            {/* Mensajes */}
            {error && <div style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>❌ {error}</div>}
            {success && <div style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid #00ff88', color: '#00ff88', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>✅ {success}</div>}

            {/* Tarjetas de resumen */}
            {resumen && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>GASTOS HOY</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff4444' }}>{formatCurrency(resumen.total_gastos_hoy)}</div>
                    </div>
                    <div style={{ background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>GASTOS SEMANA</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ffaa00' }}>{formatCurrency(resumen.total_gastos_semana)}</div>
                    </div>
                    <div style={{ background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>GASTOS MES</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff4444' }}>{formatCurrency(resumen.total_gastos_mes)}</div>
                    </div>
                </div>
            )}

            {/* Filtros para Admin */}
            {isAdmin && (
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem', padding: '0.9rem', marginBottom: '1.35rem' }}>
                    <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b' }}>FECHA INICIO</label>
                            <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b' }}>FECHA FIN</label>
                            <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b' }}>SEDE</label>
                            <select 
                                value={filtroSedeId === null ? '' : filtroSedeId} 
                                onChange={(e) => setFiltroSedeId(e.target.value ? parseInt(e.target.value) : null)} 
                                style={{ width: '100%', padding: '0.45rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white' }}
                            >
                                <option value="">Todas las sedes</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <button onClick={cargarGastos} style={{ padding: '0.45rem 1rem', background: '#00ff88', border: 'none', borderRadius: '0.45rem', cursor: 'pointer', fontWeight: 'bold' }}>FILTRAR</button>
                        <button onClick={limpiarFiltros} style={{ padding: '0.45rem 1rem', background: '#1e293b', border: 'none', borderRadius: '0.45rem', cursor: 'pointer', color: '#94a3b8' }}>LIMPIAR</button>
                    </div>
                </div>
            )}

            {/* Tabla de gastos */}
            <div style={{ overflow: 'auto', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>FECHA</th>
                            {isAdmin && <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>SEDE</th>}
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>MOTIVO</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>VALOR</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gastos.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    No hay gastos registrados
                                </td>
                            </tr>
                        ) : (
                            gastos.map((gasto) => (
                                <tr key={gasto.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                    <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>{new Date(gasto.fecha).toLocaleDateString()}</td>
                                    {isAdmin && <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#00ff88' }}>{gasto.nombre_sede}</td>}
                                    <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>{gasto.motivo}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', color: '#ff4444', fontWeight: 'bold' }}>{formatCurrency(gasto.valor)}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            {isAdmin && (
                                                <>
                                                    <button onClick={() => handleEdit(gasto)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Editar">✏️</button>
                                                    <button onClick={() => handleDelete(gasto)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Eliminar">🗑️</button>
                                                </>
                                            )}
                                            {!isAdmin && (
                                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Solo lectura</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Nuevo/Editar Gasto */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #00ff88', borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '1rem' }}>{editingGasto ? '✏️ EDITAR GASTO' : '💰 NUEVO GASTO'}</h3>
                        
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>FECHA *</label>
                            <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} style={{ width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: 'white' }} required />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>MOTIVO *</label>
                            <input type="text" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} placeholder="Ej: Compra de mercancía, reparación, etc." style={{ width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: 'white' }} required />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>VALOR *</label>
                            <input type="number" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })} placeholder="0" min="0" step="100" style={{ width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: 'white' }} required />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>DESCRIPCIÓN (opcional)</label>
                            <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={3} placeholder="Detalles adicionales del gasto..." style={{ width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: 'white' }} />
                        </div>

                        {isAdmin && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>SEDE</label>
                                <select value={formData.sede_id} onChange={(e) => setFormData({ ...formData, sede_id: parseInt(e.target.value) })} style={{ width: '100%', padding: '0.5rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: 'white' }}>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.5rem' }}>GUARDAR</button>
                            <button onClick={() => { setShowModal(false); setEditingGasto(null); resetForm(); }} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer' }}>CANCELAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gastos;