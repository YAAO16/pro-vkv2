import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';

interface Cierre {
    id: number;
    sede_id: number;
    fecha: string;
    balance_sistema: number;
    efectivo_reportado: number;
    transferencia_reportada: number;
    diferencia: number;
    cerrado_por: number | null;
    observaciones: string | null;
    created_at: string;
    sede?: { nombre: string };
    usuario?: { nombre_completo: string };
}

interface PreviewCierre {
    fecha: string;
    sede_id: number;
    balance_sistema: number;
    total_ventas: number;
    efectivo: number;
    transferencia: number;
    total_gastos: number;
    numero_ventas: number;
}

interface Sede {
    id: number;
    nombre: string;
    ciudad: string;
}

const Cierres: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const { usuario: usuarioActual } = useAuthStore();
    const [cierres, setCierres] = useState<Cierre[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSede, setSelectedSede] = useState<number | null>(null);
    const [selectedFecha, setSelectedFecha] = useState<string>('');
    const [previewData, setPreviewData] = useState<PreviewCierre | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [formData, setFormData] = useState({
        sede_id: '',
        fecha: '',
        efectivo_reportado: '',
        transferencia_reportada: '',
        observaciones: ''
    });
    const [error, setError] = useState<string | null>(null);

    // Permisos
    const puedeVer = isAdmin || tienePermiso('cierres_ver');
    const puedeCrear = isAdmin || tienePermiso('cierres_crear');

    // Inicializar fecha actual
    useEffect(() => {
        const hoy = new Date().toISOString().split('T')[0];
        setSelectedFecha(hoy);
    }, []);

    useEffect(() => {
        if (puedeVer) {
            cargarCierres();
            cargarSedes();
        }
    }, [puedeVer]);

    // Si es vendedor, establecer su sede automáticamente
    useEffect(() => {
        if (!isAdmin && usuarioActual?.sede_id) {
            setSelectedSede(usuarioActual.sede_id);
        }
    }, [isAdmin, usuarioActual]);

    const cargarCierres = async () => {
        try {
            const params: any = {};
            if (!isAdmin && usuarioActual?.sede_id) {
                params.sede_id = usuarioActual.sede_id;
            }
            const response = await apiClient.get('/cierres/', { params });
            setCierres(response.data);
        } catch (error) {
            console.error('Error cargando cierres:', error);
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

    const handlePreview = async () => {
        // Validar que se haya seleccionado sede y fecha
        if (!selectedSede) {
            alert('Selecciona una sede');
            return;
        }
        if (!selectedFecha) {
            alert('Selecciona una fecha');
            return;
        }

        try {
            setPreviewLoading(true);
            setError(null);
            const response = await apiClient.get('/cierres/preview', {
                params: {
                    sede_id: selectedSede,
                    fecha: selectedFecha
                }
            });
            setPreviewData(response.data);
            // Prellenar formulario de creación con los datos del preview
            setFormData({
                sede_id: selectedSede.toString(),
                fecha: selectedFecha,
                efectivo_reportado: response.data.efectivo?.toString() || '0',
                transferencia_reportada: response.data.transferencia?.toString() || '0',
                observaciones: ''
            });
            setShowPreviewModal(true);
        } catch (error: any) {
            console.error('Error en preview:', error);
            setError(error.response?.data?.detail || 'Error al obtener la previsualización');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleCreateCierre = async () => {
        try {
            const data = {
                sede_id: parseInt(formData.sede_id),
                fecha: formData.fecha,
                efectivo_reportado: parseFloat(formData.efectivo_reportado) || 0,
                transferencia_reportada: parseFloat(formData.transferencia_reportada) || 0,
                observaciones: formData.observaciones || undefined
            };

            await apiClient.post('/cierres/', data);
            alert('✅ Cierre realizado correctamente');
            setShowCreateModal(false);
            setShowPreviewModal(false);
            setPreviewData(null);
            cargarCierres();
        } catch (error: any) {
            console.error('Error creando cierre:', error);
            alert(error.response?.data?.detail || 'Error al realizar el cierre');
        }
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

    const formatearFechaHora = (fecha: string) => {
        return new Date(fecha).toLocaleString('es-CO', {
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
                <p>No tienes permiso para ver los cierres.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO CIERRES...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🔒 CIERRES DIARIOS</h3>
                    <p style={styles.subtitle}>Gestión de cierres de caja por sede</p>
                </div>
                {puedeCrear && (
                    <div style={styles.headerActions}>
                        {/* Selector de Sede (solo admin) */}
                        {isAdmin && (
                            <select
                                value={selectedSede || ''}
                                onChange={(e) => setSelectedSede(e.target.value ? parseInt(e.target.value) : null)}
                                style={styles.filterSelect}
                            >
                                <option value="">Seleccionar sede...</option>
                                {sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre} ({s.ciudad})</option>
                                ))}
                            </select>
                        )}

                        {/* Selector de Fecha */}
                        <input
                            type="date"
                            value={selectedFecha}
                            onChange={(e) => setSelectedFecha(e.target.value)}
                            style={styles.filterInput}
                        />

                        <button
                            onClick={handlePreview}
                            disabled={!selectedSede || !selectedFecha}
                            style={{
                                ...styles.btnPrimary,
                                opacity: (!selectedSede || !selectedFecha) ? 0.5 : 1,
                                cursor: (!selectedSede || !selectedFecha) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            📋 PREVISUALIZAR CIERRE
                        </button>
                    </div>
                )}
            </div>

            {/* Tabla de Cierres */}
            <div style={styles.tableContainer}>
                {cierres.length === 0 ? (
                    <div style={styles.emptyState}>No hay cierres registrados</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Sede</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Balance Sistema</th>
                                <th style={styles.th}>Efectivo</th>
                                <th style={styles.th}>Transferencia</th>
                                <th style={styles.th}>Diferencia</th>
                                <th style={styles.th}>Cerrado por</th>
                                <th style={styles.th}>Fecha Cierre</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cierres.map((c) => (
                                <tr key={c.id} style={styles.tableRow}>
                                    <td style={styles.td}>
                                        {c.sede?.nombre || `Sede ${c.sede_id}`}
                                    </td>
                                    <td style={styles.td}>{formatearFecha(c.fecha)}</td>
                                    <td style={{ ...styles.td, color: '#00ff88', fontWeight: 'bold' }}>
                                        ${formatearMoneda(c.balance_sistema)}
                                    </td>
                                    <td style={styles.td}>${formatearMoneda(c.efectivo_reportado)}</td>
                                    <td style={styles.td}>${formatearMoneda(c.transferencia_reportada)}</td>
                                    <td style={{
                                        ...styles.td,
                                        color: c.diferencia === 0 ? '#00ff88' : c.diferencia > 0 ? '#ffaa00' : '#ff4444',
                                        fontWeight: 'bold'
                                    }}>
                                        ${formatearMoneda(c.diferencia)}
                                    </td>
                                    <td style={styles.td}>
                                        {c.usuario?.nombre_completo || `Usuario ${c.cerrado_por}`}
                                    </td>
                                    <td style={styles.td}>{formatearFechaHora(c.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Previsualización */}
            {showPreviewModal && previewData && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>📋 PREVISUALIZACIÓN DE CIERRE</h3>
                            <button
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setPreviewData(null);
                                    setError(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            {previewLoading ? (
                                <div style={styles.loadingContainer}>
                                    <div style={styles.loadingSpinner}></div>
                                    <div style={styles.loadingText}>GENERANDO PREVISUALIZACIÓN...</div>
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <div style={styles.errorBox}>
                                            <span style={styles.errorIcon}>⚠️</span>
                                            <span style={styles.errorText}>{error}</span>
                                        </div>
                                    )}

                                    {previewData && (
                                        <>
                                            <div style={styles.previewHeader}>
                                                <div style={styles.previewInfo}>
                                                    <span style={styles.previewLabel}>Sede:</span>
                                                    <span style={styles.previewValue}>
                                                        {sedes.find(s => s.id === previewData.sede_id)?.nombre || `Sede ${previewData.sede_id}`}
                                                    </span>
                                                </div>
                                                <div style={styles.previewInfo}>
                                                    <span style={styles.previewLabel}>Fecha:</span>
                                                    <span style={styles.previewValue}>{formatearFecha(previewData.fecha)}</span>
                                                </div>
                                                <div style={styles.previewInfo}>
                                                    <span style={styles.previewLabel}>Número de Ventas:</span>
                                                    <span style={styles.previewValue}>{previewData.numero_ventas}</span>
                                                </div>
                                            </div>

                                            <div style={styles.previewGrid}>
                                                <div style={styles.previewCard}>
                                                    <span style={styles.previewCardLabel}>Total Ventas</span>
                                                    <span style={styles.previewCardValue}>${formatearMoneda(previewData.total_ventas)}</span>
                                                </div>
                                                <div style={styles.previewCard}>
                                                    <span style={styles.previewCardLabel}>Total Gastos</span>
                                                    <span style={styles.previewCardValue}>${formatearMoneda(previewData.total_gastos)}</span>
                                                </div>
                                                <div style={styles.previewCard}>
                                                    <span style={styles.previewCardLabel}>Balance Sistema</span>
                                                    <span style={{ ...styles.previewCardValue, color: '#00ff88', fontWeight: 'bold' }}>
                                                        ${formatearMoneda(previewData.balance_sistema)}
                                                    </span>
                                                </div>
                                                <div style={styles.previewCard}>
                                                    <span style={styles.previewCardLabel}>Efectivo</span>
                                                    <span style={styles.previewCardValue}>${formatearMoneda(previewData.efectivo)}</span>
                                                </div>
                                                <div style={styles.previewCard}>
                                                    <span style={styles.previewCardLabel}>Transferencia</span>
                                                    <span style={styles.previewCardValue}>${formatearMoneda(previewData.transferencia)}</span>
                                                </div>
                                            </div>

                                            {puedeCrear && (
                                                <div style={styles.previewActions}>
                                                    <button
                                                        onClick={() => {
                                                            setShowCreateModal(true);
                                                        }}
                                                        style={styles.btnSave}
                                                    >
                                                        🔒 REALIZAR CIERRE
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Creación de Cierre */}
            {showCreateModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>🔒 REALIZAR CIERRE</h3>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>SEDE</label>
                                <input
                                    type="text"
                                    value={sedes.find(s => s.id === parseInt(formData.sede_id))?.nombre || formData.sede_id}
                                    style={{ ...styles.formInput, background: '#1a1a1a', cursor: 'not-allowed' }}
                                    disabled
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>FECHA</label>
                                <input
                                    type="text"
                                    value={formatearFecha(formData.fecha)}
                                    style={{ ...styles.formInput, background: '#1a1a1a', cursor: 'not-allowed' }}
                                    disabled
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>EFECTIVO REPORTADO *</label>
                                    <input
                                        type="number"
                                        value={formData.efectivo_reportado}
                                        onChange={(e) => setFormData({ ...formData, efectivo_reportado: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="100"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>TRANSFERENCIA REPORTADA *</label>
                                    <input
                                        type="number"
                                        value={formData.transferencia_reportada}
                                        onChange={(e) => setFormData({ ...formData, transferencia_reportada: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="100"
                                        required
                                    />
                                </div>
                            </div>

                            {previewData && (
                                <div style={styles.previewSummary}>
                                    <div style={styles.previewSummaryItem}>
                                        <span>Balance Sistema:</span>
                                        <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                                            ${formatearMoneda(previewData.balance_sistema)}
                                        </span>
                                    </div>
                                    <div style={styles.previewSummaryItem}>
                                        <span>Total Reportado:</span>
                                        <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>
                                            ${formatearMoneda(
                                                (parseFloat(formData.efectivo_reportado) || 0) +
                                                (parseFloat(formData.transferencia_reportada) || 0)
                                            )}
                                        </span>
                                    </div>
                                    <div style={styles.previewSummaryItem}>
                                        <span>Diferencia:</span>
                                        <span style={{
                                            color: (() => {
                                                const totalReportado = (parseFloat(formData.efectivo_reportado) || 0) +
                                                                      (parseFloat(formData.transferencia_reportada) || 0);
                                                const diff = previewData.balance_sistema - totalReportado;
                                                return diff === 0 ? '#00ff88' : diff > 0 ? '#ffaa00' : '#ff4444';
                                            })(),
                                            fontWeight: 'bold'
                                        }}>
                                            ${formatearMoneda(
                                                previewData.balance_sistema -
                                                ((parseFloat(formData.efectivo_reportado) || 0) +
                                                 (parseFloat(formData.transferencia_reportada) || 0))
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>OBSERVACIONES</label>
                                <textarea
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Observaciones adicionales..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button onClick={handleCreateCierre} style={styles.btnSave}>
                                REALIZAR CIERRE
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
    headerActions: {
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
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
        transition: 'all 0.2s ease',
    },
    filterSelect: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '180px',
        outline: 'none',
    },
    filterInput: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '160px',
        outline: 'none',
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
        maxWidth: '650px',
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
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
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
    // Preview styles
    previewHeader: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.5rem',
        padding: '0.75rem',
        background: '#1a1a1a',
        borderRadius: '0.47rem',
        marginBottom: '1rem',
    },
    previewInfo: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.15rem',
    },
    previewLabel: {
        color: '#64748b',
        fontSize: '0.6rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    previewValue: {
        color: '#e2e8f0',
        fontSize: '0.85rem',
        fontWeight: '500',
    },
    previewGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.5rem',
        marginBottom: '1rem',
    },
    previewCard: {
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '0.75rem',
        background: '#1a1a1a',
        borderRadius: '0.47rem',
        textAlign: 'center',
    },
    previewCardLabel: {
        color: '#64748b',
        fontSize: '0.6rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '0.25rem',
    },
    previewCardValue: {
        color: '#e2e8f0',
        fontSize: '0.85rem',
        fontWeight: '500',
    },
    previewActions: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '0.5rem',
    },
    previewSummary: {
        background: '#1a1a1a',
        padding: '0.75rem 1rem',
        borderRadius: '0.47rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    previewSummaryItem: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '0.15rem',
        fontSize: '0.7rem',
        color: '#94a3b8',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.2)',
        borderRadius: '0.47rem',
        marginBottom: '1rem',
    },
    errorIcon: {
        fontSize: '1.2rem',
    },
    errorText: {
        color: '#ff4444',
        fontSize: '0.8rem',
    },
};

export default Cierres;