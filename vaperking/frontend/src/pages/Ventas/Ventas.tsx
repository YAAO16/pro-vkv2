import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../api';
import '../../App.css';

interface Venta {
    id: number;
    sede_id: number;
    usuario_id: number;
    nombre_usuario: string;
    total: number;
    metodo_pago: string;
    created_at: string;
    notas: string;
    anulada: boolean;
    sede_nombre?: string;
}

interface VentaDetalle {
    id: number;
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_unit: number;
    subtotal: number;
}

interface VentaCompleta extends Venta {
    detalles?: VentaDetalle[];
}

interface Producto {
    id: number;
    sku: string;
    nombre: string;
    precio_venta: number;
    stock_actual?: number;
}

interface Sede {
    id: number;
    nombre: string;
    ciudad: string;
}

interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    rol: string;
}

const Ventas: React.FC = () => {
    const { isAdmin, isVendedor, sedeId } = useAuth();
    const [ventas, setVentas] = useState<VentaCompleta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState<VentaCompleta | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<{ producto_id: number; cantidad: number; precio_unit: number }[]>([]);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [notas, setNotas] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [filtroSedeId, setFiltroSedeId] = useState<number | null>(null);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
    const [filtroFechaFin, setFiltroFechaFin] = useState('');
    const [filtroMetodo, setFiltroMetodo] = useState('');
    const [filtroUsuario, setFiltroUsuario] = useState<number | null>(null);
    const [totalVentas, setTotalVentas] = useState(0);
    const [totalIngresos, setTotalIngresos] = useState(0);

    useEffect(() => {
        cargarVentas();
        cargarProductos();
        if (isAdmin) {
            cargarSedes();
            cargarUsuarios();
        }
    }, [filtroSedeId, filtroFecha, filtroMetodo, filtroFechaInicio, filtroFechaFin, filtroUsuario]);

    const cargarSedes = async () => {
        try {
            const response = await api.getSedes();
            setSedes(response.data.sedes || response.data);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarUsuarios = async () => {
        try {
            const response = await api.getUsuarios();
            setUsuarios(response.data);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        }
    };

    const cargarVentas = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (isVendedor && sedeId) params.sede_id = sedeId;
            if (isAdmin && filtroSedeId) params.sede_id = filtroSedeId;
            if (filtroFecha) params.fecha = filtroFecha;
            if (filtroFechaInicio) params.fecha_inicio = filtroFechaInicio;
            if (filtroFechaFin) params.fecha_fin = filtroFechaFin;
            if (filtroMetodo) params.metodo_pago = filtroMetodo;
            if (filtroUsuario) params.usuario_id = filtroUsuario;
            
            const response = await api.getVentas(params);
            let ventasData = response.data.ventas || response.data;
            
            // Enriquecer ventas con detalles y nombres de vendedor
            for (let i = 0; i < ventasData.length; i++) {
                try {
                    const detallesResponse = await api.getVentaDetalles(ventasData[i].id);
                    ventasData[i].detalles = detallesResponse.data;
                } catch (e) {
                    ventasData[i].detalles = [];
                }
                
                if (!ventasData[i].nombre_usuario && ventasData[i].usuario_id) {
                    const usuarioEncontrado = usuarios.find(u => u.id === ventasData[i].usuario_id);
                    if (usuarioEncontrado) {
                        ventasData[i].nombre_usuario = usuarioEncontrado.nombre_completo;
                    }
                }
            }
            
            setVentas(ventasData);
            
            const totalV = ventasData.reduce((sum: number, v: VentaCompleta) => sum + (v.anulada ? 0 : 1), 0);
            const totalI = ventasData.reduce((sum: number, v: VentaCompleta) => sum + (v.anulada ? 0 : v.total), 0);
            setTotalVentas(totalV);
            setTotalIngresos(totalI);
        } catch (error) {
            console.error('Error cargando ventas:', error);
            setError('Error al cargar las ventas');
        } finally {
            setLoading(false);
        }
    };

    const cargarProductos = async () => {
        try {
            const response = await api.getProductos();
            setProductos(response.data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    };

    const handleSubmit = async () => {
        if (selectedProducts.length === 0) {
            setError('Agrega al menos un producto');
            return;
        }

        try {
            const ventaData = {
                sede_id: isVendedor ? sedeId : (filtroSedeId || 1),
                metodo_pago: metodoPago,
                notas: notas,
                detalles: selectedProducts.map(p => ({
                    producto_id: p.producto_id,
                    cantidad: p.cantidad,
                    precio_unit: p.precio_unit
                }))
            };

            await api.createVenta(ventaData);
            
            setShowModal(false);
            setSelectedProducts([]);
            setMetodoPago('efectivo');
            setNotas('');
            setSuccess('Venta registrada exitosamente');
            setTimeout(() => setSuccess(''), 3000);
            cargarVentas();
            cargarProductos();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Error al guardar la venta');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleAnular = async (venta: VentaCompleta) => {
        if (venta.anulada) {
            setError('Esta venta ya está anulada');
            return;
        }
        
        const motivo = prompt('Motivo de anulación:');
        if (!motivo) return;
        
        try {
            await api.deleteVenta(venta.id, motivo);
            setSuccess('Venta anulada exitosamente');
            setTimeout(() => setSuccess(''), 3000);
            cargarVentas();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Error al anular la venta');
            setTimeout(() => setError(''), 3000);
        }
    };

    const verDetalle = async (venta: VentaCompleta) => {
        try {
            if (venta.detalles && venta.detalles.length > 0) {
                setSelectedVenta(venta);
                setShowDetailModal(true);
                return;
            }
            
            const response = await api.getVentaDetalles(venta.id);
            const ventaConDetalles = { ...venta, detalles: response.data };
            setSelectedVenta(ventaConDetalles);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error cargando detalle:', error);
            setError('Error al cargar el detalle de la venta');
            setTimeout(() => setError(''), 3000);
        }
    };

    const agregarProducto = (producto: Producto) => {
        const existente = selectedProducts.find(p => p.producto_id === producto.id);
        if (existente) {
            actualizarCantidad(
                selectedProducts.findIndex(p => p.producto_id === producto.id),
                existente.cantidad + 1
            );
        } else {
            setSelectedProducts([...selectedProducts, {
                producto_id: producto.id,
                cantidad: 1,
                precio_unit: producto.precio_venta
            }]);
        }
    };

    const eliminarProducto = (index: number) => {
        const nuevos = selectedProducts.filter((_, i) => i !== index);
        setSelectedProducts(nuevos);
    };

    const actualizarCantidad = (index: number, cantidad: number) => {
        if (cantidad < 1) return;
        const nuevos = [...selectedProducts];
        nuevos[index].cantidad = cantidad;
        setSelectedProducts(nuevos);
    };

    const calcularTotal = () => {
        return selectedProducts.reduce((sum, item) => sum + (item.cantidad * item.precio_unit), 0);
    };

    const limpiarFiltros = () => {
        setFiltroSedeId(null);
        setFiltroFecha('');
        setFiltroFechaInicio('');
        setFiltroFechaFin('');
        setFiltroMetodo('');
        setFiltroUsuario(null);
    };

    const getMetodoPagoIcon = (metodo: string) => {
        return metodo === 'efectivo' ? '💰' : '💳';
    };

    const getMetodoPagoColor = (metodo: string) => {
        return metodo === 'efectivo' ? '#00ff88' : '#00aaff';
    };

    const getNombreVendedor = (venta: VentaCompleta) => {
        if (venta.nombre_usuario) return venta.nombre_usuario;
        const usuarioEncontrado = usuarios.find(u => u.id === venta.usuario_id);
        return usuarioEncontrado?.nombre_completo || usuarioEncontrado?.username || `ID: ${venta.usuario_id}`;
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.8rem', color: '#00ff88', fontSize: '0.85rem' }}>CARGANDO VENTAS...</div>;

    return (
        <div style={{ padding: '0.9rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem', flexWrap: 'wrap', gap: '0.9rem' }}>
                <h2 className="section-title" style={{ fontSize: '1.28rem', marginBottom: '0' }}>💰 VENTAS</h2>
                <button onClick={() => setShowModal(true)} className="btn-login" style={{ width: 'auto', padding: '0.45rem 1.35rem', fontSize: '0.76rem' }}>
                    + NUEVA VENTA
                </button>
            </div>

            {/* Tarjetas de resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.9rem', marginBottom: '1.35rem' }}>
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem', padding: '0.9rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>TOTAL VENTAS</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#00ff88' }}>{totalVentas}</div>
                </div>
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem', padding: '0.9rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>TOTAL INGRESOS</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#00ff88' }}>${totalIngresos.toLocaleString()}</div>
                </div>
            </div>

            {/* Mensajes */}
            {error && <div style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.66rem', borderRadius: '0.45rem', marginBottom: '0.9rem', fontSize: '0.76rem' }}>❌ {error}</div>}
            {success && <div style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid #00ff88', color: '#00ff88', padding: '0.66rem', borderRadius: '0.45rem', marginBottom: '0.9rem', fontSize: '0.76rem' }}>✅ {success}</div>}

            {/* Filtros para Admin */}
            {isAdmin && (
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem', padding: '0.9rem', marginBottom: '1.35rem' }}>
                    <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>SEDE</label>
                            <select 
                                value={filtroSedeId || ''} 
                                onChange={(e) => setFiltroSedeId(e.target.value ? parseInt(e.target.value) : null)} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}
                            >
                                <option value="">Todas las sedes</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>VENDEDOR</label>
                            <select 
                                value={filtroUsuario || ''} 
                                onChange={(e) => setFiltroUsuario(e.target.value ? parseInt(e.target.value) : null)} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}
                            >
                                <option value="">Todos los vendedores</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>FECHA INICIO</label>
                            <input 
                                type="date" 
                                value={filtroFechaInicio} 
                                onChange={(e) => setFiltroFechaInicio(e.target.value)} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }} 
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>FECHA FIN</label>
                            <input 
                                type="date" 
                                value={filtroFechaFin} 
                                onChange={(e) => setFiltroFechaFin(e.target.value)} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }} 
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '100px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>MÉTODO</label>
                            <select 
                                value={filtroMetodo} 
                                onChange={(e) => setFiltroMetodo(e.target.value)} 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}
                            >
                                <option value="">Todos</option>
                                <option value="efectivo">💰 Efectivo</option>
                                <option value="transferencia">💳 Transferencia</option>
                            </select>
                        </div>
                        <button onClick={cargarVentas} style={{ padding: '0.45rem 0.9rem', background: '#00ff88', border: 'none', borderRadius: '0.45rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.76rem' }}>
                            FILTRAR
                        </button>
                        <button onClick={limpiarFiltros} style={{ padding: '0.45rem 0.9rem', background: '#1e293b', border: 'none', borderRadius: '0.45rem', cursor: 'pointer', color: '#94a3b8', fontSize: '0.76rem' }}>
                            LIMPIAR
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla de ventas */}
            <div style={{ overflow: 'auto', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '0.66rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.66rem', textAlign: 'left', color: '#64748b', fontSize: '0.66rem' }}>ID</th>
                            {isAdmin && <th style={{ padding: '0.66rem', textAlign: 'left', color: '#64748b', fontSize: '0.66rem' }}>SEDE</th>}
                            <th style={{ padding: '0.66rem', textAlign: 'left', color: '#64748b', fontSize: '0.66rem' }}>FECHA</th>
                            <th style={{ padding: '0.66rem', textAlign: 'left', color: '#64748b', fontSize: '0.66rem' }}>VENDEDOR</th>
                            <th style={{ padding: '0.66rem', textAlign: 'right', color: '#64748b', fontSize: '0.66rem' }}>TOTAL</th>
                            <th style={{ padding: '0.66rem', textAlign: 'center', color: '#64748b', fontSize: '0.66rem' }}>PAGO</th>
                            <th style={{ padding: '0.66rem', textAlign: 'center', color: '#64748b', fontSize: '0.66rem' }}>ESTADO</th>
                            <th style={{ padding: '0.66rem', textAlign: 'center', color: '#64748b', fontSize: '0.66rem' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    No hay ventas registradas
                                </td>
                            </tr>
                        ) : (
                            ventas.map((venta) => (
                                <tr key={venta.id} style={{ borderBottom: '1px solid #1a1a1a', opacity: venta.anulada ? 0.5 : 1 }}>
                                    <td style={{ padding: '0.66rem', fontSize: '0.72rem' }}>#{venta.id}</td>
                                    {isAdmin && <td style={{ padding: '0.66rem', fontSize: '0.72rem', color: '#00ff88' }}>{venta.sede_nombre || `Sede ${venta.sede_id}`}</td>}
                                    <td style={{ padding: '0.66rem', fontSize: '0.72rem' }}>{new Date(venta.created_at).toLocaleDateString()} {new Date(venta.created_at).toLocaleTimeString()}</td>
                                    <td style={{ padding: '0.66rem', fontSize: '0.72rem' }}>{getNombreVendedor(venta)}</td>
                                    <td style={{ padding: '0.66rem', textAlign: 'right', fontSize: '0.72rem', color: '#00ff88' }}>${venta.total.toLocaleString()}</td>
                                    <td style={{ padding: '0.66rem', textAlign: 'center', fontSize: '0.72rem' }}>
                                        <span style={{ color: getMetodoPagoColor(venta.metodo_pago) }}>
                                            {getMetodoPagoIcon(venta.metodo_pago)} {venta.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.66rem', textAlign: 'center', fontSize: '0.72rem' }}>
                                        {venta.anulada ? (
                                            <span style={{ color: '#ff4444' }}>❌ ANULADA</span>
                                        ) : (
                                            <span style={{ color: '#00ff88' }}>✅ ACTIVA</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.66rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => verDetalle(venta)} 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                                title="Ver detalles"
                                            >
                                                👁️
                                            </button>
                                            <button 
                                                onClick={() => handleAnular(venta)} 
                                                disabled={venta.anulada} 
                                                style={{ background: 'none', border: 'none', cursor: venta.anulada ? 'not-allowed' : 'pointer', opacity: venta.anulada ? 0.5 : 1, fontSize: '1rem' }}
                                                title="Anular venta"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Nueva Venta */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #00ff88', borderRadius: '0.9rem', padding: '1.8rem', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.9rem', fontSize: '1.12rem' }}>💰 NUEVA VENTA</h3>
                        
                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label" style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>➕ AGREGAR PRODUCTO</label>
                            <select 
                                onChange={(e) => { 
                                    const p = productos.find(prod => prod.id === parseInt(e.target.value)); 
                                    if (p) agregarProducto(p); 
                                    e.target.value = '';
                                }} 
                                value="" 
                                style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}
                            >
                                <option value="">Seleccionar producto...</option>
                                {productos.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} - ${p.precio_venta.toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '0.9rem', maxHeight: '250px', overflow: 'auto' }}>
                            <label className="input-label" style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>📋 PRODUCTOS EN VENTA</label>
                            {selectedProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.7rem' }}>
                                    No hay productos agregados
                                </div>
                            ) : (
                                selectedProducts.map((item, idx) => {
                                    const prod = productos.find(p => p.id === item.producto_id);
                                    return (
                                        <div key={idx} style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', marginBottom: '0.45rem', padding: '0.45rem', background: '#111', borderRadius: '0.45rem' }}>
                                            <span style={{ flex: 2, fontSize: '0.72rem' }}>{prod?.nombre}</span>
                                            <input 
                                                type="number" 
                                                value={item.cantidad} 
                                                onChange={(e) => actualizarCantidad(idx, parseInt(e.target.value))} 
                                                style={{ width: '60px', padding: '0.27rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.27rem', color: 'white', fontSize: '0.7rem', textAlign: 'center' }} 
                                            />
                                            <span style={{ width: '80px', fontSize: '0.72rem', color: '#00ff88', textAlign: 'right' }}>
                                                ${(item.cantidad * item.precio_unit).toLocaleString()}
                                            </span>
                                            <button onClick={() => eliminarProducto(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444', fontSize: '0.9rem' }}>❌</button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label" style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>💳 MÉTODO DE PAGO</label>
                            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }}>
                                <option value="efectivo">💰 Efectivo</option>
                                <option value="transferencia">💳 Transferencia</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '0.9rem' }}>
                            <label className="input-label" style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>📝 NOTAS (OPCIONAL)</label>
                            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '0.45rem', color: 'white', fontSize: '0.76rem' }} rows={2} placeholder="Observaciones de la venta..." />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid #1a1a1a' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>TOTAL:</span>
                            <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#00ff88' }}>${calcularTotal().toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.9rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.45rem', fontSize: '0.72rem' }}>REGISTRAR VENTA</button>
                            <button onClick={() => { setShowModal(false); setSelectedProducts([]); }} style={{ flex: 1, padding: '0.45rem', background: 'transparent', border: '1px solid #1e293b', borderRadius: '0.45rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.72rem' }}>CANCELAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Venta */}
            {showDetailModal && selectedVenta && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid #00ff88', borderRadius: '0.9rem', padding: '1.8rem', width: '90%', maxWidth: '550px', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.9rem', fontSize: '1.12rem' }}>📄 DETALLE DE VENTA #{selectedVenta.id}</h3>
                        
                        <div style={{ marginBottom: '0.9rem', padding: '0.9rem', background: '#111', borderRadius: '0.45rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>FECHA:</span>
                                <span style={{ color: 'white', fontSize: '0.75rem' }}>{new Date(selectedVenta.created_at).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>VENDEDOR:</span>
                                <span style={{ color: 'white', fontSize: '0.75rem' }}>{getNombreVendedor(selectedVenta)}</span>
                            </div>
                            {isAdmin && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>SEDE:</span>
                                    <span style={{ color: '#00ff88', fontSize: '0.75rem' }}>{selectedVenta.sede_nombre || `Sede ${selectedVenta.sede_id}`}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>MÉTODO DE PAGO:</span>
                                <span style={{ color: getMetodoPagoColor(selectedVenta.metodo_pago), fontSize: '0.75rem' }}>
                                    {getMetodoPagoIcon(selectedVenta.metodo_pago)} {selectedVenta.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                                </span>
                            </div>
                            {selectedVenta.notas && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>NOTAS:</span>
                                    <span style={{ color: 'white', fontSize: '0.75rem' }}>{selectedVenta.notas}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>ESTADO:</span>
                                <span style={{ color: selectedVenta.anulada ? '#ff4444' : '#00ff88', fontSize: '0.75rem' }}>
                                    {selectedVenta.anulada ? '❌ ANULADA' : '✅ ACTIVA'}
                                </span>
                            </div>
                        </div>

                        <h4 style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '0.45rem' }}>PRODUCTOS:</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                                    <th style={{ padding: '0.45rem', textAlign: 'left', color: '#64748b', fontSize: '0.6rem' }}>PRODUCTO</th>
                                    <th style={{ padding: '0.45rem', textAlign: 'center', color: '#64748b', fontSize: '0.6rem' }}>CANT</th>
                                    <th style={{ padding: '0.45rem', textAlign: 'right', color: '#64748b', fontSize: '0.6rem' }}>P. UNIT</th>
                                    <th style={{ padding: '0.45rem', textAlign: 'right', color: '#64748b', fontSize: '0.6rem' }}>SUBTOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedVenta.detalles && selectedVenta.detalles.length > 0 ? (
                                    selectedVenta.detalles.map((detalle, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                            <td style={{ padding: '0.45rem', fontSize: '0.7rem' }}>{detalle.nombre_producto}</td>
                                            <td style={{ padding: '0.45rem', textAlign: 'center', fontSize: '0.7rem' }}>{detalle.cantidad}</td>
                                            <td style={{ padding: '0.45rem', textAlign: 'right', fontSize: '0.7rem' }}>${detalle.precio_unit.toLocaleString()}</td>
                                            <td style={{ padding: '0.45rem', textAlign: 'right', fontSize: '0.7rem', color: '#00ff88' }}>${detalle.subtotal.toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                                            No hay detalles disponibles
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '1px solid #1a1a1a' }}>
                                    <td colSpan={3} style={{ padding: '0.45rem', textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
                                    <td style={{ padding: '0.45rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 'bold', color: '#00ff88' }}>${selectedVenta.total.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <button onClick={() => setShowDetailModal(false)} className="btn-login" style={{ width: '100%', padding: '0.45rem' }}>CERRAR</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ventas;