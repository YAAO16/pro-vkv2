import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';

interface Producto {
    id: number;
    sku: string;
    nombre: string;
    descripcion: string;
    categoria_id: number;
    precio_costo: number;
    precio_venta: number;
    stock_minimo: number;
    activo: boolean;
}

interface Categoria {
    id: number;
    nombre: string;
}

const Productos: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<number | ''>('');
    const [formData, setFormData] = useState({
        sku: '',
        nombre: '',
        descripcion: '',
        categoria_id: 1,
        precio_costo: 0,
        precio_venta: 0,
        stock_minimo: 5
    });

    useEffect(() => {
        cargarProductos();
        cargarCategorias();
    }, []);

    useEffect(() => {
        filtrarProductos();
    }, [searchTerm, filterCategoria, productos]);

    const cargarProductos = async () => {
        try {
            const response = await apiClient.get('/productos/');
            setProductos(response.data);
            setProductosFiltrados(response.data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarCategorias = async () => {
        try {
            const response = await apiClient.get('/productos/categorias/');
            setCategorias(response.data);
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    };

    const filtrarProductos = () => {
        let filtrados = [...productos];
        
        // Filtro por búsqueda (SKU o Nombre)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtrados = filtrados.filter(p => 
                p.sku.toLowerCase().includes(term) || 
                p.nombre.toLowerCase().includes(term)
            );
        }
        
        // Filtro por categoría
        if (filterCategoria) {
            filtrados = filtrados.filter(p => p.categoria_id === filterCategoria);
        }
        
        setProductosFiltrados(filtrados);
    };

    const limpiarFiltros = () => {
        setSearchTerm('');
        setFilterCategoria('');
        setProductosFiltrados(productos);
    };

    const handleSubmit = async () => {
        try {
            if (editingProducto) {
                await apiClient.put(`/productos/${editingProducto.id}`, formData);
            } else {
                await apiClient.post('/productos/', formData);
            }
            setShowModal(false);
            setEditingProducto(null);
            setFormData({ sku: '', nombre: '', descripcion: '', categoria_id: 1, precio_costo: 0, precio_venta: 0, stock_minimo: 5 });
            cargarProductos();
        } catch (error) {
            console.error('Error guardando producto:', error);
            alert('Error al guardar el producto');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Desactivar este producto?')) {
            try {
                await apiClient.delete(`/productos/${id}`);
                cargarProductos();
            } catch (error) {
                console.error('Error desactivando producto:', error);
            }
        }
    };

    const openEditModal = (producto: Producto) => {
        setEditingProducto(producto);
        setFormData({
            sku: producto.sku,
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            categoria_id: producto.categoria_id || 1,
            precio_costo: producto.precio_costo,
            precio_venta: producto.precio_venta,
            stock_minimo: producto.stock_minimo
        });
        setShowModal(true);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1.9rem', color: '#00ff88', fontSize: '0.9rem' }}>CARGANDO PRODUCTOS...</div>;

    return (
        <div style={{ padding: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.42rem', flexWrap: 'wrap', gap: '0.95rem' }}>
                <h3 style={{ color: '#00ff88', fontSize: '1.18rem' }}>🔧 CATÁLOGO DE PRODUCTOS</h3>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditingProducto(null);
                            setFormData({ sku: '', nombre: '', descripcion: '', categoria_id: 1, precio_costo: 0, precio_venta: 0, stock_minimo: 5 });
                            setShowModal(true);
                        }}
                        className="btn-login"
                        style={{ width: 'auto', padding: '0.47rem 0.95rem', fontSize: '0.8rem' }}
                    >
                        + NUEVO PRODUCTO
                    </button>
                )}
            </div>

            {!isAdmin && (
                <div style={{ marginBottom: '0.95rem', padding: '0.47rem', background: 'rgba(100,100,100,0.1)', borderRadius: '0.47rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                    👁️ Modo solo lectura - Los vendedores solo pueden visualizar productos
                </div>
            )}

            {/* Barra de búsqueda y filtros */}
            <div style={{ 
                display: 'flex', 
                gap: '0.95rem', 
                marginBottom: '1.42rem', 
                flexWrap: 'wrap',
                alignItems: 'flex-end'
            }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                    <label className="input-label" style={{ fontSize: '0.57rem', marginBottom: '0.2rem', display: 'block' }}>🔍 BUSCAR</label>
                    <input
                        type="text"
                        placeholder="Buscar por SKU o Nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.47rem',
                            background: '#0a0a0a',
                            border: '1px solid #1e293b',
                            borderRadius: '0.47rem',
                            color: 'white',
                            fontSize: '0.8rem'
                        }}
                    />
                </div>
                
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="input-label" style={{ fontSize: '0.57rem', marginBottom: '0.2rem', display: 'block' }}>📁 CATEGORÍA</label>
                    <select
                        value={filterCategoria}
                        onChange={(e) => setFilterCategoria(e.target.value ? parseInt(e.target.value) : '')}
                        style={{
                            width: '100%',
                            padding: '0.47rem',
                            background: '#0a0a0a',
                            border: '1px solid #1e293b',
                            borderRadius: '0.47rem',
                            color: 'white',
                            fontSize: '0.8rem'
                        }}
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <button
                        onClick={limpiarFiltros}
                        style={{
                            padding: '0.47rem 0.95rem',
                            background: 'transparent',
                            border: '1px solid #1e293b',
                            borderRadius: '0.47rem',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            height: '38px'
                        }}
                    >
                        LIMPIAR FILTROS
                    </button>
                </div>
            </div>

            {/* Resultados de búsqueda */}
            <div style={{ marginBottom: '0.7rem', fontSize: '0.7rem', color: '#64748b' }}>
                {productosFiltrados.length} producto(s) encontrado(s)
            </div>

            <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>SKU</th>
                            <th style={{ padding: '0.7rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem' }}>Nombre</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>P. Venta</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>P. Costo</th>
                            <th style={{ padding: '0.7rem', textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>Margen</th>
                            <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Estado</th>
                            {isAdmin && <th style={{ padding: '0.7rem', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.map((p) => {
                            const margen = ((p.precio_venta - p.precio_costo) / p.precio_costo * 100).toFixed(0);
                            return (
                                <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                    <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{p.sku}</td>
                                    <td style={{ padding: '0.7rem', fontSize: '0.76rem' }}>{p.nombre}</td>
                                    <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', color: '#00ff88' }}>${p.precio_venta.toLocaleString()}</td>
                                    <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem' }}>${p.precio_costo.toLocaleString()}</td>
                                    <td style={{ padding: '0.7rem', textAlign: 'right', fontSize: '0.76rem', color: '#00ff88' }}>{margen}%</td>
                                    <td style={{ padding: '0.7rem', textAlign: 'center', fontSize: '0.76rem' }}>
                                        {p.activo ? (
                                            <span style={{ color: '#00ff88' }}>✓ Activo</span>
                                        ) : (
                                            <span style={{ color: '#ff4444' }}>✗ Inactivo</span>
                                        )}
                                    </td>
                                    {isAdmin && (
                                        <td style={{ padding: '0.7rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => openEditModal(p)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.47rem', fontSize: '1rem' }}
                                                title="Editar producto"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#ff4444' }}
                                                title="Eliminar producto"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de Producto */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#0a0a0a',
                        border: '1px solid #00ff88',
                        borderRadius: '0.95rem',
                        padding: '1.9rem',
                        width: '90%',
                        maxWidth: '475px',
                        maxHeight: '76vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ color: '#00ff88', marginBottom: '0.95rem', fontSize: '1.18rem' }}>
                            {editingProducto ? '✏️ EDITAR PRODUCTO' : '➕ NUEVO PRODUCTO'}
                        </h3>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>SKU</label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>NOMBRE</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>DESCRIPCIÓN</label>
                            <textarea
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                className="input-field"
                                rows={3}
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>CATEGORÍA</label>
                            <select
                                value={formData.categoria_id}
                                onChange={(e) => setFormData({ ...formData, categoria_id: parseInt(e.target.value) })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            >
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.95rem', marginBottom: '0.95rem' }}>
                            <div>
                                <label className="input-label" style={{ fontSize: '0.57rem' }}>PRECIO COSTO</label>
                                <input
                                    type="number"
                                    value={formData.precio_costo}
                                    onChange={(e) => setFormData({ ...formData, precio_costo: parseFloat(e.target.value) })}
                                    className="input-field"
                                    style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                                />
                            </div>
                            <div>
                                <label className="input-label" style={{ fontSize: '0.57rem' }}>PRECIO VENTA</label>
                                <input
                                    type="number"
                                    value={formData.precio_venta}
                                    onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) })}
                                    className="input-field"
                                    style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.95rem' }}>
                            <label className="input-label" style={{ fontSize: '0.57rem' }}>STOCK MÍNIMO</label>
                            <input
                                type="number"
                                value={formData.stock_minimo}
                                onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) })}
                                className="input-field"
                                style={{ padding: '0.47rem', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.95rem', marginTop: '0.95rem' }}>
                            <button onClick={handleSubmit} className="btn-login" style={{ flex: 1, padding: '0.47rem', fontSize: '0.76rem' }}>
                                {editingProducto ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProducto(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.47rem',
                                    background: 'transparent',
                                    border: '1px solid #1e293b',
                                    borderRadius: '0.47rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.76rem'
                                }}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Productos;