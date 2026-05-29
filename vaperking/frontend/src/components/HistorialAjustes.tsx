import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';

interface Movimiento {
    id: number;
    fecha: string;
    fecha_original: string;
    sede_id: number;
    sede_nombre: string;
    producto_id: number;
    producto_nombre: string;
    producto_sku: string;
    stock_anterior: number;
    cantidad: number;
    tipo: string;
    icono: string;
    color: string;
    stock_nuevo: number;
    stock_final_bd: number;
    operador: string;
    cambio_stock: string;
    detalle_cambio: string;
    detalle: string;
    resumen: string;
}

const HistorialAjustes: React.FC = () => {
    const { usuario } = useAuthStore();
    const isAdmin = usuario?.rol === 'admin' || usuario?.rol === 'ADMIN';
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [filteredMovimientos, setFilteredMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sedes, setSedes] = useState<any[]>([]);
    const [selectedSede, setSelectedSede] = useState<number | null>(null);
    const [selectedProducto, setSelectedProducto] = useState<string>('');
    const [productos, setProductos] = useState<any[]>([]);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [resumen, setResumen] = useState({ entradas: 0, salidas: 0, total: 0 });

    useEffect(() => {
        if (!isAdmin) {
            setError('No tienes permisos para ver el historial de ajustes');
            setLoading(false);
        } else {
            cargarHistorial();
            cargarSedes();
            cargarProductos();
        }
    }, [isAdmin, selectedSede, selectedProducto, fechaInicio, fechaFin, tipoFiltro]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = movimientos.filter(m => 
                m.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.producto_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.sede_nombre.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredMovimientos(filtered);
            setTotalRegistros(filtered.length);
            
            const totalEntradas = filtered.reduce((sum, m) => sum + (m.tipo === 'entrada' ? m.cantidad : 0), 0);
            const totalSalidas = filtered.reduce((sum, m) => sum + (m.tipo === 'salida' ? m.cantidad : 0), 0);
            setResumen({
                entradas: totalEntradas,
                salidas: totalSalidas,
                total: totalEntradas - totalSalidas
            });
        } else {
            setFilteredMovimientos(movimientos);
            setTotalRegistros(movimientos.length);
        }
    }, [searchTerm, movimientos]);

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            const sedesData = response.data.sedes || response.data;
            setSedes(Array.isArray(sedesData) ? sedesData : []);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const cargarProductos = async () => {
        try {
            const response = await apiClient.get('/productos/');
            setProductos(response.data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    };

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            setError(null);
            const params: any = { limit: 1000 };
            if (selectedSede) params.sede_id = selectedSede;
            if (selectedProducto) params.producto_id = selectedProducto;
            if (fechaInicio) params.fecha_inicio = fechaInicio;
            if (fechaFin) params.fecha_fin = fechaFin;
            if (tipoFiltro) params.tipo = tipoFiltro;
            
            const response = await apiClient.get('/historial', { params });
            const data = response.data;
            setMovimientos(data);
            setFilteredMovimientos(data);
            setTotalRegistros(data.length);
            
            const totalEntradas = data.reduce((sum: number, m: Movimiento) => sum + (m.tipo === 'entrada' ? m.cantidad : 0), 0);
            const totalSalidas = data.reduce((sum: number, m: Movimiento) => sum + (m.tipo === 'salida' ? m.cantidad : 0), 0);
            setResumen({
                entradas: totalEntradas,
                salidas: totalSalidas,
                total: totalEntradas - totalSalidas
            });
        } catch (error: any) {
            console.error('Error cargando historial:', error);
            if (error.response?.status === 403) {
                setError('No tienes permisos para acceder a este recurso');
            } else {
                setError('Error al cargar el historial');
            }
        } finally {
            setLoading(false);
        }
    };

    const getTipoStyles = (tipo: string) => {
        if (tipo === 'entrada') {
            return { bg: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', icon: '➕', text: 'ENTRADA' };
        }
        return { bg: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', icon: '➖', text: 'SALIDA' };
    };

   const calcularStockNuevo = (mov: Movimiento) => {
        // Usar stock_final_bd si existe y es correcto, si no calcular
        if (mov.stock_final_bd && mov.stock_final_bd === (mov.stock_anterior + (mov.tipo === 'entrada' ? mov.cantidad : -mov.cantidad))) {
            return mov.stock_final_bd;
        }
        // Si no, calcular manualmente
        if (mov.tipo === 'entrada') {
            return mov.stock_anterior + mov.cantidad;
        }
        return mov.stock_anterior - mov.cantidad;
    };

    // Agrupar movimientos por fecha
    const movimientosPorFecha = filteredMovimientos.reduce((grupo: any, movimiento) => {
        const fecha = movimiento.fecha;
        if (!grupo[fecha]) {
            grupo[fecha] = [];
        }
        grupo[fecha].push(movimiento);
        return grupo;
    }, {});

    if (!isAdmin && !loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '3rem' }}>🔒</div>
                <h3 style={{ color: '#ff4444' }}>Acceso Denegado</h3>
                <p style={{ color: '#64748b' }}>No tienes permisos para ver el historial de ajustes.</p>
            </div>
        );
    }

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff88' }}>CARGANDO HISTORIAL...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: '#ff4444' }}>❌ {error}</div>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.2rem' }}>📋 HISTORIAL DE AJUSTES</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Total registros: {totalRegistros}
                </div>
            </div>

            {/* Resumen de movimientos */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{ padding: '1rem', background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>📦 TOTAL ENTRADAS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff88' }}>+{resumen.entradas}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255, 68, 68, 0.2)', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>📤 TOTAL SALIDAS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4444' }}>-{resumen.salidas}</div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(100, 100, 100, 0.05)', border: '1px solid rgba(100, 100, 100, 0.2)', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>🔄 VARIACIÓN TOTAL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: resumen.total >= 0 ? '#00ff88' : '#ff4444' }}>
                        {resumen.total >= 0 ? `+${resumen.total}` : resumen.total}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: '#0a0a0a',
                borderRadius: '0.5rem',
                border: '1px solid #1e293b'
            }}>
                <select
                    value={selectedSede || ''}
                    onChange={(e) => setSelectedSede(e.target.value ? parseInt(e.target.value) : null)}
                    style={{
                        padding: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}
                >
                    <option value="">Todas las sedes</option>
                    {sedes.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                </select>

                <select
                    value={selectedProducto}
                    onChange={(e) => setSelectedProducto(e.target.value)}
                    style={{
                        padding: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.8rem',
                        minWidth: '180px'
                    }}
                >
                    <option value="">Todos los productos</option>
                    {productos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>
                    ))}
                </select>

                <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                    style={{
                        padding: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}
                >
                    <option value="">Todos los movimientos</option>
                    <option value="entrada">➕ Solo entradas</option>
                    <option value="salida">➖ Solo salidas</option>
                </select>

                <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{
                        padding: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}
                    placeholder="Fecha inicio"
                />

                <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{
                        padding: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.8rem'
                    }}
                    placeholder="Fecha fin"
                />

                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Buscar producto, SKU o sede..."
                    style={{
                        padding: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontSize: '0.8rem',
                        minWidth: '200px'
                    }}
                />

                <button
                    onClick={() => {
                        setSelectedSede(null);
                        setSelectedProducto('');
                        setFechaInicio('');
                        setFechaFin('');
                        setTipoFiltro('');
                        setSearchTerm('');
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#1e293b',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                    }}
                >
                    LIMPIAR FILTROS
                </button>
            </div>

            {/* Tabla detallada de historial */}
            {filteredMovimientos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No hay movimientos registrados
                </div>
            ) : (
                <div style={{ overflow: 'auto' }}>
                    {Object.entries(movimientosPorFecha).map(([fecha, movs]: [string, any]) => {
                        const totalDia = movs.reduce((sum: number, m: Movimiento) => sum + (m.tipo === 'entrada' ? m.cantidad : -m.cantidad), 0);
                        return (
                            <div key={fecha} style={{ marginBottom: '1.5rem' }}>
                                {/* Cabecera del día */}
                                <div style={{
                                    background: '#1a1a1a',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.75rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderLeft: `4px solid ${totalDia >= 0 ? '#00ff88' : '#ff4444'}`
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: '#00ff88', fontSize: '1rem' }}>📅 {fecha}</span>
                                        <span style={{ marginLeft: '1rem', fontSize: '0.7rem', color: '#64748b' }}>
                                            {movs.length} movimiento{movs.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: totalDia >= 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>
                                        {totalDia >= 0 ? `+${totalDia}` : totalDia} unidades
                                    </div>
                                </div>

                                {/* Tabla del día */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #1a1a1a', background: '#0f0f0f' }}>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>SEDE</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>PRODUCTO</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>TIPO</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>CAMBIO DE STOCK</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>CANTIDAD</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>RESULTADO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movs.map((m: Movimiento) => {
                                            const tipoStyle = getTipoStyles(m.tipo);
                                            const stockNuevoCalculado = calcularStockNuevo(m);
                                            return (
                                                <tr key={m.id} style={{ borderBottom: '1px solid #1a1a1a', background: tipoStyle.bg }}>
                                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>
                                                        🏢 {m.sede_nombre}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>
                                                        <div><strong>{m.producto_nombre}</strong></div>
                                                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>SKU: {m.producto_sku}</div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                                                        <span style={{ 
                                                            color: tipoStyle.color, 
                                                            background: tipoStyle.bg,
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontWeight: 'bold',
                                                            display: 'inline-block'
                                                        }}>
                                                            {tipoStyle.icon} {tipoStyle.text}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            gap: '0.5rem',
                                                            fontFamily: 'monospace'
                                                        }}>
                                                            <span style={{ color: '#64748b' }}>{m.stock_anterior}</span>
                                                            <span style={{ color: tipoStyle.color, fontWeight: 'bold' }}>{m.operador}</span>
                                                            <span style={{ color: tipoStyle.color, fontWeight: 'bold' }}>{m.cantidad}</span>
                                                            <span style={{ color: '#64748b' }}>=</span>
                                                            <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '0.9rem' }}>{stockNuevoCalculado}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                            {m.stock_anterior} {m.operador} {m.cantidad} = {stockNuevoCalculado}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: tipoStyle.color }}>
                                                        {m.cantidad}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                                                        <div style={{ 
                                                            background: 'rgba(0, 255, 136, 0.1)', 
                                                            padding: '0.25rem 0.5rem', 
                                                            borderRadius: '0.25rem',
                                                            display: 'inline-block'
                                                        }}>
                                                            <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{stockNuevoCalculado}</span>
                                                            <span style={{ color: '#64748b', fontSize: '0.6rem' }}> unidades</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#0a0a0a' }}>
                                            <td colSpan={6} style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>
                                                📊 Total día: {totalDia >= 0 ? `+${totalDia}` : totalDia} unidades
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HistorialAjustes;