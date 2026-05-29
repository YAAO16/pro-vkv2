import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import apiClient from '../../api/axiosClient';
import '../../App.css';

interface ProductoDanado {
    id: number;
    sede_id: number;
    sede_nombre: string;
    usuario_id: number;
    nombre_usuario: string;
    fecha: string;
    nombre_producto: string;
    cantidad: number;
    motivo: string;
    created_at: string;
    updated_at: string;
}

interface Sede {
    id: number;
    nombre: string;
}

interface Producto {
    id: number;
    sku: string;
    nombre: string;
    precio_venta: number;
}

const ProductosDanados: React.FC = () => {
    const { isAdmin } = useAuth();
    const [registros, setRegistros] = useState<ProductoDanado[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingReg, setEditingReg] = useState<ProductoDanado | null>(null);
    const [filtros, setFiltros] = useState({ sede_id: '', fecha_inicio: '', fecha_fin: '' });
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        nombre_producto: '',
        cantidad: 1,
        motivo: ''
    });

    useEffect(() => {
        cargarRegistros();
        cargarProductos();
        if (isAdmin) {
            cargarSedes();
        }
    }, [filtros]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarProductos = async () => {
        try {
            const response = await apiClient.get('/productos/');
            setProductos(response.data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    };

    const cargarRegistros = async () => {
        try {
            const params: any = {};
            if (filtros.sede_id) params.sede_id = filtros.sede_id;
            if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
            if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
            
            const response = await apiClient.get('/productos-danados/', { params });
            setRegistros(response.data);
        } catch (error) {
            console.error('Error cargando registros:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.nombre_producto) {
            alert('Selecciona un producto');
            return;
        }

        try {
            if (editingReg) {
                await apiClient.put(`/productos-danados/${editingReg.id}`, formData);
            } else {
                await apiClient.post('/productos-danados/', formData);
            }
            setShowModal(false);
            setEditingReg(null);
            setFormData({ fecha: new Date().toISOString().split('T')[0], nombre_producto: '', cantidad: 1, motivo: '' });
            cargarRegistros();
        } catch (error) {
            console.error('Error guardando registro:', error);
            alert('Error al guardar el registro');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) {
            try {
                await apiClient.delete(`/productos-danados/${id}`);
                cargarRegistros();
            } catch (error) {
                console.error('Error eliminando registro:', error);
                alert('Error al eliminar el registro');
            }
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.8rem', color: '#00ff88' }}>CARGANDO PRODUCTOS DAÑADOS...</div>;

    return (
        <div style={{ padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem', flexWrap: 'wrap', gap: '0.9rem' }}>
                <h2 className="section-title" style={{ fontSize: '1.28rem', marginBottom: '0' }}>🔧 PRODUCTOS DAÑADOS</h2>
                <button onClick={() => { setEditingReg(null); setFormData({ fecha: new Date().toISOString().split('T')[0], nombre_producto: '', cantidad: 1, motivo: '' }); setShowModal(true); }} 
                    className="btn-login" style={{ width: 'auto', padding: '0.45rem 1.35rem', fontSize: '0.76rem' }}>
                    + REGISTRAR DAÑO
                </button>
            </div>

            {/* Filtros */}
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem', padding: '0.9rem', marginBottom: '1.35rem' }}>
                <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {isAdmin && (
                        <div style={{ minWidth: '150px' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>SEDE</label>
                            <select value={filtros.sede_id} onChange={(e) => setFiltros({ ...filtros, sede_id: e.target.value })} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}>
                                <option value="">Todas</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="input-label" style={{ fontSize: '0.57rem' }}>FECHA INICIO</label>
                        <input type="date" value={filtros.fecha_inicio} onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })} 
                            style={{ padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }} />
                    </div>
                    <div>
                        <label className="input-label" style={{ fontSize: '0.57rem' }}>FECHA FIN</label>
                        <input type="date" value={filtros.fecha_fin} onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })} 
                            style={{ padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }} />
                    </div>
                    <button onClick={() => setFiltros({ sede_id: '', fecha_inicio: '', fecha_fin: '' })} 
                        style={{ padding: '0.45rem 0.9rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.76rem', height: '38px' }}>
                        LIMPIAR
                    </button>
                </div>
            </div>

            {/* Tabla de productos dañados */}
            <div style={{ overflow: 'auto', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>FECHA</th>
                            {isAdmin && <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>SEDE</th>}
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>PRODUCTO</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>CANTIDAD</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>MOTIVO</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registros.map((r) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{new Date(r.fecha).toLocaleDateString()}</td>
                                {isAdmin && <td style={{ padding: '0.7rem', fontSize: '0.76rem', color: '#00ff88' }}>{r.sede_nombre}</td>}
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{r.nombre_producto}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center', fontSize: '0.76rem', color: '#ff4444' }}>{r.cantidad}</td>
                                <td style={{ padding: '0.7rem', fontSize: '0.76rem', color: '#94a3b8' }}>{r.motivo || '-'}</td>
                                <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                    {(isAdmin || r.usuario_id === 0) && (
                                        <button onClick={() => { 
                                            setEditingReg(r); 
                                            setFormData({ 
                                                fecha: r.fecha, 
                                                nombre_producto: r.nombre_producto, 
                                                cantidad: r.cantidad, 
                                                motivo: r.motivo || '' 
                                            }); 
                                            setShowModal(true); 
                                        }} 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', marginRight: '0.5rem' }} 
                                            title="Editar">
                                            ✏️
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => handleDelete(r.id)} 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#ff4444' }} 
                                            title="Eliminar">
                                            🗑️
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {registros.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    No hay registros de productos dañados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Nuevo/Editar Registro */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #00ff88', borderRadius: '0.9rem', padding: '1.8rem', width: '90%', maxWidth: '500px' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.9rem' }}>{editingReg ? '✏️ EDITAR REGISTRO' : '➕ REGISTRAR PRODUCTO DAÑADO'}</h3>
                        
                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">FECHA</label>
                            <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} 
                                className="input-field" style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                        </div>
                        
                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">PRODUCTO</label>
                            <select 
                                value={formData.nombre_producto} 
                                onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })} 
                                className="input-field" 
                                style={{ padding: '0.45rem', fontSize: '0.8rem' }}
                            >
                                <option value="">Seleccionar producto...</option>
                                {productos.map(p => (
                                    <option key={p.id} value={p.nombre}>{p.sku} - {p.nombre}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">CANTIDAD</label>
                            <input type="number" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) })} 
                                className="input-field" min="1" style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                        </div>
                        
                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label">MOTIVO (OPCIONAL)</label>
                            <textarea value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} 
                                className="input-field" rows={3} placeholder="Ej: Producto llegó dañado del proveedor..."
                                style={{ padding: '0.45rem', fontSize: '0.8rem' }} />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.9rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.45rem', fontSize: '0.76rem' }}>
                                {editingReg ? 'ACTUALIZAR' : 'REGISTRAR'}
                            </button>
                            <button onClick={() => { setShowModal(false); setEditingReg(null); }} 
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

export default ProductosDanados;