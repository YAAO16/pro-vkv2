import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';

interface Observacion {
    id: number;
    sede_id: number;
    usuario_id: number;
    observacion: string;
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

const Observaciones: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const { usuario: usuarioActual } = useAuthStore();
    const [observaciones, setObservaciones] = useState<Observacion[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Observacion | null>(null);
    const [formData, setFormData] = useState({
        sede_id: '',
        observacion: ''
    });

    // Permisos
    const puedeVer = isAdmin || tienePermiso('observaciones_ver');
    const puedeCrear = isAdmin || tienePermiso('observaciones_crear');

    useEffect(() => {
        if (puedeVer) {
            cargarObservaciones();
            cargarSedes();
        }
    }, [puedeVer]);

    const cargarObservaciones = async () => {
        try {
            let url = '/observaciones/';
            const params: any = {};
            // Si es vendedor, filtrar por su sede
            if (!isAdmin && usuarioActual?.sede_id) {
                params.sede_id = usuarioActual.sede_id;
            }
            const response = await apiClient.get(url, { params });
            setObservaciones(response.data);
        } catch (error) {
            console.error('Error cargando observaciones:', error);
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
                observacion: formData.observacion
            };

            if (editingItem) {
                await apiClient.put(`/observaciones/${editingItem.id}`, data);
                alert('✅ Observación actualizada correctamente');
            } else {
                await apiClient.post('/observaciones/', data);
                alert('✅ Observación creada correctamente');
            }

            setShowModal(false);
            setEditingItem(null);
            resetForm();
            cargarObservaciones();
        } catch (error: any) {
            console.error('Error guardando observación:', error);
            alert(error.response?.data?.detail || 'Error al guardar la observación');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta observación?')) {
            try {
                await apiClient.delete(`/observaciones/${id}`);
                alert('✅ Observación eliminada correctamente');
                cargarObservaciones();
            } catch (error: any) {
                console.error('Error eliminando observación:', error);
                alert(error.response?.data?.detail || 'Error al eliminar la observación');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            sede_id: '',
            observacion: ''
        });
    };

    const openCreateModal = () => {
        setEditingItem(null);
        resetForm();
        // Si es vendedor, asignar su sede automáticamente
        if (!isAdmin && usuarioActual?.sede_id) {
            setFormData(prev => ({ ...prev, sede_id: usuarioActual.sede_id!.toString() }));
        }
        setShowModal(true);
    };

    const openEditModal = (item: Observacion) => {
        setEditingItem(item);
        setFormData({
            sede_id: item.sede_id.toString(),
            observacion: item.observacion
        });
        setShowModal(true);
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

    if (!puedeVer) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>No tienes permiso para ver las observaciones.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO OBSERVACIONES...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>📝 OBSERVACIONES</h3>
                    <p style={styles.subtitle}>Gestión de notas y comentarios por sede</p>
                </div>
                {puedeCrear && (
                    <button onClick={openCreateModal} style={styles.btnPrimary}>
                        + NUEVA OBSERVACIÓN
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div style={styles.tableContainer}>
                {observaciones.length === 0 ? (
                    <div style={styles.emptyState}>No hay observaciones registradas</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Sede</th>
                                <th style={styles.th}>Observación</th>
                                <th style={styles.th}>Creado por</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {observaciones.map((obs) => (
                                <tr key={obs.id} style={styles.tableRow}>
                                    <td style={styles.td}>
                                        <span style={styles.sedeBadge}>
                                            {obs.sede?.nombre || `Sede ${obs.sede_id}`}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.observacionText}>{obs.observacion}</div>
                                    </td>
                                    <td style={styles.td}>
                                        {obs.usuario?.nombre_completo || `Usuario ${obs.usuario_id}`}
                                    </td>
                                    <td style={styles.td}>{formatearFecha(obs.created_at)}</td>
                                    <td style={styles.td}>
                                        {(isAdmin || obs.usuario_id === usuarioActual?.id) && (
                                            <button
                                                onClick={() => openEditModal(obs)}
                                                style={styles.actionBtn}
                                                title="Editar observación"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                        {(isAdmin || obs.usuario_id === usuarioActual?.id) && (
                                            <button
                                                onClick={() => handleDelete(obs.id)}
                                                style={{ ...styles.actionBtn, ...styles.actionDelete }}
                                                title="Eliminar observación"
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

            {/* Modal de Observación */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {editingItem ? '✏️ EDITAR OBSERVACIÓN' : '➕ NUEVA OBSERVACIÓN'}
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
                                <label style={styles.formLabel}>OBSERVACIÓN *</label>
                                <textarea
                                    value={formData.observacion}
                                    onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Escribe la observación aquí..."
                                    rows={5}
                                    required
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
    sedeBadge: {
        background: 'rgba(0, 170, 255, 0.15)',
        color: '#00aaff',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.65rem',
        fontWeight: '600',
        display: 'inline-block',
    },
    observacionText: {
        color: '#e2e8f0',
        fontSize: '0.8rem',
        lineHeight: '1.4',
        maxWidth: '300px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
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
        minHeight: '120px',
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

export default Observaciones;