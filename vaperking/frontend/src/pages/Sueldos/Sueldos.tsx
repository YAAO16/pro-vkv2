import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/axiosClient';
import '../../App.css';

interface Sueldo {
    id: number;
    usuario_id: number;
    nombre_usuario: string;
    sede_id: number;
    sede_nombre: string;
    mes: number;
    ano: number;
    sueldo_base: number;
    comisiones: number;
    bonificaciones: number;
    deducciones: number;
    total: number;
    estado: string;
    fecha_pago: string | null;
    observaciones: string | null;
    created_at: string;
    updated_at: string;
}

interface Vendedor {
    id: number;
    nombre: string;
    sede_id: number;
}

interface Sede {
    id: number;
    nombre: string;
}

const Sueldos: React.FC = () => {
    const { isAdmin } = useAuth();
    const [sueldos, setSueldos] = useState<Sueldo[]>([]);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSueldo, setEditingSueldo] = useState<Sueldo | null>(null);
    const [filtros, setFiltros] = useState({
        sede_id: '',
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        estado: ''
    });
    const [formData, setFormData] = useState({
        usuario_id: 0,
        sede_id: 0,
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        sueldo_base: 1300000,
        comisiones: 0,
        bonificaciones: 0,
        deducciones: 0,
        total: 0,
        fecha_pago: '',
        observaciones: '',
        estado: 'PENDIENTE'
    });

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const estados = ['PENDIENTE', 'PAGADO', 'ANULADO'];

    useEffect(() => {
        if (!isAdmin) return;
        cargarSueldos();
        cargarVendedores();
        cargarSedes();
    }, [filtros]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarVendedores = async () => {
        try {
            const params: any = {};
            if (filtros.sede_id) params.sede_id = filtros.sede_id;
            const response = await apiClient.get('/sueldos/vendedores', { params });
            setVendedores(response.data);
        } catch (error) {
            console.error('Error cargando vendedores:', error);
        }
    };

    const cargarSueldos = async () => {
        try {
            const params: any = {};
            if (filtros.sede_id) params.sede_id = filtros.sede_id;
            if (filtros.mes) params.mes = filtros.mes;
            if (filtros.ano) params.ano = filtros.ano;
            if (filtros.estado) params.estado = filtros.estado;
            
            console.log('Parámetros de filtro:', params);
            
            const response = await apiClient.get('/sueldos/', { params });
            console.log('Respuesta del servidor:', response.data);
            
            setSueldos(response.data);
        } catch (error) {
            console.error('Error cargando sueldos:', error);
        } finally {
            setLoading(false);
        }
    };

    const calcularTotal = () => {
        const total = formData.sueldo_base + formData.comisiones + formData.bonificaciones - formData.deducciones;
        setFormData({ ...formData, total: Math.round(total) });
    };

    useEffect(() => {
        calcularTotal();
    }, [formData.sueldo_base, formData.comisiones, formData.bonificaciones, formData.deducciones]);

    const handleSubmit = async () => {
        if (formData.usuario_id === 0) {
            alert('Selecciona un vendedor');
            return;
        }

        if (formData.sede_id === 0) {
            alert('No se pudo determinar la sede del vendedor');
            return;
        }

        const dataToSend = {
            usuario_id: formData.usuario_id,
            sede_id: formData.sede_id,
            mes: formData.mes,
            ano: formData.ano,
            sueldo_base: formData.sueldo_base,
            comisiones: formData.comisiones,
            bonificaciones: formData.bonificaciones,
            deducciones: formData.deducciones,
            total: formData.total,
            fecha_pago: formData.fecha_pago || null,
            observaciones: formData.observaciones || null,
            estado: formData.estado
        };

        try {
            if (editingSueldo) {
                await apiClient.put(`/sueldos/${editingSueldo.id}`, dataToSend);
            } else {
                await apiClient.post('/sueldos/', dataToSend);
            }
            setShowModal(false);
            setEditingSueldo(null);
            setFormData({
                usuario_id: 0,
                sede_id: 0,
                mes: new Date().getMonth() + 1,
                ano: new Date().getFullYear(),
                sueldo_base: 1300000,
                comisiones: 0,
                bonificaciones: 0,
                deducciones: 0,
                total: 0,
                fecha_pago: '',
                observaciones: '',
                estado: 'PENDIENTE'
            });
            cargarSueldos();
        } catch (error: any) {
            console.error('Error guardando sueldo:', error);
            alert(error.response?.data?.detail || 'Error al guardar el registro');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Eliminar este registro de sueldo? Esta acción no se puede deshacer.')) {
            try {
                await apiClient.delete(`/sueldos/${id}`);
                cargarSueldos();
            } catch (error) {
                console.error('Error eliminando registro:', error);
                alert('Error al eliminar el registro');
            }
        }
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'PAGADO': return '#00ff88';
            case 'PENDIENTE': return '#ffaa00';
            case 'ANULADO': return '#ff4444';
            default: return '#64748b';
        }
    };

    if (!isAdmin) {
        return (
            <div className="welcome-card" style={{ textAlign: 'center' }}>
                <h3>⛔ Acceso Restringido</h3>
                <p>Esta sección solo está disponible para administradores.</p>
            </div>
        );
    }

    if (loading) return <div style={{ textAlign: 'center', padding: '1.8rem', color: '#00ff88' }}>CARGANDO SUELDOS...</div>;

    return (
        <div style={{ padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem', flexWrap: 'wrap', gap: '0.9rem' }}>
                <h2 className="section-title" style={{ fontSize: '1.28rem', marginBottom: '0' }}>💰 GESTIÓN DE SUELDOS</h2>
                <button onClick={() => { 
                    setEditingSueldo(null); 
                    setFormData({ 
                        usuario_id: 0, 
                        sede_id: 0, 
                        mes: new Date().getMonth() + 1, 
                        ano: new Date().getFullYear(),
                        sueldo_base: 1300000, 
                        comisiones: 0, 
                        bonificaciones: 0, 
                        deducciones: 0, 
                        total: 0, 
                        fecha_pago: '', 
                        observaciones: '',
                        estado: 'PENDIENTE'
                    }); 
                    setShowModal(true); 
                }} 
                    className="btn-login" style={{ width: 'auto', padding: '0.45rem 1.35rem', fontSize: '0.76rem' }}>
                    + NUEVO REGISTRO
                </button>
            </div>

            {/* Filtros */}
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem', padding: '0.9rem', marginBottom: '1.35rem' }}>
                <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label className="input-label" style={{ fontSize: '0.57rem' }}>SEDE</label>
                        <select value={filtros.sede_id} onChange={(e) => setFiltros({ ...filtros, sede_id: e.target.value })} 
                            style={{ padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}>
                            <option value="">Todas</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="input-label" style={{ fontSize: '0.57rem' }}>MES</label>
                        <select value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })} 
                            style={{ padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}>
                            {meses.map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="input-label" style={{ fontSize: '0.57rem' }}>AÑO</label>
                        <input type="number" value={filtros.ano} onChange={(e) => setFiltros({ ...filtros, ano: parseInt(e.target.value) })} 
                            style={{ width: '80px', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }} />
                    </div>
                    <div>
                        <label className="input-label" style={{ fontSize: '0.57rem' }}>ESTADO</label>
                        <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} 
                            style={{ padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}>
                            <option value="">Todos</option>
                            {estados.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <button onClick={() => { cargarVendedores(); cargarSueldos(); }} 
                        style={{ padding: '0.45rem 0.9rem', background: '#00ff88', border: 'none', borderRadius: '0.45rem', color: '#000', cursor: 'pointer', fontSize: '0.76rem', height: '38px', fontWeight: 'bold' }}>
                        APLICAR
                    </button>
                    <button onClick={() => setFiltros({ sede_id: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), estado: '' })} 
                        style={{ padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.76rem', height: '38px' }}>
                        LIMPIAR
                    </button>
                </div>
            </div>

            {/* Tabla de sueldos */}
            <div style={{ overflow: 'auto', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>VENDEDOR</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>SEDE</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>MES/AÑO</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>SUELDO BASE</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>COMISIONES</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>BONOS</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>DEDUCCIONES</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>TOTAL</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>ESTADO</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sueldos.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{s.nombre_usuario}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem', color: '#00ff88' }}>{s.sede_nombre}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center', fontSize: '0.76rem' }}>{meses[s.mes - 1]} {s.ano}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem' }}>${s.sueldo_base.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', color: '#ffaa00' }}>${s.comisiones.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', color: '#00ff88' }}>${s.bonificaciones.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', color: '#ff4444' }}>${s.deducciones.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', fontWeight: 'bold', color: '#00ff88' }}>${s.total.toLocaleString()}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    <span style={{ background: getEstadoColor(s.estado) + '20', color: getEstadoColor(s.estado), padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.66rem' }}>
                                        {s.estado}
                                    </span>
                                </td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => { 
                                            setEditingSueldo(s); 
                                            setFormData({ 
                                                usuario_id: s.usuario_id, 
                                                sede_id: s.sede_id, 
                                                mes: s.mes, 
                                                ano: s.ano,
                                                sueldo_base: s.sueldo_base, 
                                                comisiones: s.comisiones, 
                                                bonificaciones: s.bonificaciones,
                                                deducciones: s.deducciones, 
                                                total: s.total, 
                                                fecha_pago: s.fecha_pago || '', 
                                                observaciones: s.observaciones || '',
                                                estado: s.estado
                                            }); 
                                            setShowModal(true); 
                                        }} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem' }} 
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.id)} 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ff4444' }} 
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {sueldos.length === 0 && (
                            <tr>
                                <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    No hay registros de sueldos para los filtros seleccionados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Nuevo/Editar Sueldo */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #00ff88', borderRadius: '0.9rem', padding: '1.8rem', width: '90%', maxWidth: '550px', maxHeight: '85vh', overflow: 'auto' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.9rem' }}>{editingSueldo ? '✏️ EDITAR SUELDO' : '➕ NUEVO REGISTRO'}</h3>
                        
                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">VENDEDOR</label>
                            <select 
                                value={formData.usuario_id} 
                                onChange={(e) => {
                                    const vendedorId = parseInt(e.target.value);
                                    const vendedor = vendedores.find(v => v.id === vendedorId);
                                    setFormData({ 
                                        ...formData, 
                                        usuario_id: vendedorId, 
                                        sede_id: vendedor?.sede_id || 0 
                                    });
                                }} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }}
                            >
                                <option value={0}>Seleccionar vendedor...</option>
                                {vendedores.map(v => (
                                    <option key={v.id} value={v.id}>{v.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">SEDE</label>
                            <input 
                                type="text" 
                                value={sedes.find(s => s.id === formData.sede_id)?.nombre || (formData.sede_id ? `Sede ${formData.sede_id}` : 'Selecciona un vendedor')} 
                                disabled 
                                style={{ width: '100%', padding: '0.45rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#64748b', fontSize: '0.8rem' }} 
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
                            <div>
                                <label className="input-label">MES</label>
                                <select value={formData.mes} onChange={(e) => setFormData({ ...formData, mes: parseInt(e.target.value) })} 
                                    style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }}>
                                    {meses.map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">AÑO</label>
                                <input type="number" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })} 
                                    style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">SUELDO BASE</label>
                            <input type="number" value={formData.sueldo_base} onChange={(e) => setFormData({ ...formData, sueldo_base: parseFloat(e.target.value) })} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
                            <div>
                                <label className="input-label">COMISIONES</label>
                                <input type="number" value={formData.comisiones} onChange={(e) => setFormData({ ...formData, comisiones: parseFloat(e.target.value) })} 
                                    style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                            </div>
                            <div>
                                <label className="input-label">BONIFICACIONES</label>
                                <input type="number" value={formData.bonificaciones} onChange={(e) => setFormData({ ...formData, bonificaciones: parseFloat(e.target.value) })} 
                                    style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">DEDUCCIONES</label>
                            <input type="number" value={formData.deducciones} onChange={(e) => setFormData({ ...formData, deducciones: parseFloat(e.target.value) })} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">TOTAL</label>
                            <input type="number" value={formData.total} disabled 
                                style={{ width: '100%', padding: '0.45rem', background: '#1a1a1a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#00ff88', fontSize: '0.8rem', fontWeight: 'bold' }} />
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">ESTADO</label>
                            <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }}>
                                {estados.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">FECHA DE PAGO</label>
                            <input type="date" value={formData.fecha_pago} onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">OBSERVACIONES</label>
                            <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} 
                                className="input-field" rows={2} placeholder="Observaciones..."
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.8rem' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.9rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.45rem', fontSize: '0.76rem' }}>
                                {editingSueldo ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                            <button onClick={() => { setShowModal(false); setEditingSueldo(null); }} 
                                style={{ flex: 1, padding: '0.45rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.76rem' }}>
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sueldos;