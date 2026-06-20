import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';

interface Sede {
    id: number;
    nombre: string;
    ciudad: string;
    direccion: string | null;
    telefono: string | null;
    activo: boolean;
    created_at: string;
}

const Sedes: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSede, setEditingSede] = useState<Sede | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        ciudad: '',
        direccion: '',
        telefono: ''
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sedeAEliminar, setSedeAEliminar] = useState<Sede | null>(null);

    // Verificar permisos
    const puedeCrear = isAdmin || tienePermiso('sedes_crear');
    const puedeEditar = isAdmin || tienePermiso('sedes_editar');
    const puedeEliminar = isAdmin || tienePermiso('sedes_eliminar');

    useEffect(() => {
        cargarSedes();
    }, []);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes || []);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                nombre: formData.nombre,
                ciudad: formData.ciudad,
                direccion: formData.direccion || undefined,
                telefono: formData.telefono || undefined
            };

            if (editingSede) {
                await apiClient.put(`/sedes/${editingSede.id}`, data);
                alert('✅ Sede actualizada correctamente');
            } else {
                await apiClient.post('/sedes/', data);
                alert('✅ Sede creada correctamente');
            }

            setShowModal(false);
            setEditingSede(null);
            resetForm();
            cargarSedes();
        } catch (error: any) {
            console.error('Error guardando sede:', error);
            alert(error.response?.data?.detail || 'Error al guardar la sede');
        }
    };

    const handleDelete = async () => {
        if (!sedeAEliminar) return;
        try {
            await apiClient.delete(`/sedes/${sedeAEliminar.id}`);
            alert('✅ Sede desactivada correctamente');
            setShowDeleteModal(false);
            setSedeAEliminar(null);
            cargarSedes();
        } catch (error: any) {
            console.error('Error eliminando sede:', error);
            alert(error.response?.data?.detail || 'Error al eliminar la sede');
        }
    };

    const openEditModal = (sede: Sede) => {
        setEditingSede(sede);
        setFormData({
            nombre: sede.nombre,
            ciudad: sede.ciudad,
            direccion: sede.direccion || '',
            telefono: sede.telefono || ''
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingSede(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            ciudad: '',
            direccion: '',
            telefono: ''
        });
    };

    const openDeleteModal = (sede: Sede) => {
        setSedeAEliminar(sede);
        setShowDeleteModal(true);
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO SEDES...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>Solo los administradores pueden gestionar sedes.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🏢 GESTIÓN DE SEDES</h3>
                    <p style={styles.subtitle}>Administra las sedes de la empresa</p>
                </div>
                {puedeCrear && (
                    <button onClick={openCreateModal} style={styles.btnPrimary}>
                        + NUEVA SEDE
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div style={styles.tableContainer}>
                {sedes.length === 0 ? (
                    <div style={styles.emptyState}>No hay sedes registradas</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Nombre</th>
                                <th style={styles.th}>Ciudad</th>
                                <th style={styles.th}>Dirección</th>
                                <th style={styles.th}>Teléfono</th>
                                <th style={styles.th}>Estado</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sedes.map((s) => (
                                <tr key={s.id} style={styles.tableRow}>
                                    <td style={styles.td}>{s.id}</td>
                                    <td style={styles.td}>
                                        <strong style={{ color: '#e2e8f0' }}>{s.nombre}</strong>
                                    </td>
                                    <td style={styles.td}>{s.ciudad}</td>
                                    <td style={styles.td}>{s.direccion || '—'}</td>
                                    <td style={styles.td}>{s.telefono || '—'}</td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.estadoBadge,
                                            ...(s.activo ? styles.estadoActivo : styles.estadoInactivo)
                                        }}>
                                            {s.activo ? '✅ Activa' : '❌ Inactiva'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        {puedeEditar && (
                                            <button
                                                onClick={() => openEditModal(s)}
                                                style={styles.actionBtn}
                                                title="Editar sede"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                        {puedeEliminar && (
                                            <button
                                                onClick={() => openDeleteModal(s)}
                                                style={{ ...styles.actionBtn, ...styles.actionDelete }}
                                                title="Desactivar sede"
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

            {/* Modal de Sede */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {editingSede ? '✏️ EDITAR SEDE' : '➕ NUEVA SEDE'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingSede(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>NOMBRE *</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: Sede Principal"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>CIUDAD *</label>
                                <input
                                    type="text"
                                    value={formData.ciudad}
                                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: Villagarzón"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>DIRECCIÓN</label>
                                <input
                                    type="text"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Calle Principal #123"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>TELÉFONO</label>
                                <input
                                    type="text"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="3123456789"
                                />
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingSede(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button onClick={handleSubmit} style={styles.btnSave}>
                                {editingSede ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {showDeleteModal && sedeAEliminar && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '400px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ ...styles.modalTitle, color: '#ff4444' }}>⚠️ CONFIRMAR DESACTIVACIÓN</h3>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSedeAEliminar(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={styles.deleteText}>
                                ¿Estás seguro de que deseas desactivar la sede <strong>"{sedeAEliminar.nombre}"</strong>?
                            </p>
                            <p style={styles.deleteSubtext}>
                                Los usuarios asociados a esta sede no se eliminarán, pero quedarán sin sede asignada.
                            </p>
                        </div>
                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSedeAEliminar(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button onClick={handleDelete} style={styles.btnDanger}>
                                DESACTIVAR
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
    estadoBadge: {
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        fontWeight: '600',
        display: 'inline-block',
    },
    estadoActivo: {
        background: 'rgba(0, 255, 136, 0.15)',
        color: '#00ff88',
    },
    estadoInactivo: {
        background: 'rgba(255, 68, 68, 0.15)',
        color: '#ff4444',
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
    btnDanger: {
        padding: '0.5rem 1.5rem',
        background: '#ff4444',
        color: '#0a0a0a',
        border: 'none',
        borderRadius: '0.47rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        transition: 'all 0.2s ease',
    },
    deleteText: {
        color: '#e2e8f0',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    deleteSubtext: {
        color: '#64748b',
        fontSize: '0.8rem',
        textAlign: 'center',
        marginTop: '0.5rem',
    },
    accesoDenegado: {
        padding: '2rem',
        textAlign: 'center',
        color: '#ff4444',
    },
};

export default Sedes;