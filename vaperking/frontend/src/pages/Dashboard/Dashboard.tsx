import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermisos } from '../../context/PermisosContext';
import apiClient from '../../api/axiosClient';
import Usuarios from '../Usuarios/Usuarios';
import Ventas from '../Ventas/Ventas';
import Productos from '../Productos/Productos';

interface MenuItem {
    id: string;
    label: string;
    icon: string;
}

interface DashboardData {
    ventas_hoy: {
        total_ventas: number;
        total_ingresos: number;
        efectivo: number;
        transferencia: number;
        ticket_promedio: number;
    };
    ventas_semana: {
        total_ventas: number;
        total_ingresos: number;
    };
    alertas_stock: number;
    ultimo_cierre: {
        fecha: string | null;
        diferencia: number;
    };
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { usuario, isAuthenticated, logout } = useAuthStore();
    const { isAdmin, isVendedor, loading: loadingPermisos } = usePermisos();
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Reloj en tiempo real
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isAuthenticated && !loadingPermisos) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate, loadingPermisos]);

    if (!isAuthenticated || loadingPermisos) {
        return null;
    }

    const menuItems: MenuItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'ventas', label: 'Ventas', icon: '💰' },
        { id: 'productos', label: 'Productos', icon: '🏷️' },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'usuarios', label: 'Usuarios', icon: '👥' });
        menuItems.push({ id: 'sedes', label: 'Sedes', icon: '🏢' });
        menuItems.push({ id: 'reportes', label: 'Reportes', icon: '📈' });
    }

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard':
                return <DashboardContent usuario={usuario} isAdmin={isAdmin} isVendedor={isVendedor} currentTime={currentTime} />;
            case 'ventas':
                return <Ventas />;
            case 'productos':
                return <Productos isAdmin={isAdmin} />;
            case 'usuarios':
                return <Usuarios />;
            default:
                return <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Módulo en construcción</div>;
        }
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleLogout = () => {
        if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            logout();
            navigate('/login');
        }
    };

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <aside style={{
                ...styles.sidebar,
                width: isSidebarOpen ? '260px' : '0px',
                minWidth: isSidebarOpen ? '260px' : '0px',
            }}>
                <div style={styles.sidebarHeader}>
                    <div style={styles.logoContainer}>
                        <div style={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span style={styles.logoText}>VAPERKING</span>
                    </div>
                    <button onClick={toggleSidebar} style={styles.sidebarToggle}>
                        {isSidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                <div style={styles.userProfile}>
                    <div style={styles.userAvatar}>
                        {usuario?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div style={styles.userInfo}>
                        <div style={styles.userName}>{usuario?.nombre_completo || 'Usuario'}</div>
                        <div style={{
                            ...styles.userRole,
                            background: isAdmin ? 'rgba(0, 255, 136, 0.15)' : 'rgba(100, 100, 100, 0.15)',
                            color: isAdmin ? '#00ff88' : '#94a3b8'
                        }}>
                            {isAdmin ? '👑 Administrador' : isVendedor ? '🛒 Vendedor' : 'Usuario'}
                        </div>
                    </div>
                </div>

                <nav style={styles.nav}>
                    {menuItems.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                ...styles.navItem,
                                ...(activeMenu === item.id ? styles.navItemActive : {})
                            }}
                            onClick={() => setActiveMenu(item.id)}
                        >
                            <span style={styles.navIcon}>{item.icon}</span>
                            <span style={styles.navLabel}>{item.label}</span>
                            {activeMenu === item.id && <span style={styles.navIndicator} />}
                        </div>
                    ))}
                </nav>

                <div style={styles.sidebarFooter}>
                    <div style={styles.sidebarVersion}>v2.0.0</div>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        <span>🚪</span>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                ...styles.main,
                marginLeft: isSidebarOpen ? '260px' : '0px',
            }}>
                {/* Top Bar */}
                <header style={styles.topBar}>
                    <div style={styles.topBarLeft}>
                        <button onClick={toggleSidebar} style={styles.menuButton}>
                            ☰
                        </button>
                        <h1 style={styles.pageTitle}>
                            {menuItems.find(m => m.id === activeMenu)?.label || 'Dashboard'}
                        </h1>
                    </div>
                    <div style={styles.topBarRight}>
                        <div style={styles.datetime}>
                            <span style={styles.dateText}>
                                {currentTime.toLocaleDateString('es-CO', {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                            <span style={styles.timeText}>
                                {currentTime.toLocaleTimeString('es-CO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </span>
                        </div>
                        <div style={styles.userBadge}>
                            <span style={styles.userBadgeIcon}>👤</span>
                            <span style={styles.userBadgeName}>{usuario?.username}</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div style={styles.content}>
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

// Componente de contenido del Dashboard - CON DATOS REALES
// Componente de contenido del Dashboard - CON DATOS REALES
const DashboardContent: React.FC<{ 
    usuario: any; 
    isAdmin: boolean; 
    isVendedor: boolean; 
    currentTime: Date 
}> = ({ usuario, isAdmin, isVendedor, currentTime }) => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ultimasVentas, setUltimasVentas] = useState<any[]>([]);

    useEffect(() => {
        cargarDashboard();
        cargarUltimasVentas();
    }, []);

    const cargarDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const sedeId = isVendedor && usuario?.sede_id ? usuario.sede_id : null;
            const url = sedeId ? `/reportes/dashboard?sede_id=${sedeId}` : '/reportes/dashboard';
            
            console.log('Cargando dashboard desde:', url);
            const response = await apiClient.get(url);
            
            if (response.status === 200) {
                setDashboardData(response.data);
                console.log('Dashboard data:', response.data);
            } else {
                throw new Error('Error al cargar datos del dashboard');
            }
        } catch (error: any) {
            console.error('Error cargando dashboard:', error);
            setError(error.response?.data?.detail || 'Error al cargar los datos');
            setDashboardData({
                ventas_hoy: { total_ventas: 0, total_ingresos: 0, efectivo: 0, transferencia: 0, ticket_promedio: 0 },
                ventas_semana: { total_ventas: 0, total_ingresos: 0 },
                alertas_stock: 0,
                ultimo_cierre: { fecha: null, diferencia: 0 }
            });
        } finally {
            setLoading(false);
        }
    };

    const cargarUltimasVentas = async () => {
        try {
            const params: any = { limit: 5 };
            if (isVendedor && usuario?.sede_id) {
                params.sede_id = usuario.sede_id;
            }
            
            const response = await apiClient.get('/ventas/', { params });
            if (response.status === 200) {
                setUltimasVentas(response.data.ventas || []);
            }
        } catch (error) {
            console.error('Error cargando últimas ventas:', error);
        }
    };

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const formatearFecha = (fecha: string) => {
        if (!fecha) return '--/--/----';
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO ESTADÍSTICAS...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <div style={styles.errorIcon}>⚠️</div>
                <div style={styles.errorText}>{error}</div>
                <button onClick={cargarDashboard} style={styles.errorButton}>
                    Reintentar
                </button>
            </div>
        );
    }

    const data = dashboardData;
    if (!data) return null;

    const metaDiaria = 5000000;
    const progresoMeta = Math.min((data.ventas_hoy.total_ingresos / metaDiaria) * 100, 100);
    const totalPagos = data.ventas_hoy.efectivo + data.ventas_hoy.transferencia;
    const porcentajeEfectivo = totalPagos > 0 ? (data.ventas_hoy.efectivo / totalPagos) * 100 : 0;
    const porcentajeTransferencia = totalPagos > 0 ? (data.ventas_hoy.transferencia / totalPagos) * 100 : 0;

    return (
        <div style={styles.dashboardContent}>
            {/* Bienvenida */}
            <div style={styles.welcomeSection}>
                <div>
                    <h2 style={styles.welcomeTitle}>
                        ¡Bienvenido de vuelta, <span style={{ color: '#00ff88' }}>{usuario?.nombre_completo?.split(' ')[0] || 'Usuario'}</span>!
                    </h2>
                    <p style={styles.welcomeSubtitle}>
                        {isAdmin ? 'Panel de administración general' : isVendedor ? 'Panel de control de ventas' : 'Panel de usuario'}
                        {isVendedor && usuario?.sede_id && ` - Sede: ${usuario.sede_id}`}
                    </p>
                </div>
                <div style={styles.welcomeDate}>
                    <span style={styles.dateDisplay}>
                        {currentTime.toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        })}
                    </span>
                </div>
            </div>

            {/* Stats Cards - Datos reales */}
            <div style={styles.statsGrid}>
                <div style={{ ...styles.statCard, borderColor: '#00ff88' }}>
                    <div style={styles.statIcon}>💰</div>
                    <div>
                        <div style={styles.statValue}>${formatearMoneda(data.ventas_hoy.total_ingresos)}</div>
                        <div style={styles.statLabel}>Ingresos Hoy</div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#00aaff' }}>
                    <div style={styles.statIcon}>🛒</div>
                    <div>
                        <div style={styles.statValue}>{data.ventas_hoy.total_ventas}</div>
                        <div style={styles.statLabel}>Ventas Hoy</div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#ffaa00' }}>
                    <div style={styles.statIcon}>🎫</div>
                    <div>
                        <div style={styles.statValue}>${formatearMoneda(data.ventas_hoy.ticket_promedio)}</div>
                        <div style={styles.statLabel}>Ticket Promedio</div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#ff66aa' }}>
                    <div style={styles.statIcon}>⚠️</div>
                    <div>
                        <div style={{ 
                            ...styles.statValue, 
                            color: data.alertas_stock > 0 ? '#ff4444' : '#00ff88' 
                        }}>
                            {data.alertas_stock}
                        </div>
                        <div style={styles.statLabel}>Alertas de Stock</div>
                    </div>
                </div>
            </div>

            {/* Ventas Semana y Último Cierre */}
            <div style={styles.secondRow}>
                <div style={{ ...styles.statCard, borderColor: '#aa66ff' }}>
                    <div style={styles.statIcon}>📆</div>
                    <div>
                        <div style={styles.statValue}>{data.ventas_semana.total_ventas}</div>
                        <div style={styles.statLabel}>
                            Ventas (Últimos 7 días)
                            <span style={{ fontSize: '0.6rem', display: 'block', color: '#64748b' }}>
                                ${formatearMoneda(data.ventas_semana.total_ingresos)}
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#00ddff' }}>
                    <div style={styles.statIcon}>📅</div>
                    <div>
                        <div style={{ 
                            ...styles.statValue, 
                            color: data.ultimo_cierre?.fecha ? (data.ultimo_cierre.diferencia === 0 ? '#00ff88' : '#ffaa00') : '#64748b'
                        }}>
                            {data.ultimo_cierre?.fecha ? formatearFecha(data.ultimo_cierre.fecha) : 'Sin cierre'}
                        </div>
                        <div style={styles.statLabel}>
                            Último Cierre
                            {data.ultimo_cierre?.fecha && (
                                <span style={{ fontSize: '0.6rem', display: 'block', color: '#64748b' }}>
                                    Diferencia: ${formatearMoneda(data.ultimo_cierre.diferencia)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribución de Pagos */}
            <div style={styles.activitySection}>
                <h3 style={styles.sectionTitle}>💳 Distribución de Pagos (Hoy)</h3>
                <div style={styles.paymentDistribution}>
                    <div style={styles.paymentBar}>
                        <div style={{
                            ...styles.paymentBarFill,
                            width: `${porcentajeEfectivo}%`,
                            background: '#00ff88'
                        }} />
                        <div style={{
                            ...styles.paymentBarFill,
                            width: `${porcentajeTransferencia}%`,
                            background: '#00aaff'
                        }} />
                    </div>
                    <div style={styles.paymentLabels}>
                        <span style={{ color: '#00ff88' }}>💰 Efectivo: ${formatearMoneda(data.ventas_hoy.efectivo)}</span>
                        <span style={{ color: '#00aaff' }}>💳 Transferencia: ${formatearMoneda(data.ventas_hoy.transferencia)}</span>
                    </div>
                </div>
            </div>

            {/* Meta del Día */}
            <div style={styles.activitySection}>
                <h3 style={styles.sectionTitle}>🎯 Meta del Día</h3>
                <div style={styles.goalContainer}>
                    <div style={styles.goalInfo}>
                        <span style={styles.goalText}>Progreso</span>
                        <span style={styles.goalValue}>
                            ${formatearMoneda(data.ventas_hoy.total_ingresos)} / ${formatearMoneda(metaDiaria)}
                        </span>
                    </div>
                    <div style={styles.goalBar}>
                        <div style={{
                            ...styles.goalBarFill,
                            width: `${progresoMeta}%`
                        }} />
                    </div>
                    <div style={styles.goalPercentage}>
                        {Math.round(progresoMeta)}% de la meta alcanzada
                    </div>
                </div>
            </div>

            {/* Últimas Ventas */}
            <div style={styles.activitySection}>
                <h3 style={styles.sectionTitle}>🕐 Últimas Ventas</h3>
                {ultimasVentas.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>
                        No hay ventas recientes
                    </p>
                ) : (
                    <div style={styles.activityList}>
                        {ultimasVentas.slice(0, 5).map((venta, index) => (
                            <div key={venta.id || index} style={styles.activityItem}>
                                <div style={styles.activityIcon}>
                                    {venta.metodo_pago === 'efectivo' ? '💰' : 
                                     venta.metodo_pago === 'transferencia' ? '💳' : '💳💰'}
                                </div>
                                <div style={styles.activityContent}>
                                    <div style={styles.activityTitle}>
                                        Venta #{venta.id} - {venta.usuario?.nombre_completo || 'Usuario'}
                                    </div>
                                    <div style={styles.activityTime}>
                                        {formatearFecha(venta.created_at)} - {venta.metodo_pago?.toUpperCase() || 'N/A'}
                                    </div>
                                </div>
                                <div style={styles.activityAmount}>
                                    + ${formatearMoneda(venta.total || 0)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============= ESTILOS =============

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        minHeight: '100vh',
        background: '#080808',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    sidebar: {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        height: '100vh',
        background: '#0f0f0f',
        borderRight: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'hidden',
        zIndex: 100,
    },
    sidebarHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.2rem 1.2rem',
        borderBottom: '1px solid #1a1a1a',
        minHeight: '70px',
    },
    logoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    logoIcon: {
        width: '32px',
        height: '32px',
        background: '#00ff88',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0a0a0a',
        fontSize: '16px',
    },
    logoText: {
        color: '#ffffff',
        fontSize: '1.1rem',
        fontWeight: '700',
        letterSpacing: '1px',
    },
    sidebarToggle: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        fontSize: '0.8rem',
        cursor: 'pointer',
        padding: '4px',
    },
    userProfile: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.2rem 1.2rem',
        borderBottom: '1px solid #1a1a1a',
    },
    userAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#00ff88',
        color: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '1rem',
        flexShrink: 0,
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        color: '#ffffff',
        fontSize: '0.85rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    userRole: {
        fontSize: '0.6rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '0.47rem',
        display: 'inline-block',
        marginTop: '0.2rem',
    },
    nav: {
        flex: 1,
        padding: '0.5rem 0.8rem',
        overflowY: 'auto',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.7rem 0.9rem',
        borderRadius: '0.47rem',
        cursor: 'pointer',
        color: '#94a3b8',
        transition: 'all 0.2s ease',
        position: 'relative',
        marginBottom: '2px',
    },
    navItemActive: {
        background: 'rgba(0, 255, 136, 0.08)',
        color: '#00ff88',
    },
    navIcon: {
        fontSize: '1.1rem',
        width: '24px',
        textAlign: 'center',
        flexShrink: 0,
    },
    navLabel: {
        fontSize: '0.85rem',
        fontWeight: '500',
        whiteSpace: 'nowrap',
    },
    navIndicator: {
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '4px',
        height: '20px',
        background: '#00ff88',
        borderRadius: '2px',
    },
    sidebarFooter: {
        padding: '1rem 1.2rem',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    sidebarVersion: {
        color: '#475569',
        fontSize: '0.6rem',
        textAlign: 'center',
    },
    logoutButton: {
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.2)',
        borderRadius: '0.47rem',
        color: '#ff4444',
        padding: '0.5rem 0.8rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        fontWeight: '500',
    },
    main: {
        flex: 1,
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
        marginLeft: '260px',
        width: '100%',
    },
    topBar: {
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 8, 8, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1a1a',
        padding: '0.8rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '70px',
    },
    topBarLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    menuButton: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        fontSize: '1.2rem',
        cursor: 'pointer',
        display: 'none',
    },
    pageTitle: {
        color: '#ffffff',
        fontSize: '1.1rem',
        fontWeight: '600',
        margin: 0,
    },
    topBarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
    },
    datetime: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    dateText: {
        color: '#94a3b8',
        fontSize: '0.65rem',
    },
    timeText: {
        color: '#ffffff',
        fontSize: '0.75rem',
        fontWeight: '500',
    },
    userBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: '#1a1a1a',
        padding: '0.3rem 0.8rem 0.3rem 0.5rem',
        borderRadius: '2rem',
    },
    userBadgeIcon: {
        fontSize: '0.8rem',
    },
    userBadgeName: {
        color: '#e2e8f0',
        fontSize: '0.8rem',
        fontWeight: '500',
    },
    content: {
        padding: '1.5rem',
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

    // Dashboard Content Styles
    dashboardContent: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    welcomeSection: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    welcomeTitle: {
        color: '#ffffff',
        fontSize: '1.5rem',
        margin: 0,
    },
    welcomeSubtitle: {
        color: '#64748b',
        fontSize: '0.85rem',
        margin: '0.25rem 0 0 0',
    },
    welcomeDate: {
        background: '#1a1a1a',
        padding: '0.5rem 1rem',
        borderRadius: '0.47rem',
    },
    dateDisplay: {
        color: '#94a3b8',
        fontSize: '0.8rem',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
    },
    secondRow: {
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
    activitySection: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
    },
    sectionTitle: {
        color: '#ffffff',
        fontSize: '1rem',
        margin: '0 0 1rem 0',
    },
    activityList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    activityItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem',
        background: '#0a0a0a',
        borderRadius: '0.47rem',
        border: '1px solid #1a1a1a',
    },
    activityIcon: {
        fontSize: '1.2rem',
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        color: '#e2e8f0',
        fontSize: '0.85rem',
    },
    activityTime: {
        color: '#64748b',
        fontSize: '0.65rem',
    },
    activityAmount: {
        color: '#00ff88',
        fontSize: '0.85rem',
        fontWeight: '600',
    },
    quickActions: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        padding: '1.5rem',
    },
    quickActionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.75rem',
        marginTop: '1rem',
    },
    quickActionBtn: {
        border: 'none',
        borderRadius: '0.47rem',
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
        background: '#1a1a1a',
        color: '#94a3b8',
    },
    paymentDistribution: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    paymentBar: {
        display: 'flex',
        height: '12px',
        borderRadius: '6px',
        overflow: 'hidden',
        background: '#1a1a1a',
    },
    paymentBarFill: {
        height: '100%',
        transition: 'width 0.5s ease',
    },
    paymentLabels: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
    },
    goalContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    goalInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
    },
    goalText: {
        color: '#94a3b8',
    },
    goalValue: {
        color: '#ffffff',
        fontWeight: '600',
    },
    goalBar: {
        height: '8px',
        borderRadius: '4px',
        overflow: 'hidden',
        background: '#1a1a1a',
    },
    goalBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #00ff88, #00cc66)',
        transition: 'width 0.5s ease',
        borderRadius: '4px',
    },
    goalPercentage: {
        textAlign: 'center',
        color: '#00ff88',
        fontSize: '0.8rem',
        fontWeight: '500',
    },
};

export default Dashboard;