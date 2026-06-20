import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';

interface ProductoDanado {
    id: number;
    sede_id: number;
    usuario_id: number;
    fecha: string;
    nombre_producto: string;
    cantidad: number;
    motivo: string | null;
    created_at: string;
    updated_at: string;
    sede?: { nombre: string };
    usuario?: { nombre_completo: string };
}

interface Sede {
    id: number;
    nombre: string;
    ciudad: string;
}

const ProductosDanados: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const { usuario: usuarioActual } = useAuthStore();
    const [danados, setDanados] = useState<ProductoDanado[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ProductoDanado | null>(null);
    const [formData, setFormData] = useState({
        sede_id: '',
        fecha: new Date().toISOString().split('T')[0],
        nombre_producto: '',
        cantidad: 1,
        motivo: ''
    });

    // Permisos
    const puedeVer = isAdmin || tienePermiso('danados_ver');
    const puedeCrear = isAdmin || tienePermiso('danados_crear');
    const puedeEliminar = isAdmin || tienePermiso('danados_eliminar');

    useEffect(() => {
        if (puedeVer) {
            cargarDanados();
            cargarSedes();
        }
    }, [puedeVer]);

    const cargarDanados = async () => {
        try {
            const response = await apiClient.get('/productos-danados/');
            setDanados(response.data);
        } catch (error) {
            console.error('Error cargando productos dañados:', error);
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

    const handleSubmit = async () => {
        try {
            const data = {
                sede_id: parseInt(formData.sede_id),
                fecha: formData.fecha,
                nombre_producto: formData.nombre_producto,
                cantidad: parseInt(formData.cantidad.toString()),
                motivo: formData.motivo || undefined
            };

            if (editingItem) {
                // Editar no está implementado en el backend, pero lo dejamos por si acaso
                // await apiClient.put(`/productos-danados/${editingItem.id}`, data);
                alert('La edición de productos dañados no está disponible actualmente');
                return;
            } else {
                await apiClient.post('/productos-danados/', data);
                alert('✅ Producto dañado registrado correctamente');
            }

            setShowModal(false);
            setEditingItem(null);
            resetForm();
            cargarDanados();
        } catch (error: any) {
            console.error('Error guardando producto dañado:', error);
            alert(error.response?.data?.detail || 'Error al guardar el registro');
        }
    };

    const handleDelete = async (id: number) => {
        if (!puedeEliminar) return;
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            try {
                await apiClient.delete(`/productos-danados/${id}`);
                alert('✅ Registro eliminado correctamente');
                cargarDanados();
            } catch (error: any) {
                console.error('Error eliminando registro:', error);
                alert(error.response?.data?.detail || 'Error al eliminar el registro');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            sede_id: '',
            fecha: new Date().toISOString().split('T')[0],
            nombre_producto: '',
            cantidad: 1,
            motivo: ''
        });
    };

    const openCreateModal = () => {
        setEditingItem(null);
        resetForm();
        // Si el usuario es vendedor, asignar su sede automáticamente
        if (usuarioActual?.sede_id) {
            setFormData(prev => ({ ...prev, sede_id: usuarioActual.sede_id!.toString() }));
        }
        setShowModal(true);
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (!puedeVer) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>No tienes permiso para ver los productos dañados.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO PRODUCTOS DAÑADOS...</div>
            </div>
        );
    }

    // Filtrar por sede si es vendedor
    const danadosFiltrados = danados.filter(d => {
        if (usuarioActual?.sede_id && !isAdmin) {
            return d.sede_id === usuarioActual.sede_id;
        }
        return true;
    });

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🔨 PRODUCTOS DAÑADOS</h3>
                    <p style={styles.subtitle}>Registro de productos que han sufrido daños</p>
                </div>
                {puedeCrear && (
                    <button onClick={openCreateModal} style={styles.btnPrimary}>
                        + REGISTRAR DAÑO
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div style={styles.tableContainer}>
                {danadosFiltrados.length === 0 ? (
                    <div style={styles.emptyState}>No hay productos dañados registrados</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Sede</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Producto</th>
                                <th style={styles.th}>Cantidad</th>
                                <th style={styles.th}>Motivo</th>
                                <th style={styles.th}>Registrado por</th>
                                {puedeEliminar && <th style={styles.th}>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {danadosFiltrados.map((d) => (
                                <tr key={d.id} style={styles.tableRow}>
                                    <td style={styles.td}>{d.id}</td>
                                    <td style={styles.td}>
                                        {d.sede?.nombre || `Sede ${d.sede_id}`}
                                    </td>
                                    <td style={styles.td}>{formatearFecha(d.fecha)}</td>
                                    <td style={styles.td}>
                                        <strong style={{ color: '#e2e8f0' }}>{d.nombre_producto}</strong>
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <span style={styles.cantidadBadge}>{d.cantidad}</span>
                                    </td>
                                    <td style={styles.td}>{d.motivo || '—'}</td>
                                    <td style={styles.td}>
                                        {d.usuario?.nombre_completo || `Usuario ${d.usuario_id}`}
                                    </td>
                                    {puedeEliminar && (
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleDelete(d.id)}
                                                style={{ ...styles.actionBtn, ...styles.actionDelete }}
                                                title="Eliminar registro"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Registro */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>➕ REGISTRAR PRODUCTO DAÑADO</h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingItem(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>SEDE *</label>
                                <select
                                    value={formData.sede_id}
                                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                                    style={styles.formSelect}
                                    required
                                >
                                    <option value="">Seleccionar sede...</option>
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>FECHA *</label>
                                <input
                                    type="date"
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    style={styles.formInput}
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>NOMBRE DEL PRODUCTO *</label>
                                <input
                                    type="text"
                                    value={formData.nombre_producto}
                                    onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: Vaporesso XROS 3"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>CANTIDAD *</label>
                                <input
                                    type="number"
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
                                    style={styles.formInput}
                                    min="1"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>MOTIVO</label>
                                <textarea
                                    value={formData.motivo}
                                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Ej: Golpe, defecto de fábrica, derrame, etc."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingItem(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button onClick={handleSubmit} style={styles.btnSave}>
                                REGISTRAR
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
    btnPrimary: {
        background: '#00ff88',
        color: '#0a0a0a',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '0.47rem',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.8rem',
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
    cantidadBadge: {
        background: 'rgba(255, 170, 0, 0.15)',
        color: '#ffaa00',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.65rem',
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
    actionDelete: {
        color: '#ff4444',
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
        maxWidth: '550px',
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
    formSelect: {
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
    formTextarea: {
        width: '100%',
        padding: '0.5rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        minHeight: '60px',
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
};

export default ProductosDanados;