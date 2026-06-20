import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';
import { useAuthStore } from '../../store/authStore';

interface ReporteVentas {
    fecha: string;
    total_ventas: number;
    total_ingresos: number;
    efectivo: number;
    transferencia: number;
}

interface ProductoTop {
    id: number;
    nombre: string;
    sku: string;
    total_vendido: number;
    total_ingresos: number;
}

interface ReporteResumen {
    ventas_hoy: {
        total_ventas: number;
        total_ingresos: number;
        efectivo: number;
        transferencia: number;
    };
    ventas_semana: {
        total_ventas: number;
        total_ingresos: number;
    };
    ventas_mes: {
        total_ventas: number;
        total_ingresos: number;
    };
    productos_top: ProductoTop[];
    total_gastos: number;
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado';

const Reportes: React.FC = () => {
    const { isAdmin, tienePermiso } = usePermisos();
    const { usuario } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [reporte, setReporte] = useState<ReporteResumen | null>(null);
    const [periodo, setPeriodo] = useState<Periodo>('hoy');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [sedeId, setSedeId] = useState<number | null>(null);
    const [sedes, setSedes] = useState<{ id: number; nombre: string }[]>([]);

    const puedeVerReportes = isAdmin || tienePermiso('reportes_ver');
    const puedeExportar = isAdmin || tienePermiso('reportes_exportar');

    useEffect(() => {
        cargarSedes();
        cargarReporte();
    }, []);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes || []);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarReporte = async () => {
        try {
            setLoading(true);
            const params: any = {};
            
            if (sedeId) params.sede_id = sedeId;
            
            if (periodo === 'personalizado' && fechaInicio && fechaFin) {
                params.fecha_inicio = fechaInicio;
                params.fecha_fin = fechaFin;
            } else if (periodo === 'hoy') {
                // endpoint para hoy
            } else if (periodo === 'semana') {
                params.semana = true;
            } else if (periodo === 'mes') {
                params.mes = true;
            }

            const response = await apiClient.get('/reportes/resumen', { params });
            setReporte(response.data);
        } catch (error: any) {
            console.error('Error cargando reporte:', error);
            alert(error.response?.data?.detail || 'Error al cargar el reporte');
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodoChange = (nuevoPeriodo: Periodo) => {
        setPeriodo(nuevoPeriodo);
        if (nuevoPeriodo !== 'personalizado') {
            cargarReporte();
        }
    };

    const handleFiltroSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        cargarReporte();
    };

    const exportarExcel = async () => {
        if (!puedeExportar) {
            alert('No tienes permiso para exportar reportes');
            return;
        }
        try {
            const params: any = {};
            if (sedeId) params.sede_id = sedeId;
            if (periodo === 'personalizado' && fechaInicio && fechaFin) {
                params.fecha_inicio = fechaInicio;
                params.fecha_fin = fechaFin;
            }
            
            const response = await apiClient.get('/reportes/exportar-excel', { 
                params,
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_${new Date().toISOString().slice(0,10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error: any) {
            console.error('Error exportando reporte:', error);
            alert(error.response?.data?.detail || 'Error al exportar el reporte');
        }
    };

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    if (!puedeVerReportes) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>No tienes permiso para ver los reportes.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO REPORTES...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>📈 REPORTES</h3>
                    <p style={styles.subtitle}>Estadísticas y análisis de rendimiento</p>
                </div>
                {puedeExportar && (
                    <button onClick={exportarExcel} style={styles.btnExport}>
                        📥 Exportar Excel
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div style={styles.filtersContainer}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Periodo</label>
                    <select
                        value={periodo}
                        onChange={(e) => handlePeriodoChange(e.target.value as Periodo)}
                        style={styles.filterSelect}
                    >
                        <option value="hoy">Hoy</option>
                        <option value="semana">Última semana</option>
                        <option value="mes">Último mes</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>

                {(isAdmin || usuario?.rol === 'admin') && (
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Sede</label>
                        <select
                            value={sedeId || ''}
                            onChange={(e) => setSedeId(e.target.value ? parseInt(e.target.value) : null)}
                            style={styles.filterSelect}
                        >
                            <option value="">Todas las sedes</option>
                            {sedes.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {periodo === 'personalizado' && (
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Fecha Inicio</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            style={styles.filterInput}
                        />
                    </div>
                )}

                {periodo === 'personalizado' && (
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Fecha Fin</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            style={styles.filterInput}
                        />
                    </div>
                )}

                {periodo === 'personalizado' && (
                    <button onClick={handleFiltroSubmit} style={styles.btnFilter}>
                        🔍 Aplicar
                    </button>
                )}

                <button onClick={cargarReporte} style={styles.btnRefresh}>
                    🔄 Actualizar
                </button>
            </div>

            {reporte && (
                <>
                    {/* Cards de resumen */}
                    <div style={styles.statsGrid}>
                        <div style={{ ...styles.statCard, borderColor: '#00ff88' }}>
                            <div style={styles.statIcon}>💰</div>
                            <div>
                                <div style={styles.statValue}>${formatearMoneda(reporte.ventas_hoy.total_ingresos)}</div>
                                <div style={styles.statLabel}>Ingresos Hoy</div>
                            </div>
                        </div>
                        <div style={{ ...styles.statCard, borderColor: '#00aaff' }}>
                            <div style={styles.statIcon}>🛒</div>
                            <div>
                                <div style={styles.statValue}>{reporte.ventas_hoy.total_ventas}</div>
                                <div style={styles.statLabel}>Ventas Hoy</div>
                            </div>
                        </div>
                        <div style={{ ...styles.statCard, borderColor: '#ffaa00' }}>
                            <div style={styles.statIcon}>📈</div>
                            <div>
                                <div style={styles.statValue}>${formatearMoneda(reporte.ventas_semana.total_ingresos)}</div>
                                <div style={styles.statLabel}>Ingresos (Semana)</div>
                            </div>
                        </div>
                        <div style={{ ...styles.statCard, borderColor: '#ff66aa' }}>
                            <div style={styles.statIcon}>📊</div>
                            <div>
                                <div style={styles.statValue}>${formatearMoneda(reporte.ventas_mes.total_ingresos)}</div>
                                <div style={styles.statLabel}>Ingresos (Mes)</div>
                            </div>
                        </div>
                    </div>

                    {/* Detalle de pagos */}
                    <div style={styles.row}>
                        <div style={{ ...styles.card, flex: 1 }}>
                            <h4 style={styles.cardTitle}>💰 Detalle de Pagos (Hoy)</h4>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Efectivo</span>
                                <span style={{ ...styles.detailValue, color: '#00ff88' }}>
                                    ${formatearMoneda(reporte.ventas_hoy.efectivo)}
                                </span>
                            </div>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Transferencia</span>
                                <span style={{ ...styles.detailValue, color: '#00aaff' }}>
                                    ${formatearMoneda(reporte.ventas_hoy.transferencia)}
                                </span>
                            </div>
                            <div style={{ ...styles.detailRow, borderTop: '1px solid #1a1a1a', paddingTop: '0.5rem' }}>
                                <span style={styles.detailLabel}>Total</span>
                                <span style={{ ...styles.detailValue, color: '#00ff88', fontWeight: 'bold' }}>
                                    ${formatearMoneda(reporte.ventas_hoy.total_ingresos)}
                                </span>
                            </div>
                        </div>

                        <div style={{ ...styles.card, flex: 1 }}>
                            <h4 style={styles.cardTitle}>💸 Gastos Totales</h4>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Total Gastos</span>
                                <span style={{ ...styles.detailValue, color: '#ff4444' }}>
                                    ${formatearMoneda(reporte.total_gastos || 0)}
                                </span>
                            </div>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Margen</span>
                                <span style={{ ...styles.detailValue, color: '#00ff88' }}>
                                    ${formatearMoneda((reporte.ventas_hoy.total_ingresos || 0) - (reporte.total_gastos || 0))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Productos más vendidos */}
                    <div style={styles.card}>
                        <h4 style={styles.cardTitle}>🏷️ Productos Más Vendidos</h4>
                        {reporte.productos_top && reporte.productos_top.length > 0 ? (
                            <div style={styles.topProducts}>
                                {reporte.productos_top.map((p, i) => (
                                    <div key={p.id} style={styles.topProductItem}>
                                        <span style={styles.topProductRank}>#{i + 1}</span>
                                        <div style={styles.topProductInfo}>
                                            <div style={styles.topProductName}>{p.nombre}</div>
                                            <div style={styles.topProductSku}>SKU: {p.sku}</div>
                                        </div>
                                        <div style={styles.topProductStats}>
                                            <span style={styles.topProductCantidad}>{p.total_vendido} uds</span>
                                            <span style={styles.topProductIngresos}>${formatearMoneda(p.total_ingresos)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={styles.emptyText}>No hay productos para mostrar</p>
                        )}
                    </div>
                </>
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
    btnExport: {
        background: 'rgba(0, 170, 255, 0.1)',
        border: '1px solid rgba(0, 170, 255, 0.3)',
        borderRadius: '0.47rem',
        color: '#00aaff',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: '500',
        transition: 'all 0.2s ease',
    },
    filtersContainer: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.25rem',
    },
    filterLabel: {
        color: '#64748b',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    filterSelect: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '140px',
        outline: 'none',
    },
    filterInput: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '140px',
        outline: 'none',
    },
    btnFilter: {
        padding: '0.5rem 1rem',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '0.47rem',
        color: '#00ff88',
        cursor: 'pointer',
        fontSize: '0.8rem',
        height: '37px',
    },
    btnRefresh: {
        padding: '0.5rem 1rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.8rem',
        height: '37px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    statCard: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        padding: '1.2rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        transition: 'all 0.3s ease',
        borderLeft: '3px solid #00ff88',
    },
    statIcon: {
        fontSize: '1.8rem',
    },
    statValue: {
        color: '#ffffff',
        fontSize: '1.3rem',
        fontWeight: '700',
    },
    statLabel: {
        color: '#64748b',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    card: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        padding: '1.5rem',
    },
    cardTitle: {
        color: '#e2e8f0',
        fontSize: '0.9rem',
        margin: '0 0 1rem 0',
    },
    detailRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.3rem 0',
    },
    detailLabel: {
        color: '#94a3b8',
        fontSize: '0.8rem',
    },
    detailValue: {
        fontSize: '0.8rem',
        fontWeight: '500',
    },
    topProducts: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem',
    },
    topProductItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem',
        background: '#0a0a0a',
        borderRadius: '0.47rem',
        border: '1px solid #1a1a1a',
    },
    topProductRank: {
        color: '#64748b',
        fontSize: '0.7rem',
        fontWeight: '600',
        minWidth: '30px',
    },
    topProductInfo: {
        flex: 1,
    },
    topProductName: {
        color: '#e2e8f0',
        fontSize: '0.8rem',
    },
    topProductSku: {
        color: '#64748b',
        fontSize: '0.6rem',
    },
    topProductStats: {
        display: 'flex',
        gap: '0.75rem',
    },
    topProductCantidad: {
        color: '#94a3b8',
        fontSize: '0.7rem',
    },
    topProductIngresos: {
        color: '#00ff88',
        fontSize: '0.7rem',
        fontWeight: '500',
    },
    emptyText: {
        color: '#64748b',
        textAlign: 'center',
        padding: '1rem',
        fontSize: '0.8rem',
    },
    accesoDenegado: {
        padding: '2rem',
        textAlign: 'center',
        color: '#ff4444',
    },
};

export default Reportes;