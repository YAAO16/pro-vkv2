import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';

interface RegistroHistorial {
    id: number;
    usuario_id: number | null;
    accion: string;
    tabla: string;
    registro_id: number | null;
    detalle: any;
    ip: string | null;
    created_at: string;
    usuario?: {
        id: number;
        username: string;
        nombre_completo: string;
    };
}

const Historial: React.FC = () => {
    const { tienePermiso, isAdmin } = usePermisos();
    const [registros, setRegistros] = useState<RegistroHistorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtro, setFiltro] = useState('');
    const [tablaFiltro, setTablaFiltro] = useState('');

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get('/audit-log/?limit=1000');
            setRegistros(response.data);
        } catch (error: any) {
            console.error('Error cargando historial:', error);
            setError(error.response?.data?.detail || 'Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const registrosFiltrados = registros.filter(r => {
        const matchFiltro = filtro ? 
            r.accion.toLowerCase().includes(filtro.toLowerCase()) ||
            r.tabla.toLowerCase().includes(filtro.toLowerCase()) ||
            (r.usuario?.nombre_completo?.toLowerCase() || '').includes(filtro.toLowerCase()) ||
            (r.detalle && JSON.stringify(r.detalle).toLowerCase().includes(filtro.toLowerCase())) :
            true;
        const matchTabla = tablaFiltro ? r.tabla === tablaFiltro : true;
        return matchFiltro && matchTabla;
    });

    // Obtener tablas únicas para el filtro
    const tablasUnicas = Array.from(new Set(registros.map(r => r.tabla)));

    if (!isAdmin && !tienePermiso('historial_ver')) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>No tienes permiso para ver el historial.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO HISTORIAL...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <span style={styles.errorIcon}>⚠️</span>
                <p style={styles.errorText}>{error}</p>
                <button onClick={cargarHistorial} style={styles.errorButton}>Reintentar</button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>📜 HISTORIAL DE ACTIVIDADES</h3>
                <p style={styles.subtitle}>Registro de todas las acciones realizadas en el sistema</p>
            </div>

            {/* Filtros */}
            <div style={styles.filtersContainer}>
                <input
                    type="text"
                    placeholder="Buscar por acción, tabla, usuario..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    style={styles.searchInput}
                />
                <select
                    value={tablaFiltro}
                    onChange={(e) => setTablaFiltro(e.target.value)}
                    style={styles.filterSelect}
                >
                    <option value="">Todas las tablas</option>
                    {tablasUnicas.map(tabla => (
                        <option key={tabla} value={tabla}>{tabla}</option>
                    ))}
                </select>
                <span style={styles.resultCount}>
                    {registrosFiltrados.length} registros
                </span>
                <button onClick={cargarHistorial} style={styles.refreshButton}>
                    🔄 Actualizar
                </button>
            </div>

            {/* Tabla */}
            <div style={styles.tableContainer}>
                {registrosFiltrados.length === 0 ? (
                    <div style={styles.emptyState}>
                        No hay registros que coincidan con los filtros
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Acción</th>
                                <th style={styles.th}>Tabla</th>
                                <th style={styles.th}>Registro ID</th>
                                <th style={styles.th}>Detalle</th>
                                <th style={styles.th}>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrosFiltrados.map((registro) => (
                                <tr key={registro.id} style={styles.tableRow}>
                                    <td style={styles.td}>
                                        {formatearFecha(registro.created_at)}
                                    </td>
                                    <td style={styles.td}>
                                        {registro.usuario?.nombre_completo || 'Sistema'}
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.accionBadge,
                                            ...(registro.accion.includes('crear') ? styles.accionCrear :
                                                registro.accion.includes('editar') ? styles.accionEditar :
                                                registro.accion.includes('eliminar') ? styles.accionEliminar :
                                                registro.accion.includes('login') ? styles.accionLogin :
                                                styles.accionDefault)
                                        }}>
                                            {registro.accion}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={styles.tablaBadge}>{registro.tabla}</span>
                                    </td>
                                    <td style={styles.td}>{registro.registro_id || '—'}</td>
                                    <td style={styles.td}>
                                        {registro.detalle ? (
                                            <details style={styles.details}>
                                                <summary style={styles.detailsSummary}>Ver detalle</summary>
                                                <pre style={styles.detailsPre}>
                                                    {JSON.stringify(registro.detalle, null, 2)}
                                                </pre>
                                            </details>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <span style={styles.ipBadge}>{registro.ip || '—'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '0.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '1.5rem',
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
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
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
        flexDirection: 'column',
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
    filtersContainer: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        minWidth: '200px',
        padding: '0.5rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
    },
    filterSelect: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '150px',
    },
    resultCount: {
        color: '#64748b',
        fontSize: '0.75rem',
        marginLeft: 'auto',
    },
    refreshButton: {
        padding: '0.5rem 1rem',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '0.47rem',
        color: '#00ff88',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'all 0.2s ease',
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
    accionBadge: {
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.65rem',
        fontWeight: '500',
        display: 'inline-block',
    },
    accionCrear: {
        background: 'rgba(0, 255, 136, 0.15)',
        color: '#00ff88',
    },
    accionEditar: {
        background: 'rgba(0, 170, 255, 0.15)',
        color: '#00aaff',
    },
    accionEliminar: {
        background: 'rgba(255, 68, 68, 0.15)',
        color: '#ff4444',
    },
    accionLogin: {
        background: 'rgba(255, 170, 0, 0.15)',
        color: '#ffaa00',
    },
    accionDefault: {
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#94a3b8',
    },
    tablaBadge: {
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '0.15rem 0.4rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
    ipBadge: {
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '0.1rem 0.3rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        color: '#64748b',
        fontFamily: 'monospace',
    },
    details: {
        cursor: 'pointer',
    },
    detailsSummary: {
        color: '#00aaff',
        fontSize: '0.7rem',
        cursor: 'pointer',
    },
    detailsPre: {
        background: '#1a1a1a',
        padding: '0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        color: '#e2e8f0',
        overflow: 'auto',
        maxHeight: '150px',
        marginTop: '0.25rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    },
    accesoDenegado: {
        padding: '2rem',
        textAlign: 'center',
        color: '#ff4444',
    },
};

export default Historial;