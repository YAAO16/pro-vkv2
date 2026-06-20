import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';

interface Gasto {
    id: number;
    fecha: string;
    motivo: string;
    valor: number;
    descripcion: string | null;
    sede_id: number;
    usuario_id: number;
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

interface ResumenGastos {
    total_gastos: number;
    total_registros: number;
    gastos_hoy: number;
}

const Gastos: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const { usuario: usuarioActual } = useAuthStore();
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Gasto | null>(null);
    const [resumen, setResumen] = useState<ResumenGastos | null>(null);
    const [filtros, setFiltros] = useState({
        sede_id: '',
        fecha_inicio: '',
        fecha_fin: ''
    });
    const [formData, setFormData] = useState({
        sede_id: '',
        fecha: new Date().toISOString().split('T')[0],
        motivo: '',
        valor: '',
        descripcion: ''
    });

    // Permisos
    const puedeVer = isAdmin || tienePermiso('gastos_ver');
    const puedeCrear = isAdmin || tienePermiso('gastos_crear');
    const puedeEditar = isAdmin || tienePermiso('gastos_editar');
    const puedeEliminar = isAdmin || tienePermiso('gastos_eliminar');

    useEffect(() => {
        if (puedeVer) {
            cargarGastos();
            cargarSedes();
            cargarResumen();
        }
    }, [puedeVer]);

    const cargarGastos = async () => {
        try {
            const params: any = {};
            if (!isAdmin && usuarioActual?.sede_id) {
                params.sede_id = usuarioActual.sede_id;
            }
            if (filtros.sede_id) {
                params.sede_id = filtros.sede_id;
            }
            // Si hay filtros de fechas, se pueden añadir como query params adicionales
            const response = await apiClient.get('/gastos/', { params });
            setGastos(response.data);
        } catch (error) {
            console.error('Error cargando gastos:', error);
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

    const cargarResumen = async () => {
        try {
            const params: any = {};
            if (!isAdmin && usuarioActual?.sede_id) {
                params.sede_id = usuarioActual.sede_id;
            }
            const response = await apiClient.get('/gastos/resumen', { params });
            setResumen(response.data);
        } catch (error) {
            console.error('Error cargando resumen de gastos:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                sede_id: parseInt(formData.sede_id),
                fecha: formData.fecha,
                motivo: formData.motivo,
                valor: parseFloat(formData.valor),
                descripcion: formData.descripcion || undefined
            };

            if (editingItem) {
                await apiClient.put(`/gastos/${editingItem.id}`, data);
                alert('✅ Gasto actualizado correctamente');
            } else {
                await apiClient.post('/gastos/', data);
                alert('✅ Gasto creado correctamente');
            }

            setShowModal(false);
            setEditingItem(null);
            resetForm();
            cargarGastos();
            cargarResumen();
        } catch (error: any) {
            console.error('Error guardando gasto:', error);
            alert(error.response?.data?.detail || 'Error al guardar el gasto');
        }
    };

    const handleDelete = async (id: number) => {
        if (!puedeEliminar) return;
        if (window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
            try {
                await apiClient.delete(`/gastos/${id}`);
                alert('✅ Gasto eliminado correctamente');
                cargarGastos();
                cargarResumen();
            } catch (error: any) {
                console.error('Error eliminando gasto:', error);
                alert(error.response?.data?.detail || 'Error al eliminar el gasto');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            sede_id: '',
            fecha: new Date().toISOString().split('T')[0],
            motivo: '',
            valor: '',
            descripcion: ''
        });
    };

    const openCreateModal = () => {
        setEditingItem(null);
        resetForm();
        if (!isAdmin && usuarioActual?.sede_id) {
            setFormData(prev => ({ ...prev, sede_id: usuarioActual.sede_id!.toString() }));
        }
        setShowModal(true);
    };

    const openEditModal = (item: Gasto) => {
        setEditingItem(item);
        setFormData({
            sede_id: item.sede_id.toString(),
            fecha: item.fecha,
            motivo: item.motivo,
            valor: item.valor.toString(),
            descripcion: item.descripcion || ''
        });
        setShowModal(true);
    };

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const aplicarFiltros = () => {
        cargarGastos();
    };

    const limpiarFiltros = () => {
        setFiltros({ sede_id: '', fecha_inicio: '', fecha_fin: '' });
        // Después de limpiar, recargar los datos
        setTimeout(() => cargarGastos(), 100);
    };

    if (!puedeVer) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>No tienes permiso para ver los gastos.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO GASTOS...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>💸 GASTOS</h3>
                    <p style={styles.subtitle}>Gestión de gastos de la tienda</p>
                </div>
                {puedeCrear && (
                    <button onClick={openCreateModal} style={styles.btnPrimary}>
                        + NUEVO GASTO
                    </button>
                )}
            </div>

            {/* Resumen de Gastos */}
            {resumen && (
                <div style={styles.resumenContainer}>
                    <div style={styles.resumenCard}>
                        <span style={styles.resumenLabel}>Total Gastos</span>
                        <span style={styles.resumenValue}>${formatearMoneda(resumen.total_gastos)}</span>
                    </div>
                    <div style={styles.resumenCard}>
                        <span style={styles.resumenLabel}>Registros</span>
                        <span style={styles.resumenValue}>{resumen.total_registros}</span>
                    </div>
                    <div style={styles.resumenCard}>
                        <span style={styles.resumenLabel}>Gastos de Hoy</span>
                        <span style={{ ...styles.resumenValue, color: '#ffaa00' }}>
                            ${formatearMoneda(resumen.gastos_hoy)}
                        </span>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div style={styles.filtersContainer}>
                {isAdmin && (
                    <select
                        value={filtros.sede_id}
                        onChange={(e) => setFiltros({ ...filtros, sede_id: e.target.value })}
                        style={styles.filterSelect}
                    >
                        <option value="">Todas las sedes</option>
                        {sedes.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                    </select>
                )}
                <input
                    type="date"
                    value={filtros.fecha_inicio}
                    onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                    style={styles.filterInput}
                    placeholder="Fecha inicio"
                />
                <input
                    type="date"
                    value={filtros.fecha_fin}
                    onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                    style={styles.filterInput}
                    placeholder="Fecha fin"
                />
                <button onClick={aplicarFiltros} style={styles.filterButton}>
                    🔍 Filtrar
                </button>
                <button onClick={limpiarFiltros} style={styles.filterButtonClear}>
                    Limpiar
                </button>
                <span style={styles.resultCount}>{gastos.length} registros</span>
            </div>

            {/* Tabla */}
            <div style={styles.tableContainer}>
                {gastos.length === 0 ? (
                    <div style={styles.emptyState}>No hay gastos registrados</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Motivo</th>
                                <th style={styles.th}>Valor</th>
                                <th style={styles.th}>Descripción</th>
                                <th style={styles.th}>Sede</th>
                                <th style={styles.th}>Registrado por</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gastos.map((g) => (
                                <tr key={g.id} style={styles.tableRow}>
                                    <td style={styles.td}>{formatearFecha(g.fecha)}</td>
                                    <td style={styles.td}>
                                        <strong style={{ color: '#e2e8f0' }}>{g.motivo}</strong>
                                    </td>
                                    <td style={{ ...styles.td, color: '#ff4444', fontWeight: 'bold' }}>
                                        -${formatearMoneda(g.valor)}
                                    </td>
                                    <td style={styles.td}>{g.descripcion || '—'}</td>
                                    <td style={styles.td}>
                                        {g.sede?.nombre || `Sede ${g.sede_id}`}
                                    </td>
                                    <td style={styles.td}>
                                        {g.usuario?.nombre_completo || `Usuario ${g.usuario_id}`}
                                    </td>
                                    <td style={styles.td}>
                                        {puedeEditar && (
                                            <button
                                                onClick={() => openEditModal(g)}
                                                style={styles.actionBtn}
                                                title="Editar gasto"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                        {puedeEliminar && (
                                            <button
                                                onClick={() => handleDelete(g.id)}
                                                style={{ ...styles.actionBtn, ...styles.actionDelete }}
                                                title="Eliminar gasto"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Gasto */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {editingItem ? '✏️ EDITAR GASTO' : '➕ NUEVO GASTO'}
                            </h3>
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
                            {isAdmin && (
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
                            )}

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
                                <label style={styles.formLabel}>MOTIVO *</label>
                                <input
                                    type="text"
                                    value={formData.motivo}
                                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: Compra de mercancía"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>VALOR *</label>
                                <input
                                    type="number"
                                    value={formData.valor}
                                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="0"
                                    min="0"
                                    step="100"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>DESCRIPCIÓN</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Detalles adicionales del gasto..."
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
                                {editingItem ? 'ACTUALIZAR' : 'CREAR'}
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
    resumenContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
    },
    resumenCard: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.47rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
    },
    resumenLabel: {
        color: '#64748b',
        fontSize: '0.6rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    resumenValue: {
        color: '#e2e8f0',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        marginTop: '0.15rem',
    },
    filtersContainer: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    filterSelect: {
        padding: '0.4rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '140px',
    },
    filterInput: {
        padding: '0.4rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        width: '140px',
    },
    filterButton: {
        padding: '0.4rem 1rem',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '0.47rem',
        color: '#00ff88',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    filterButtonClear: {
        padding: '0.4rem 1rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    resultCount: {
        color: '#64748b',
        fontSize: '0.75rem',
        marginLeft: 'auto',
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

export default Gastos;