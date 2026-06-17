import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../context/PermisosContext';
import { useAuthStore } from '../../store/authStore';

interface Producto {
    id: number;
    nombre: string;
    sku: string;
    precio_venta: number;
    stock: number;
}

interface Sede {
    id: number;
    nombre: string;
}

interface VentaDetalle {
    producto_id: number;
    cantidad: number;
    precio_unit: number;
    subtotal: number;
    producto_nombre?: string;
}

interface Venta {
    id: number;
    sede_id: number;
    usuario_id: number;
    total: number;
    metodo_pago: string;
    efectivo: number | null;
    transferencia: number | null;
    created_at: string;
    notas: string | null;
    anulada: boolean;
    anulada_por: number | null;
    motivo_anulacion: string | null;
    usuario?: { nombre_completo: string };
    sede?: { nombre: string };
}

interface VentaDetalleFull {
    id: number;
    venta_id: number;
    producto_id: number;
    cantidad: number;
    precio_unit: number;
    precio_original: number | null;
    subtotal: number;
    producto?: { nombre: string; sku: string };
}

const Ventas: React.FC = () => {
    const { tienePermiso, isAdmin } = usePermisos();
    const { usuario } = useAuthStore();
    const [productos, setProductos] = useState<Producto[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showVentasList, setShowVentasList] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [cantidad, setCantidad] = useState(1);
    const [carrito, setCarrito] = useState<VentaDetalle[]>([]);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [efectivo, setEfectivo] = useState<number | null>(null);
    const [transferencia, setTransferencia] = useState<number | null>(null);
    const [sedeId, setSedeId] = useState<number>(1);
    const [notas, setNotas] = useState('');

    // Estados para detalles de venta
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);
    const [detallesVenta, setDetallesVenta] = useState<VentaDetalleFull[]>([]);
    const [loadingDetalles, setLoadingDetalles] = useState(false);

    // Permisos
    const puedeCrear = isAdmin || tienePermiso('ventas_crear');
    const puedeAjustarPrecio = isAdmin || tienePermiso('ventas_ajustar_precio');
    const puedeAnular = isAdmin || tienePermiso('ventas_anular');

    useEffect(() => {
        cargarProductos();
        cargarSedes();
        cargarVentas();
        if (usuario?.sede_id) {
            setSedeId(usuario.sede_id);
        }
    }, []);

    const cargarProductos = async () => {
        try {
            const response = await apiClient.get('/productos/');
            setProductos(response.data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes || []);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarVentas = async () => {
        try {
            const response = await apiClient.get('/ventas/?limit=50');
            setVentas(response.data.ventas || []);
        } catch (error) {
            console.error('Error cargando ventas:', error);
        }
    };

    const verDetallesVenta = async (ventaId: number) => {
        try {
            setLoadingDetalles(true);
            setShowDetallesModal(true);
            
            // Obtener detalles de la venta
            const response = await apiClient.get(`/ventas/${ventaId}/detalles`);
            const detalles = response.data;
            
            // Enriquecer detalles con información del producto
            const detallesEnriquecidos = await Promise.all(
                detalles.map(async (detalle: VentaDetalleFull) => {
                    try {
                        const productoResponse = await apiClient.get(`/productos/${detalle.producto_id}`);
                        return {
                            ...detalle,
                            producto: productoResponse.data
                        };
                    } catch {
                        return {
                            ...detalle,
                            producto: { nombre: 'Producto no encontrado', sku: 'N/A' }
                        };
                    }
                })
            );
            
            setDetallesVenta(detallesEnriquecidos);
            
            // Obtener la venta completa
            const ventaResponse = await apiClient.get(`/ventas/${ventaId}`);
            setVentaSeleccionada(ventaResponse.data);
            
        } catch (error) {
            console.error('Error cargando detalles de venta:', error);
            alert('Error al cargar los detalles de la venta');
        } finally {
            setLoadingDetalles(false);
        }
    };

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const agregarAlCarrito = () => {
        if (!selectedProduct) return;
        if (cantidad <= 0) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }

        const precioUnit = puedeAjustarPrecio ? selectedProduct.precio_venta : selectedProduct.precio_venta;
        const subtotal = precioUnit * cantidad;

        const nuevoItem: VentaDetalle = {
            producto_id: selectedProduct.id,
            cantidad,
            precio_unit: precioUnit,
            subtotal,
            producto_nombre: selectedProduct.nombre
        };

        setCarrito([...carrito, nuevoItem]);
        setSelectedProduct(null);
        setCantidad(1);
        setSearchTerm('');
    };

    const eliminarDelCarrito = (index: number) => {
        setCarrito(carrito.filter((_, i) => i !== index));
    };

    const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const cambio = efectivo ? efectivo - totalCarrito : 0;

    const handleCrearVenta = async () => {
        if (carrito.length === 0) {
            alert('Agrega al menos un producto al carrito');
            return;
        }

        if (metodoPago === 'mixto') {
            const efectivoValor = efectivo || 0;
            const transferenciaValor = transferencia || 0;
            if (efectivoValor + transferenciaValor < totalCarrito) {
                alert('El total de efectivo + transferencia debe ser mayor o igual al total de la venta');
                return;
            }
        } else if (metodoPago === 'efectivo' && (efectivo || 0) < totalCarrito) {
            alert('El efectivo debe ser mayor o igual al total de la venta');
            return;
        } else if (metodoPago === 'transferencia' && (transferencia || 0) < totalCarrito) {
            alert('La transferencia debe ser mayor o igual al total de la venta');
            return;
        }

        try {
            const ventaData = {
                sede_id: sedeId,
                usuario_id: usuario?.id || 1,
                total: totalCarrito,
                metodo_pago: metodoPago,
                efectivo: metodoPago === 'efectivo' || metodoPago === 'mixto' ? efectivo : null,
                transferencia: metodoPago === 'transferencia' || metodoPago === 'mixto' ? transferencia : null,
                notas: notas || undefined,
                detalles: carrito.map(item => ({
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unit: item.precio_unit,
                    subtotal: item.subtotal
                }))
            };

            await apiClient.post('/ventas/', ventaData);
            alert('✅ Venta creada exitosamente');
            setCarrito([]);
            setEfectivo(null);
            setTransferencia(null);
            setNotas('');
            setShowModal(false);
            cargarVentas();
        } catch (error: any) {
            console.error('Error creando venta:', error);
            alert(error.response?.data?.detail || 'Error al crear la venta');
        }
    };

    const handleAnularVenta = async (ventaId: number) => {
        if (!puedeAnular) {
            alert('No tienes permiso para anular ventas');
            return;
        }
        const motivo = prompt('Motivo de anulación:');
        if (motivo === null) return;
        try {
            await apiClient.post(`/ventas/${ventaId}/anular`, { motivo });
            alert('✅ Venta anulada correctamente');
            cargarVentas();
            setShowDetallesModal(false);
        } catch (error: any) {
            console.error('Error anulando venta:', error);
            alert(error.response?.data?.detail || 'Error al anular la venta');
        }
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div style={{ color: '#00ff88', textAlign: 'center', padding: '2rem' }}>CARGANDO PRODUCTOS...</div>;
    }

    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#00ff88' }}>💰 VENTAS</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setShowVentasList(!showVentasList)}
                        style={{
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid #1e293b',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.47rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        📋 {showVentasList ? 'Ocultar' : 'Ver'} Ventas
                    </button>
                    {puedeCrear && (
                        <button
                            onClick={() => setShowModal(true)}
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
                            + NUEVA VENTA
                        </button>
                    )}
                </div>
            </div>

            {/* Lista de ventas recientes */}
            {showVentasList && (
                <div style={{
                    background: '#0f0f0f',
                    border: '1px solid #1a1a1a',
                    borderRadius: '0.95rem',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <h4 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📋 VENTAS RECIENTES</h4>
                    {ventas.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>No hay ventas registradas</p>
                    ) : (
                        <div style={{ overflow: 'auto', maxHeight: '300px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.65rem' }}>ID</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.65rem' }}>Fecha</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.65rem' }}>Total</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.65rem' }}>Pago</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.65rem' }}>Estado</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.65rem' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ventas.map((v) => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                            <td style={{ padding: '0.5rem', fontSize: '0.7rem' }}>#{v.id}</td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                                                {formatearFecha(v.created_at)}
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#00ff88' }}>
                                                ${v.total.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>
                                                {v.metodo_pago === 'efectivo' ? '💰' : v.metodo_pago === 'transferencia' ? '💳' : '💳💰'}
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>
                                                <span style={{
                                                    color: v.anulada ? '#ff4444' : '#00ff88',
                                                    fontSize: '0.65rem'
                                                }}>
                                                    {v.anulada ? '❌ Anulada' : '✅ Activa'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => verDetallesVenta(v.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#00aaff',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        marginRight: '0.3rem'
                                                    }}
                                                    title="Ver detalles"
                                                >
                                                    📄
                                                </button>
                                                {puedeAnular && !v.anulada && (
                                                    <button
                                                        onClick={() => handleAnularVenta(v.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ff4444',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                        title="Anular venta"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Nueva Venta */}
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
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.5rem' }}>🛒 NUEVA VENTA</h3>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                            Sede: {sedes.find(s => s.id === sedeId)?.nombre || 'Seleccionar'}
                        </p>

                        {/* Selección de Sede */}
                        {isAdmin && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ color: '#64748b', fontSize: '0.7rem' }}>SEDE</label>
                                <select
                                    value={sedeId}
                                    onChange={(e) => setSedeId(parseInt(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '0.47rem',
                                        background: '#1a1a1a',
                                        border: '1px solid #1e293b',
                                        borderRadius: '0.47rem',
                                        color: '#e2e8f0',
                                        fontSize: '0.8rem',
                                        marginTop: '0.25rem'
                                    }}
                                >
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Buscador de productos */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar producto por nombre o SKU..."
                                style={{
                                    flex: 1,
                                    padding: '0.47rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#e2e8f0',
                                    fontSize: '0.8rem'
                                }}
                            />
                            {selectedProduct && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: '#00ff88', fontSize: '0.8rem' }}>
                                        {selectedProduct.nombre} - ${selectedProduct.precio_venta.toLocaleString()}
                                    </span>
                                    <input
                                        type="number"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                                        min="1"
                                        style={{
                                            width: '60px',
                                            padding: '0.47rem',
                                            background: '#1a1a1a',
                                            border: '1px solid #1e293b',
                                            borderRadius: '0.47rem',
                                            color: '#e2e8f0',
                                            fontSize: '0.8rem',
                                            textAlign: 'center'
                                        }}
                                    />
                                    <button
                                        onClick={agregarAlCarrito}
                                        style={{
                                            background: '#00ff88',
                                            color: '#0a0a0a',
                                            border: 'none',
                                            padding: '0.47rem 1rem',
                                            borderRadius: '0.47rem',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        Agregar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Lista de productos */}
                        {!selectedProduct && (
                            <div style={{
                                maxHeight: '150px',
                                overflow: 'auto',
                                marginBottom: '1rem',
                                border: '1px solid #1a1a1a',
                                borderRadius: '0.47rem'
                            }}>
                                {productosFiltrados.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedProduct(p)}
                                        style={{
                                            padding: '0.47rem 0.7rem',
                                            borderBottom: '1px solid #1a1a1a',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'background 0.3s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#1a1a1a';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div>
                                            <div style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{p.nombre}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.65rem' }}>SKU: {p.sku}</div>
                                        </div>
                                        <div style={{ color: '#00ff88', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            ${p.precio_venta.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Carrito */}
                        <div style={{ marginBottom: '1rem' }}>
                            <h4 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                🛒 CARRITO ({carrito.length} productos)
                            </h4>
                            <div style={{
                                maxHeight: '200px',
                                overflow: 'auto',
                                border: '1px solid #1a1a1a',
                                borderRadius: '0.47rem'
                            }}>
                                {carrito.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                                        No hay productos en el carrito
                                    </div>
                                ) : (
                                    carrito.map((item, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.47rem 0.7rem',
                                                borderBottom: '1px solid #1a1a1a'
                                            }}
                                        >
                                            <div>
                                                <div style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>
                                                    {item.producto_nombre || `Producto ${item.producto_id}`}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.65rem' }}>
                                                    {item.cantidad} x ${item.precio_unit.toLocaleString()}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ color: '#00ff88', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    ${item.subtotal.toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={() => eliminarDelCarrito(index)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ff4444',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.7rem',
                                borderTop: '1px solid #00ff88',
                                marginTop: '0.5rem'
                            }}>
                                <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>TOTAL</span>
                                <span style={{ color: '#00ff88', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    ${totalCarrito.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Método de pago */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#64748b', fontSize: '0.7rem' }}>MÉTODO DE PAGO</label>
                            <select
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.47rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#e2e8f0',
                                    fontSize: '0.8rem',
                                    marginTop: '0.25rem'
                                }}
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="mixto">Mixto (Efectivo + Transferencia)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            {(metodoPago === 'efectivo' || metodoPago === 'mixto') && (
                                <div style={{ flex: 1 }}>
                                    <label style={{ color: '#64748b', fontSize: '0.7rem' }}>EFECTIVO</label>
                                    <input
                                        type="number"
                                        value={efectivo || ''}
                                        onChange={(e) => setEfectivo(parseFloat(e.target.value) || null)}
                                        placeholder="$0"
                                        style={{
                                            width: '100%',
                                            padding: '0.47rem',
                                            background: '#1a1a1a',
                                            border: '1px solid #1e293b',
                                            borderRadius: '0.47rem',
                                            color: '#e2e8f0',
                                            fontSize: '0.8rem',
                                            marginTop: '0.25rem'
                                        }}
                                    />
                                </div>
                            )}
                            {(metodoPago === 'transferencia' || metodoPago === 'mixto') && (
                                <div style={{ flex: 1 }}>
                                    <label style={{ color: '#64748b', fontSize: '0.7rem' }}>TRANSFERENCIA</label>
                                    <input
                                        type="number"
                                        value={transferencia || ''}
                                        onChange={(e) => setTransferencia(parseFloat(e.target.value) || null)}
                                        placeholder="$0"
                                        style={{
                                            width: '100%',
                                            padding: '0.47rem',
                                            background: '#1a1a1a',
                                            border: '1px solid #1e293b',
                                            borderRadius: '0.47rem',
                                            color: '#e2e8f0',
                                            fontSize: '0.8rem',
                                            marginTop: '0.25rem'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {metodoPago === 'efectivo' && efectivo && (
                            <div style={{
                                padding: '0.5rem',
                                background: '#1a1a1a',
                                borderRadius: '0.47rem',
                                marginBottom: '1rem',
                                textAlign: 'center'
                            }}>
                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>CAMBIO: </span>
                                <span style={{ color: '#00ff88', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    ${Math.max(0, cambio).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#64748b', fontSize: '0.7rem' }}>NOTAS (opcional)</label>
                            <textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Observaciones de la venta..."
                                style={{
                                    width: '100%',
                                    padding: '0.47rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#e2e8f0',
                                    fontSize: '0.8rem',
                                    marginTop: '0.25rem',
                                    resize: 'vertical',
                                    minHeight: '50px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button
                                onClick={handleCrearVenta}
                                disabled={carrito.length === 0}
                                style={{
                                    flex: 1,
                                    padding: '0.6rem',
                                    fontSize: '0.8rem',
                                    background: carrito.length === 0 ? '#1a5a3a' : '#00ff88',
                                    color: carrito.length === 0 ? '#94a3b8' : '#0a0a0a',
                                    border: 'none',
                                    borderRadius: '0.47rem',
                                    cursor: carrito.length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                💾 FINALIZAR VENTA
                            </button>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setCarrito([]);
                                    setEfectivo(null);
                                    setTransferencia(null);
                                    setNotas('');
                                    setSelectedProduct(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.6rem',
                                    background: 'transparent',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                ❌ CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalles de Venta */}
            {showDetallesModal && ventaSeleccionada && (
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
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ color: '#00ff88' }}>📄 DETALLES DE VENTA #{ventaSeleccionada.id}</h3>
                            <button
                                onClick={() => {
                                    setShowDetallesModal(false);
                                    setVentaSeleccionada(null);
                                    setDetallesVenta([]);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {loadingDetalles ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff88' }}>
                                CARGANDO DETALLES...
                            </div>
                        ) : (
                            <>
                                {/* Información de la venta */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.5rem',
                                    background: '#1a1a1a',
                                    padding: '1rem',
                                    borderRadius: '0.47rem',
                                    marginBottom: '1rem'
                                }}>
                                    <div>
                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>FECHA</span>
                                        <p style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                            {formatearFecha(ventaSeleccionada.created_at)}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>TOTAL</span>
                                        <p style={{ color: '#00ff88', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                            ${ventaSeleccionada.total.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>MÉTODO DE PAGO</span>
                                        <p style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                            {ventaSeleccionada.metodo_pago.toUpperCase()}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>ESTADO</span>
                                        <p style={{
                                            color: ventaSeleccionada.anulada ? '#ff4444' : '#00ff88',
                                            fontSize: '0.85rem'
                                        }}>
                                            {ventaSeleccionada.anulada ? '❌ ANULADA' : '✅ ACTIVA'}
                                        </p>
                                    </div>
                                    {ventaSeleccionada.efectivo !== null && (
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>EFECTIVO</span>
                                            <p style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                                ${ventaSeleccionada.efectivo?.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    {ventaSeleccionada.transferencia !== null && (
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>TRANSFERENCIA</span>
                                            <p style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                                ${ventaSeleccionada.transferencia?.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    {ventaSeleccionada.motivo_anulacion && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <span style={{ color: '#ff4444', fontSize: '0.7rem' }}>MOTIVO DE ANULACIÓN</span>
                                            <p style={{ color: '#ff4444', fontSize: '0.85rem' }}>
                                                {ventaSeleccionada.motivo_anulacion}
                                            </p>
                                        </div>
                                    )}
                                    {ventaSeleccionada.notas && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>NOTAS</span>
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                                {ventaSeleccionada.notas}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Tabla de productos */}
                                <h4 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    🛒 PRODUCTOS
                                </h4>
                                <div style={{
                                    border: '1px solid #1a1a1a',
                                    borderRadius: '0.47rem',
                                    overflow: 'auto'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.65rem' }}>Producto</th>
                                                <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.65rem' }}>Cantidad</th>
                                                <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.65rem' }}>Precio Unit.</th>
                                                <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.65rem' }}>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detallesVenta.map((detalle) => (
                                                <tr key={detalle.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                    <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                                                        {detalle.producto?.nombre || 'Producto no encontrado'}
                                                        <div style={{ color: '#64748b', fontSize: '0.6rem' }}>
                                                            SKU: {detalle.producto?.sku || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem' }}>
                                                        {detalle.cantidad}
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem' }}>
                                                        ${detalle.precio_unit.toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', color: '#00ff88' }}>
                                                        ${detalle.subtotal.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr style={{ borderTop: '2px solid #00ff88' }}>
                                                <td colSpan={3} style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#e2e8f0' }}>
                                                    TOTAL
                                                </td>
                                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#00ff88' }}>
                                                    ${ventaSeleccionada.total.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Botones de acción */}
                                <div style={{ display: 'flex', gap: '0.95rem', marginTop: '1rem' }}>
                                    {puedeAnular && !ventaSeleccionada.anulada && (
                                        <button
                                            onClick={() => handleAnularVenta(ventaSeleccionada.id)}
                                            style={{
                                                flex: 1,
                                                padding: '0.6rem',
                                                background: '#ff4444',
                                                color: '#0a0a0a',
                                                border: 'none',
                                                borderRadius: '0.47rem',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            🗑️ ANULAR VENTA
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowDetallesModal(false);
                                            setVentaSeleccionada(null);
                                            setDetallesVenta([]);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '0.6rem',
                                            background: 'transparent',
                                            border: '1px solid #1e293b',
                                            borderRadius: '0.47rem',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        CERRAR
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ventas;