import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../context/PermisosContext';

interface Producto {
    id: number;
    sku: string;
    nombre: string;
    descripcion: string | null;
    categoria_id: number | null;
    precio_costo: number;
    precio_venta: number;
    stock_minimo: number;
    activo: boolean;
    created_at: string;
    categoria?: Categoria;
}

interface Categoria {
    id: number;
    nombre: string;
    descripcion: string | null;
    padre_id: number | null;
}

interface ProductosProps {
    isAdmin: boolean;
}

const Productos: React.FC<ProductosProps> = ({ isAdmin }) => {
    const { tienePermiso } = usePermisos();
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
    const [formData, setFormData] = useState({
        sku: '',
        nombre: '',
        descripcion: '',
        categoria_id: null as number | null,
        precio_costo: '',
        precio_venta: '',
        stock_minimo: 5
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
    const [showCategoriaModal, setShowCategoriaModal] = useState(false);
    const [categoriaForm, setCategoriaForm] = useState({ nombre: '', descripcion: '' });

    // Permisos
    const puedeCrear = isAdmin || tienePermiso('productos_crear');
    const puedeEditar = isAdmin || tienePermiso('productos_editar');
    const puedeEliminar = isAdmin || tienePermiso('productos_eliminar');

    useEffect(() => {
        cargarProductos();
        cargarCategorias();
    }, []);

    const cargarProductos = async () => {
        try {
            const response = await apiClient.get('/productos/');
            setProductos(response.data);
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
            console.error('Error cargando categorias:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                sku: formData.sku,
                nombre: formData.nombre,
                descripcion: formData.descripcion || undefined,
                categoria_id: formData.categoria_id,
                precio_costo: parseFloat(formData.precio_costo),
                precio_venta: parseFloat(formData.precio_venta),
                stock_minimo: parseInt(formData.stock_minimo.toString())
            };

            if (editingProduct) {
                await apiClient.put(`/productos/${editingProduct.id}`, data);
                alert('✅ Producto actualizado correctamente');
            } else {
                await apiClient.post('/productos/', data);
                alert('✅ Producto creado correctamente');
            }
            setShowModal(false);
            setEditingProduct(null);
            setFormData({ sku: '', nombre: '', descripcion: '', categoria_id: null, precio_costo: '', precio_venta: '', stock_minimo: 5 });
            cargarProductos();
        } catch (error: any) {
            console.error('Error guardando producto:', error);
            alert(error.response?.data?.detail || 'Error al guardar el producto');
        }
    };

    const handleDelete = async () => {
        if (!productoAEliminar) return;
        try {
            await apiClient.delete(`/productos/${productoAEliminar.id}`);
            alert('✅ Producto desactivado correctamente');
            setShowDeleteModal(false);
            setProductoAEliminar(null);
            cargarProductos();
        } catch (error) {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto');
        }
    };

    const handleCategoriaSubmit = async () => {
        try {
            await apiClient.post('/productos/categorias/', categoriaForm);
            alert('✅ Categoría creada correctamente');
            setShowCategoriaModal(false);
            setCategoriaForm({ nombre: '', descripcion: '' });
            cargarCategorias();
        } catch (error: any) {
            console.error('Error creando categoría:', error);
            alert(error.response?.data?.detail || 'Error al crear la categoría');
        }
    };

    const openEditModal = (producto: Producto) => {
        setEditingProduct(producto);
        setFormData({
            sku: producto.sku,
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            categoria_id: producto.categoria_id,
            precio_costo: producto.precio_costo.toString(),
            precio_venta: producto.precio_venta.toString(),
            stock_minimo: producto.stock_minimo
        });
        setShowModal(true);
    };

    const openDeleteModal = (producto: Producto) => {
        setProductoAEliminar(producto);
        setShowDeleteModal(true);
    };

    // Filtrar productos
    const productosFiltrados = productos.filter(p => {
        const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategoria = filtroCategoria ? p.categoria_id === filtroCategoria : true;
        return matchSearch && matchCategoria;
    });

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO PRODUCTOS...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🏷️ PRODUCTOS</h3>
                    <p style={styles.subtitle}>Gestiona el catálogo de productos de tu tienda</p>
                </div>
                <div style={styles.headerActions}>
                    <button
                        onClick={() => setShowCategoriaModal(true)}
                        style={styles.btnSecondary}
                    >
                        📂 Nueva Categoría
                    </button>
                    {puedeCrear && (
                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setFormData({ sku: '', nombre: '', descripcion: '', categoria_id: null, precio_costo: '', precio_venta: '', stock_minimo: 5 });
                                setShowModal(true);
                            }}
                            style={styles.btnPrimary}
                        >
                            + NUEVO PRODUCTO
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros */}
            <div style={styles.filtersContainer}>
                <div style={styles.searchContainer}>
                    <span style={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o SKU..."
                        style={styles.searchInput}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={styles.clearSearch}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <select
                    value={filtroCategoria || ''}
                    onChange={(e) => setFiltroCategoria(e.target.value ? parseInt(e.target.value) : null)}
                    style={styles.filterSelect}
                >
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
                <span style={styles.resultCount}>
                    {productosFiltrados.length} productos
                </span>
            </div>

            {/* Tabla de productos */}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tableHeader}>
                            <th style={styles.th}>SKU</th>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Categoría</th>
                            <th style={styles.th}>Costo</th>
                            <th style={styles.th}>Venta</th>
                            <th style={styles.th}>Stock Min</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={styles.emptyState}>
                                    {searchTerm || filtroCategoria ? 'No hay productos que coincidan con los filtros' : 'No hay productos registrados'}
                                </td>
                            </tr>
                        ) : (
                            productosFiltrados.map((p) => (
                                <tr key={p.id} style={styles.tableRow}>
                                    <td style={styles.td}>
                                        <span style={styles.skuBadge}>{p.sku}</span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.productName}>{p.nombre}</div>
                                        {p.descripcion && (
                                            <div style={styles.productDesc}>{p.descripcion}</div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {p.categoria_id ? (
                                            <span style={styles.categoryBadge}>
                                                {categorias.find(c => c.id === p.categoria_id)?.nombre || 'Sin categoría'}
                                            </span>
                                        ) : (
                                            <span style={styles.noCategory}>Sin categoría</span>
                                        )}
                                    </td>
                                    <td style={{ ...styles.td, ...styles.priceCell }}>
                                        ${formatearMoneda(p.precio_costo)}
                                    </td>
                                    <td style={{ ...styles.td, ...styles.priceCell, ...styles.salePrice }}>
                                        ${formatearMoneda(p.precio_venta)}
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        {p.stock_minimo}
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <span style={{
                                            ...styles.statusBadge,
                                            ...(p.activo ? styles.statusActive : styles.statusInactive)
                                        }}>
                                            {p.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </span>
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        {puedeEditar && (
                                            <button
                                                onClick={() => openEditModal(p)}
                                                style={styles.actionBtn}
                                                title="Editar producto"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                        {puedeEliminar && (
                                            <button
                                                onClick={() => openDeleteModal(p)}
                                                style={{ ...styles.actionBtn, ...styles.actionDelete }}
                                                title="Eliminar producto"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Producto */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {editingProduct ? '✏️ EDITAR PRODUCTO' : '➕ NUEVO PRODUCTO'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProduct(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>SKU *</label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: PROD-001"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>NOMBRE *</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: Vaporesso XROS 3"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>DESCRIPCIÓN</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Descripción del producto..."
                                    rows={3}
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>CATEGORÍA</label>
                                    <select
                                        value={formData.categoria_id || ''}
                                        onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? parseInt(e.target.value) : null })}
                                        style={styles.formSelect}
                                    >
                                        <option value="">Sin categoría</option>
                                        {categorias.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>STOCK MÍNIMO</label>
                                    <input
                                        type="number"
                                        value={formData.stock_minimo}
                                        onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                                        style={styles.formInput}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>PRECIO COSTO *</label>
                                    <input
                                        type="number"
                                        value={formData.precio_costo}
                                        onChange={(e) => setFormData({ ...formData, precio_costo: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="100"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>PRECIO VENTA *</label>
                                    <input
                                        type="number"
                                        value={formData.precio_venta}
                                        onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="100"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProduct(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSubmit}
                                style={styles.btnSave}
                            >
                                {editingProduct ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {showDeleteModal && productoAEliminar && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '400px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ ...styles.modalTitle, color: '#ff4444' }}>⚠️ CONFIRMAR ELIMINACIÓN</h3>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setProductoAEliminar(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={styles.deleteText}>
                                ¿Estás seguro de que deseas desactivar el producto <strong>"{productoAEliminar.nombre}"</strong>?
                            </p>
                            <p style={styles.deleteSubtext}>
                                El producto será desactivado y no aparecerá en las ventas.
                            </p>
                        </div>
                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setProductoAEliminar(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleDelete}
                                style={styles.btnDanger}
                            >
                                ELIMINAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Categoría */}
            {showCategoriaModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: '450px' }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>📂 NUEVA CATEGORÍA</h3>
                            <button
                                onClick={() => {
                                    setShowCategoriaModal(false);
                                    setCategoriaForm({ nombre: '', descripcion: '' });
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
                                    value={categoriaForm.nombre}
                                    onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })}
                                    style={styles.formInput}
                                    placeholder="Ej: Accesorios"
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>DESCRIPCIÓN</label>
                                <textarea
                                    value={categoriaForm.descripcion}
                                    onChange={(e) => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Descripción de la categoría..."
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowCategoriaModal(false);
                                    setCategoriaForm({ nombre: '', descripcion: '' });
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleCategoriaSubmit}
                                style={styles.btnSave}
                            >
                                CREAR CATEGORÍA
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
    btnSecondary: {
        background: 'transparent',
        color: '#94a3b8',
        border: '1px solid #1e293b',
        padding: '0.5rem 1rem',
        borderRadius: '0.47rem',
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
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        minWidth: '200px',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        padding: '0 0.5rem',
        position: 'relative',
    },
    searchIcon: {
        color: '#64748b',
        fontSize: '0.8rem',
        marginRight: '0.5rem',
    },
    searchInput: {
        flex: 1,
        background: 'none',
        border: 'none',
        padding: '0.5rem 0',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        outline: 'none',
    },
    clearSearch: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: '0.8rem',
        padding: '0.25rem',
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
    tableContainer: {
        overflow: 'auto',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        background: '#0f0f0f',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem',
    },
    tableHeader: {
        borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a',
    },
    th: {
        padding: '0.7rem 0.7rem',
        textAlign: 'left',
        color: '#64748b',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '600',
        position: 'sticky',
        top: 0,
        background: '#0a0a0a',
        zIndex: 1,
    },
    td: {
        padding: '0.7rem 0.7rem',
        borderBottom: '1px solid #1a1a1a',
        fontSize: '0.8rem',
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
        borderBottom: 'none',
    },
    skuBadge: {
        background: '#1a1a1a',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.7rem',
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
    productName: {
        color: '#e2e8f0',
        fontWeight: '500',
    },
    productDesc: {
        color: '#64748b',
        fontSize: '0.65rem',
        marginTop: '0.15rem',
    },
    categoryBadge: {
        background: 'rgba(0, 255, 136, 0.08)',
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.7rem',
        color: '#00ff88',
    },
    noCategory: {
        color: '#64748b',
        fontSize: '0.7rem',
    },
    priceCell: {
        textAlign: 'right',
        fontFamily: 'monospace',
    },
    salePrice: {
        color: '#00ff88',
        fontWeight: '600',
    },
    statusBadge: {
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.65rem',
        fontWeight: '500',
    },
    statusActive: {
        background: 'rgba(0, 255, 136, 0.15)',
        color: '#00ff88',
    },
    statusInactive: {
        background: 'rgba(255, 68, 68, 0.15)',
        color: '#ff4444',
    },
    actionBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
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
        maxWidth: '600px',
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
        transition: 'color 0.2s ease',
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
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
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
};

export default Productos;