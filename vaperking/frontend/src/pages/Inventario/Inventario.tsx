import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';

interface ProductoStock {
    producto_id: number;
    sku: string;
    nombre: string;
    stock_actual: number;
    stock_minimo: number;
    alerta: boolean;
}

const Inventario: React.FC = () => {
    const { usuario } = useAuthStore();
    const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'ADMIN';
    const sedeId: number | null = usuario?.sede_id ?? null;
    const sedeNombre = (usuario as any)?.sede_nombre || ''; // Solución temporal para sede_nombre

    const [productos, setProductos] = useState<ProductoStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSede, setSelectedSede] = useState<number | null>(null);
    const [sedes, setSedes] = useState<any[]>([]);
    const [showAjusteModal, setShowAjusteModal] = useState(false);
    const [selectedProducto, setSelectedProducto] = useState<ProductoStock | null>(null);
    const [cantidadAjuste, setCantidadAjuste] = useState(0);
    const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'salida'>('entrada');
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        cargarInventario();
        if (isAdmin) {
            cargarSedes();
        }
    }, [selectedSede]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            const sedesData = response.data.sedes || response.data;
            setSedes(Array.isArray(sedesData) ? sedesData : []);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarInventario = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Para admin, si no hay sede seleccionada, usar stock total
            if (isAdmin && selectedSede === null) {
                const response = await apiClient.get('/stock-total');
                setProductos(response.data);
            } 
            // Para vendedor o admin con sede específica
            else {
                const sede = selectedSede || sedeId;
                if (!sede) {
                    setProductos([]);
                    return;
                }
                const response = await apiClient.get('/stock-actual', { 
                    params: { sede_id: sede } 
                });
                setProductos(response.data);
            }
        } catch (error: any) {
            console.error('Error cargando inventario:', error);
            setError(error.response?.data?.detail || 'Error al cargar el inventario');
        } finally {
            setLoading(false);
        }
    };

    const handleAjuste = async () => {
        if (!selectedProducto || cantidadAjuste <= 0) {
            setError('Ingrese una cantidad válida');
            setTimeout(() => setError(''), 3000);
            return;
        }

        try {
            const sede = selectedSede || sedeId;
            if (!sede) {
                setError('No se ha seleccionado una sede');
                setTimeout(() => setError(''), 3000);
                return;
            }

            await apiClient.post('/ajuste', {
                sede_id: sede,
                producto_id: selectedProducto.producto_id,
                cantidad: cantidadAjuste,
                tipo: tipoAjuste,
                motivo: motivo || undefined
            });
            
            setShowAjusteModal(false);
            setSelectedProducto(null);
            setCantidadAjuste(0);
            setMotivo('');
            setSuccess('Ajuste realizado exitosamente');
            setTimeout(() => setSuccess(''), 3000);
            await cargarInventario();
        } catch (error: any) {
            console.error('Error realizando ajuste:', error);
            setError(error.response?.data?.detail || 'Error al realizar el ajuste');
            setTimeout(() => setError(''), 3000);
        }
    };

    const getStockStatus = (stock: number, minimo: number) => {
        if (stock === 0) return { color: '#ff4444', text: 'Sin stock', icon: '❌' };
        if (stock < minimo) return { color: '#ffaa00', text: 'Bajo stock', icon: '⚠️' };
        return { color: '#00ff88', text: 'OK', icon: '✅' };
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff88' }}>CARGANDO INVENTARIO...</div>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header con selector de sede */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.2rem' }}>📦 INVENTARIO</h3>
                {isAdmin && sedes.length > 0 && (
                    <select
                        value={selectedSede === null ? -1 : selectedSede}
                        onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setSelectedSede(value === -1 ? null : value);
                        }}
                        style={{
                            padding: '0.5rem',
                            background: '#0a0a0a',
                            border: '1px solid #1e293b',
                            borderRadius: '0.5rem',
                            color: 'white',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value={-1}>🌍 Todas las sedes</option>
                        {sedes.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Mensajes */}
            {error && <div style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>❌ {error}</div>}
            {success && <div style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid #00ff88', color: '#00ff88', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>✅ {success}</div>}

            {/* Info de sede para no admin */}
            {!isAdmin && sedeNombre && (
                <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(0,255,136,0.1)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#00ff88' }}>
                    📍 Sede: {sedeNombre}
                </div>
            )}

            {/* Tabla de inventario */}
            {productos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No hay productos registrados
                </div>
            ) : (
                <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>SKU</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Producto</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Stock Actual</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Stock Mínimo</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Estado</th>
                                {isAdmin && (
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map((p) => {
                                const status = getStockStatus(p.stock_actual, p.stock_minimo);
                                return (
                                    <tr key={p.producto_id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                        <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>{p.sku}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.75rem' }}>
                                            <div><strong>{p.nombre}</strong></div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>ID: {p.producto_id}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: status.color }}>
                                            {p.stock_actual}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem' }}>{p.stock_minimo}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>
                                            <span style={{ color: status.color }}>
                                                {status.icon} {status.text}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProducto(p);
                                                        setShowAjusteModal(true);
                                                    }}
                                                    style={{
                                                        background: '#00ff88',
                                                        border: 'none',
                                                        borderRadius: '0.25rem',
                                                        padding: '0.25rem 0.5rem',
                                                        cursor: 'pointer',
                                                        color: '#000',
                                                        fontSize: '0.7rem'
                                                    }}
                                                >
                                                    ✏️ Ajustar
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Ajuste - SOLO PARA ADMIN */}
            {isAdmin && showAjusteModal && selectedProducto && (
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
                        borderRadius: '1rem',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '450px'
                    }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '1rem' }}>✏️ Ajustar Stock</h3>
                        <p style={{ marginBottom: '1rem' }}>Producto: <strong>{selectedProducto.nombre}</strong></p>
                        <p style={{ marginBottom: '1rem' }}>Stock actual: <strong style={{ color: '#00ff88' }}>{selectedProducto.stock_actual}</strong></p>
                        <p style={{ marginBottom: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                            Stock mínimo: <strong>{selectedProducto.stock_minimo}</strong>
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>TIPO DE AJUSTE</label>
                            <select
                                value={tipoAjuste}
                                onChange={(e) => setTipoAjuste(e.target.value as 'entrada' | 'salida')}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.8rem'
                                }}
                            >
                                <option value="entrada">➕ Entrada (agregar stock)</option>
                                <option value="salida">➖ Salida (quitar stock)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>CANTIDAD</label>
                            <input
                                type="number"
                                value={cantidadAjuste}
                                onChange={(e) => setCantidadAjuste(parseInt(e.target.value) || 0)}
                                min={1}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.8rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>MOTIVO (opcional)</label>
                            <input
                                type="text"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ej: Compra a proveedor, merma, etc."
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#1a1a1a',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.8rem'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={handleAjuste} style={{ flex: 1, padding: '0.5rem', background: '#00ff88', border: 'none', borderRadius: '0.5rem', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}>
                                CONFIRMAR
                            </button>
                            <button
                                onClick={() => {
                                    setShowAjusteModal(false);
                                    setSelectedProducto(null);
                                    setCantidadAjuste(0);
                                    setMotivo('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: 'transparent',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.5rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer'
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

export default Inventario;