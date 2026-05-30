import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/axiosClient';
import Ventas from '../Ventas/Ventas';
import Inventario from '../Inventario/Inventario';
import Productos from '../Productos/Productos';
import Cierres from '../Cierres/Cierres';
import Sedes from '../Sedes/Sedes';
import Usuarios from '../Usuarios/Usuarios';
import Observaciones from '../Observaciones/Observaciones';
import ProductosDanados from '../ProductosDanados/ProductosDanados';
import Sueldos from '../Sueldos/Sueldos';
import Gastos from '../Gastos/Gastos';
import HistorialAjustes from '../../components/HistorialAjustes';
import '../../App.css';

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

interface UltimasVentas {
    id: number;
    total: number;
    metodo_pago: string;
    created_at: string;
    nombre_usuario: string;
}

const Dashboard: React.FC = () => {
    const { usuario, logout, isAuthenticated } = useAuthStore();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [ultimasVentas, setUltimasVentas] = useState<UltimasVentas[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [sedeNombre, setSedeNombre] = useState<string>('');
    const [fechaActual, setFechaActual] = useState(new Date());

    const isAdmin = usuario?.rol === 'ADMIN' || usuario?.rol === 'admin';
    const isVendedor = usuario?.rol === 'VENDEDOR' || usuario?.rol === 'vendedor';
    const sedeId: number | null = usuario?.sede_id ?? null;

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        cargarDashboard();
        cargarUltimasVentas();
        if (isVendedor && sedeId) {
            cargarNombreSede();
        }
        const interval = setInterval(() => setFechaActual(new Date()), 1000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const cargarNombreSede = async () => {
        if (!sedeId) return;
        try {
            const response = await apiClient.get(`/sedes/${sedeId}`);
            setSedeNombre(response.data.sede?.nombre || 'Tu sede');
        } catch (error) {
            console.error('Error cargando sede:', error);
        }
    };

    const cargarDashboard = async () => {
        try {
            const params = isVendedor && sedeId ? `?sede_id=${sedeId}` : '';
            const response = await apiClient.get(`/reportes/dashboard${params}`);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarUltimasVentas = async () => {
        try {
            const params = isVendedor && sedeId ? { sede_id: sedeId, limit: 5 } : { limit: 5 };
            const response = await apiClient.get('/ventas/', { params });
            setUltimasVentas(response.data.ventas || []);
        } catch (error) {
            console.error('Error cargando últimas ventas:', error);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const getMenuItems = () => {
        const commonItems = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'ventas', label: 'Ventas', icon: '💰' },
            { id: 'inventario', label: 'Inventario', icon: '📦' },
            { id: 'cierres', label: 'Cierres', icon: '📅' },
            { id: 'gastos', label: 'Gastos', icon: '💸' },
            { id: 'observaciones', label: 'Observaciones', icon: '📝' },      
            { id: 'danados', label: 'Dañados', icon: '🔨' }, 
        ];

        const adminOnlyItems = [
            { id: 'sedes', label: 'Sedes', icon: '🏢' },
            { id: 'usuarios', label: 'Usuarios', icon: '👥' },
            { id: 'sueldos', label: 'Sueldos', icon: '💰' },
            { id: 'historial', label: 'Historial Ajustes', icon: '📜' },
            { id: 'productos', label: 'Productos', icon: '🔧' },
        ];

        if (isAdmin) {
            return [...commonItems, ...adminOnlyItems];
        }
        return commonItems;
    };

    const menuItems = getMenuItems();

    const getDashboardTitle = () => {
        if (isVendedor && sedeNombre) {
            return `PANEL DE CONTROL - ${sedeNombre.toUpperCase()}`;
        }
        return 'PANEL DE CONTROL';
    };

    /*const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };*/

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard':
                return (
                    <div style={{ padding: '0.5rem' }}>
                        {/* Header con fecha y hora */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '2rem',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, #00ff88, #00cc66)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {getDashboardTitle()}
                                </h2>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    {fechaActual.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <div style={{ 
                                background: 'rgba(0, 255, 136, 0.1)', 
                                padding: '0.5rem 1rem', 
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(0, 255, 136, 0.2)'
                            }}>
                                <span style={{ color: '#00ff88', fontSize: '0.8rem' }}>
                                    🕐 {fechaActual.toLocaleTimeString('es-CO')}
                                </span>
                            </div>
                        </div>

                        {/* KPIs Grid - 4 cards principales */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '2rem'
                        }}>
                            {/* Card Ventas Hoy */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>VENTAS HOY</p>
                                        <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#00ff88', margin: 0 }}>{dashboardData?.ventas_hoy.total_ventas || 0}</h3>
                                        <p style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '600', marginTop: '0.25rem' }}>
                                            ${(dashboardData?.ventas_hoy.total_ingresos || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div style={{ fontSize: '2rem', opacity: 0.7 }}>📈</div>
                                </div>
                                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                                    <span style={{ color: '#00ff88' }}>💰 Efectivo: ${(dashboardData?.ventas_hoy.efectivo || 0).toLocaleString()}</span>
                                    <span style={{ color: '#00aaff' }}>💳 Transferencia: ${(dashboardData?.ventas_hoy.transferencia || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Card Ticket Promedio */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>TICKET PROMEDIO</p>
                                        <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#00ff88', margin: 0 }}>
                                            ${(dashboardData?.ventas_hoy.ticket_promedio || 0).toLocaleString()}
                                        </h3>
                                        <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.25rem' }}>por transacción</p>
                                    </div>
                                    <div style={{ fontSize: '2rem', opacity: 0.7 }}>🎫</div>
                                </div>
                            </div>

                            {/* Card Ventas Semana */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>VENTAS (ÚLTIMOS 7 DÍAS)</p>
                                        <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>{dashboardData?.ventas_semana.total_ventas || 0}</h3>
                                        <p style={{ color: '#00ff88', fontSize: '1.1rem', fontWeight: '600', marginTop: '0.25rem' }}>
                                            ${(dashboardData?.ventas_semana.total_ingresos || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div style={{ fontSize: '2rem', opacity: 0.7 }}>📆</div>
                                </div>
                                <div style={{ marginTop: '0.75rem' }}>
                                    <div style={{ background: '#1a1a1a', borderRadius: '0.5rem', height: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min((dashboardData?.ventas_semana.total_ventas || 0) / 50 * 100, 100)}%`, height: '100%', background: '#00ff88' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Card Alertas Stock */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: `1px solid ${(dashboardData?.alertas_stock || 0) > 0 ? 'rgba(255, 68, 68, 0.3)' : 'rgba(0, 255, 136, 0.15)'}`,
                                borderRadius: '1rem',
                                padding: '1.25rem',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle, ${(dashboardData?.alertas_stock || 0) > 0 ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.1)'} 0%, transparent 70%)` }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>ALERTAS DE STOCK</p>
                                        <h3 style={{ fontSize: '2rem', fontWeight: '800', color: (dashboardData?.alertas_stock || 0) > 0 ? '#ff4444' : '#00ff88', margin: 0 }}>
                                            {dashboardData?.alertas_stock || 0}
                                        </h3>
                                        <p style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                            {(dashboardData?.alertas_stock || 0) > 0 ? 'Productos con stock bajo' : 'Todos los productos OK'}
                                        </p>
                                    </div>
                                    <div style={{ fontSize: '2rem', opacity: 0.7 }}>⚠️</div>
                                </div>
                            </div>
                        </div>

                        {/* Segunda fila - Gráficos y tablas */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '2rem'
                        }}>
                            {/* Último Cierre */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                                    <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>ÚLTIMO CIERRE</h4>
                                </div>
                                {dashboardData?.ultimo_cierre?.fecha ? (
                                    <div>
                                        <p style={{ color: '#00ff88', fontSize: '1rem', fontWeight: '600' }}>
                                            {new Date(dashboardData.ultimo_cierre.fecha).toLocaleDateString('es-CO')}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '0.5rem', background: '#1a1a1a', borderRadius: '0.5rem' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Diferencia:</span>
                                            <span style={{ color: (dashboardData.ultimo_cierre.diferencia || 0) === 0 ? '#00ff88' : '#ffaa00', fontSize: '0.8rem', fontWeight: '600' }}>
                                                ${(dashboardData.ultimo_cierre.diferencia || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>No hay cierres registrados</p>
                                )}
                            </div>

                            {/* Últimas Ventas */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>🕐</span>
                                    <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>ÚLTIMAS VENTAS</h4>
                                </div>
                                {ultimasVentas.length > 0 ? (
                                    <div style={{ overflow: 'auto', maxHeight: '200px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                    <th style={{ padding: '0.5rem 0', textAlign: 'left', color: '#64748b', fontSize: '0.65rem' }}>FECHA</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.65rem' }}>TOTAL</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.65rem' }}>PAGO</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ultimasVentas.map((venta) => (
                                                    <tr key={venta.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                        <td style={{ padding: '0.5rem 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                                                            {new Date(venta.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#00ff88' }}>
                                                            ${venta.total.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>
                                                            {venta.metodo_pago === 'efectivo' ? '💰' : '💳'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>No hay ventas recientes</p>
                                )}
                            </div>
                        </div>

                        {/* Tercera fila - Distribución de pagos */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {/* Distribución de Métodos de Pago */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>💳</span>
                                    <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>MÉTODOS DE PAGO (HOY)</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>💰 Efectivo</span>
                                            <span style={{ color: '#00ff88', fontSize: '0.8rem', fontWeight: '600' }}>
                                                ${(dashboardData?.ventas_hoy.efectivo || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ background: '#1a1a1a', borderRadius: '0.5rem', height: '6px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${((dashboardData?.ventas_hoy.efectivo || 0) / (dashboardData?.ventas_hoy.total_ingresos || 1)) * 100}%`, 
                                                height: '100%', 
                                                background: '#00ff88' 
                                            }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}>💳 Transferencia</span>
                                            <span style={{ color: '#00aaff', fontSize: '0.8rem', fontWeight: '600' }}>
                                                ${(dashboardData?.ventas_hoy.transferencia || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ background: '#1a1a1a', borderRadius: '0.5rem', height: '6px', overflow: 'hidden' }}>
                                            <div style={{ 
                                                width: `${((dashboardData?.ventas_hoy.transferencia || 0) / (dashboardData?.ventas_hoy.total_ingresos || 1)) * 100}%`, 
                                                height: '100%', 
                                                background: '#00aaff' 
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progreso del día */}
                            <div style={{
                                background: 'linear-gradient(135deg, #0a0a0a, #0f0f0f)',
                                border: '1px solid rgba(0, 255, 136, 0.15)',
                                borderRadius: '1rem',
                                padding: '1.25rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>🎯</span>
                                    <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>META DEL DÍA</h4>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Progreso</span>
                                        <span style={{ color: '#00ff88', fontSize: '0.8rem', fontWeight: '600' }}>
                                            ${(dashboardData?.ventas_hoy.total_ingresos || 0).toLocaleString()} / $5,000,000
                                        </span>
                                    </div>
                                    <div style={{ background: '#1a1a1a', borderRadius: '0.5rem', height: '8px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${Math.min(((dashboardData?.ventas_hoy.total_ingresos || 0) / 5000000) * 100, 100)}%`, 
                                            height: '100%', 
                                            background: 'linear-gradient(90deg, #00ff88, #00cc66)' 
                                        }} />
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '0.5rem', textAlign: 'center' }}>
                                        {Math.round(((dashboardData?.ventas_hoy.total_ingresos || 0) / 5000000) * 100)}% de la meta alcanzada
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'ventas':
                return <Ventas />;
            case 'inventario':
                return <Inventario />;
            case 'productos':
                return <Productos isAdmin={isAdmin} />;
            case 'cierres':
                return <Cierres isAdmin={isAdmin} sedeId={sedeId} sedeNombre={sedeNombre} />;
            case 'sedes':
                return isAdmin ? <Sedes /> : <div className="welcome-card"><h3>⛔ Acceso Restringido</h3><p>No tienes permisos para ver esta sección.</p></div>;
            case 'usuarios':
                return isAdmin ? <Usuarios /> : <div className="welcome-card"><h3>⛔ Acceso Restringido</h3><p>No tienes permisos para ver esta sección.</p></div>;
            case 'observaciones':
                return <Observaciones />;
            case 'danados':
                return <ProductosDanados />;
            case 'sueldos':
                return <Sueldos />;
            case 'gastos':
                return <Gastos />;
            case 'historial':
                return <HistorialAjustes />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000000', color: '#00ff88' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
                    <div>CARGANDO SISTEMA...</div>
                </div>
            </div>
        );
    }

    const getInitials = (name: string) => {
        return name?.charAt(0).toUpperCase() || 'U';
    };

    return (
        <div className="dashboard-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <aside className="sidebar" style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor"/>
                        </svg>
                    </div>
                    <span className="sidebar-logo-text">VAPERKING</span>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '0.5rem', background: isAdmin ? 'rgba(0, 255, 136, 0.1)' : 'rgba(100, 100, 100, 0.1)', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <span style={{ color: isAdmin ? '#00ff88' : '#94a3b8', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase' }}>
                        {isAdmin ? '👑 ADMINISTRADOR' : '🛒 VENDEDOR'}
                    </span>
                    {isVendedor && sedeNombre && (
                        <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Sede: {sedeNombre}
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                            onClick={() => setActiveMenu(item.id)}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </nav>
            </aside>

            <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="dashboard-header" style={{ flexShrink: 0 }}>
                    <div className="header-title">
                        {menuItems.find(m => m.id === activeMenu)?.label || 'Dashboard'}
                    </div>
                    <div className="user-menu">
                        <div className="user-avatar">
                            {getInitials(usuario?.nombre_completo || 'U')}
                        </div>
                        <span className="user-name">{usuario?.nombre_completo}</span>
                        <span className="user-role-badge" style={{ background: isAdmin ? 'rgba(0, 255, 136, 0.15)' : 'rgba(100, 100, 100, 0.15)', color: isAdmin ? '#00ff88' : '#94a3b8' }}>
                            {usuario?.rol}
                        </span>
                        <button onClick={handleLogout} className="btn-logout">
                            SALIR
                        </button>
                    </div>
                </header>

                <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.5rem' }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;