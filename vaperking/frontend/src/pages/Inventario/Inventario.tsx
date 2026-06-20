import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';

interface ProductoDetalle {
    id: number;
    nombre: string;
    sku: string;
    precio_venta: number;
    stock_minimo: number;
    stock_final: number;
}

interface Sede {
    id: number;
    nombre: string;
    ciudad: string;
}

const Inventario: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const { usuario: usuarioActual } = useAuthStore();
    const [productos, setProductos] = useState<ProductoDetalle[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [sedeSeleccionada, setSedeSeleccionada] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductoDetalle | null>(null);
    const [nuevoStock, setNuevoStock] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const puedeVer = isAdmin || tienePermiso('inventario_ver');
    const puedeAjustar = isAdmin || tienePermiso('inventario_ajustar');

    useEffect(() => {
        if (puedeVer) {
            cargarSedes();
        }
    }, [puedeVer]);

    useEffect(() => {
        if (sedeSeleccionada !== null && puedeVer) {
            cargarInventario();
        }
    }, [sedeSeleccionada]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            const sedesData = response.data.sedes || [];
            setSedes(sedesData);

            if (!isAdmin && usuarioActual?.sede_id) {
                setSedeSeleccionada(usuarioActual.sede_id);
            } else if (sedesData.length > 0) {
                setSedeSeleccionada(sedesData[0].id);
            }
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarInventario = async () => {
        if (!sedeSeleccionada) return;
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('/stock-actual', {
                params: { sede_id: sedeSeleccionada }
            });
            setProductos(response.data);
        } catch (error: any) {
            console.error('Error cargando inventario:', error);
            setError(error.response?.data?.detail || 'Error al cargar el inventario');
            setProductos([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAjusteStock = async () => {
        if (!selectedProduct || nuevoStock < 0) {
            alert('La cantidad debe ser mayor o igual a 0');
            return;
        }

        try {
            await apiClient.post('/stock', {
                producto_id: selectedProduct.id,
                stock_final: nuevoStock,
                sede_id: sedeSeleccionada
            });
            alert('✅ Stock actualizado correctamente');
            setShowModal(false);
            setSelectedProduct(null);
            cargarInventario();
        } catch (error: any) {
            console.error('Error ajustando stock:', error);
            alert(error.response?.data?.detail || 'Error al ajustar el stock');
        }
    };

    const openAjusteModal = (producto: ProductoDetalle) => {
        setSelectedProduct(producto);
        setNuevoStock(producto.stock_final);
        setShowModal(true);
    };

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const getStockStatus = (stock: number, min: number) => {
        if (stock === 0) return { label: 'AGOTADO', color: '#ff4444' };
        if (stock <= min) return { label: 'CRÍTICO', color: '#ffaa00' };
        if (stock <= min * 2) return { label: 'BAJO', color: '#ffaa00' };
        return { label: 'NORMAL', color: '#00ff88' };
    };

    if (!puedeVer) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>No tienes permiso para ver el inventario.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO INVENTARIO...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <span style={styles.errorIcon}>⚠️</span>
                <p style={styles.errorText}>{error}</p>
                <button onClick={cargarInventario} style={styles.errorButton}>Reintentar</button>
            </div>
        );
    }

    const productosCriticos = productos.filter(p => p.stock_final <= p.stock_minimo);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>📦 INVENTARIO</h3>
                    <p style={styles.subtitle}>Gestión de stock por sede</p>
                </div>
                {isAdmin && (
                    <div style={styles.headerActions}>
                        <select
                            value={sedeSeleccionada || ''}
                            onChange={(e) => setSedeSeleccionada(parseInt(e.target.value))}
                            style={styles.sedeSelect}
                        >
                            {sedes.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {productosCriticos.length > 0 && (
                <div style={styles.alertBanner}>
                    <span style={styles.alertIcon}>⚠️</span>
                    <span style={styles.alertText}>
                        <strong>{productosCriticos.length}</strong> producto(s) con stock crítico o bajo.
                        {puedeAjustar && ' Revisa los productos marcados en amarillo o rojo.'}
                    </span>
                </div>
            )}

            <div style={styles.tableContainer}>
                {productos.length === 0 ? (
                    <div style={styles.emptyState}>No hay productos registrados en esta sede.</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>SKU</th>
                                <th style={styles.th}>Producto</th>
                                <th style={styles.th}>Precio Venta</th>
                                <th style={styles.th}>Stock Actual</th>
                                <th style={styles.th}>Stock Mínimo</th>
                                <th style={styles.th}>Estado</th>
                                {puedeAjustar && <th style={styles.th}>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map((p) => {
                                const status = getStockStatus(p.stock_final, p.stock_minimo);
                                return (
                                    <tr key={p.id} style={styles.tableRow}>
                                        <td style={styles.td}>
                                            <span style={styles.skuBadge}>{p.sku}</span>
                                        </td>
                                        <td style={styles.td}>
                                            <strong style={{ color: '#e2e8f0' }}>{p.nombre}</strong>
                                        </td>
                                        <td style={styles.td}>
                                            ${formatearMoneda(p.precio_venta)}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>
                                            <span style={{ color: status.color, fontSize: '0.9rem' }}>
                                                {p.stock_final}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            {p.stock_minimo}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                background: `${status.color}22`,
                                                color: status.color,
                                                border: `1px solid ${status.color}44`
                                            }}>
                                                {status.label}
                                            </span>
                                        </td>
                                        {puedeAjustar && (
                                            <td style={styles.td}>
                                                <button
                                                    onClick={() => openAjusteModal(p)}
                                                    style={styles.actionBtn}
                                                    title="Ajustar stock"
                                                >
                                                    ✏️
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && selectedProduct && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>✏️ AJUSTAR STOCK</h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedProduct(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.productInfo}>
                                <div style={styles.productInfoItem}>
                                    <span style={styles.productInfoLabel}>Producto</span>
                                    <span style={styles.productInfoValue}>{selectedProduct.nombre}</span>
                                </div>
                                <div style={styles.productInfoItem}>
                                    <span style={styles.productInfoLabel}>SKU</span>
                                    <span style={styles.productInfoValue}>{selectedProduct.sku}</span>
                                </div>
                                <div style={styles.productInfoItem}>
                                    <span style={styles.productInfoLabel}>Stock Actual</span>
                                    <span style={styles.productInfoValue}>{selectedProduct.stock_final}</span>
                                </div>
                                <div style={styles.productInfoItem}>
                                    <span style={styles.productInfoLabel}>Stock Mínimo</span>
                                    <span style={styles.productInfoValue}>{selectedProduct.stock_minimo}</span>
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>NUEVO STOCK *</label>
                                <input
                                    type="number"
                                    value={nuevoStock}
                                    onChange={(e) => setNuevoStock(parseInt(e.target.value) || 0)}
                                    style={styles.formInput}
                                    min="0"
                                    required
                                />
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedProduct(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button onClick={handleAjusteStock} style={styles.btnSave}>
                                ACTUALIZAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============= ESTILOS =============
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '0.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '1rem',
    },
    loadingSpinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #1a1a1a',
        borderTop: '3px solid #00ff88',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        color: '#00ff88',
        fontSize: '1.2rem',
        letterSpacing: '2px',
    },
    errorContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '1rem',
        background: 'rgba(255, 68, 68, 0.05)',
        borderRadius: '0.95rem',
        border: '1px solid rgba(255, 68, 68, 0.2)',
    },
    errorIcon: {
        fontSize: '3rem',
    },
    errorText: {
        color: '#ff4444',
        fontSize: '1rem',
        textAlign: 'center',
    },
    errorButton: {
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '0.47rem',
        color: '#ff4444',
        padding: '0.5rem 1.5rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'all 0.2s ease',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    title: {
        color: '#00ff88',
        fontSize: '1.3rem',
        margin: 0,
    },
    subtitle: {
        color: '#64748b',
        fontSize: '0.8rem',
        margin: '0.25rem 0 0 0',
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    sedeSelect: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '180px',
    },
    alertBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255, 170, 0, 0.1)',
        border: '1px solid rgba(255, 170, 0, 0.2)',
        borderRadius: '0.47rem',
        marginBottom: '1.5rem',
    },
    alertIcon: {
        fontSize: '1.5rem',
    },
    alertText: {
        color: '#e2e8f0',
        fontSize: '0.85rem',
    },
    tableContainer: {
        overflow: 'auto',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        background: '#0f0f0f',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.8rem',
    },
    tableHeader: {
        borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a',
    },
    th: {
        padding: '0.7rem 0.7rem',
        textAlign: 'left',
        color: '#64748b',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '600',
        position: 'sticky',
        top: 0,
        background: '#0a0a0a',
        zIndex: 1,
    },
    td: {
        padding: '0.5rem 0.7rem',
        borderBottom: '1px solid #1a1a1a',
        fontSize: '0.75rem',
        verticalAlign: 'middle',
    },
    tableRow: {
        transition: 'background 0.2s ease',
    },
    emptyState: {
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem',
    },
    skuBadge: {
        background: '#1a1a1a',
        padding: '0.15rem 0.4rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
    statusBadge: {
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        fontWeight: '600',
        display: 'inline-block',
    },
    actionBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.25rem',
        transition: 'transform 0.2s ease',
        margin: '0 0.15rem',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
    },
    modalContent: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        animation: 'fadeIn 0.3s ease',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.2rem 1.5rem',
        borderBottom: '1px solid #1a1a1a',
        position: 'sticky',
        top: 0,
        background: '#0f0f0f',
        zIndex: 1,
    },
    modalTitle: {
        color: '#00ff88',
        fontSize: '1.1rem',
        margin: 0,
    },
    modalClose: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        fontSize: '1.2rem',
        cursor: 'pointer',
        padding: '0.25rem',
    },
    modalBody: {
        padding: '1.5rem',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #1a1a1a',
        position: 'sticky',
        bottom: 0,
        background: '#0f0f0f',
    },
    formGroup: {
        marginBottom: '1rem',
    },
    formLabel: {
        display: 'block',
        color: '#94a3b8',
        fontSize: '0.7rem',
        marginBottom: '0.25rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    formInput: {
        width: '100%',
        padding: '0.5rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
    },
    btnCancel: {
        padding: '0.5rem 1.5rem',
        background: 'transparent',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'all 0.2s ease',
    },
    btnSave: {
        padding: '0.5rem 1.5rem',
        background: '#00ff88',
        color: '#0a0a0a',
        border: 'none',
        borderRadius: '0.47rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        transition: 'all 0.2s ease',
    },
    accesoDenegado: {
        padding: '2rem',
        textAlign: 'center',
        color: '#ff4444',
    },
    productInfo: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        padding: '0.75rem',
        background: '#1a1a1a',
        borderRadius: '0.47rem',
        marginBottom: '1rem',
    },
    productInfoItem: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.15rem',
    },
    productInfoLabel: {
        color: '#64748b',
        fontSize: '0.6rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    productInfoValue: {
        color: '#e2e8f0',
        fontSize: '0.85rem',
        fontWeight: '500',
    },
};

export default Inventario;