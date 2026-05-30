import apiClient from './axiosClient';

export const api = {
    // Auth
    login: (username: string, password: string) => 
        apiClient.post('/auth/login', { username, password }),
    getMe: () => apiClient.get('/auth/me'),
    
    // Sedes
    getSedes: () => apiClient.get('/sedes/'),
    getSede: (id: number) => apiClient.get(`/sedes/${id}`),
    createSede: (data: any) => apiClient.post('/sedes/', data),
    updateSede: (id: number, data: any) => apiClient.put(`/sedes/${id}`, data),
    
    // Productos
    getProductos: () => apiClient.get('/productos'),
    getCategorias: () => apiClient.get('/productos/categorias/'),
    createProducto: (data: any) => apiClient.post('/productos/', data),
    updateProducto: (id: number, data: any) => apiClient.put(`/productos/${id}`, data),
    deleteProducto: (id: number) => apiClient.delete(`/productos/${id}`),
    
    // Ventas
    getVentas: (params?: any) => apiClient.get('/ventas/', { params }),  // /api/v1/ventas/
    getVentaDetalles: (id: number) => apiClient.get(`/ventas/${id}/detalles`),  // /api/v1/ventas/1/detalles
    createVenta: (data: any) => apiClient.post('/ventas/', data),  // /api/v1/ventas/
    deleteVenta: (id: number, motivo: string) => apiClient.delete(`/ventas/${id}`, { params: { motivo } }),  // /api/v1/ventas/1?motivo=...
        
    // Inventario
    getStockActual: (sede_id?: number) => apiClient.get('/inventario/stock-actual', { params: { sede_id } }),
    ajusteStock: (data: any) => apiClient.post('/inventario/ajuste', data),
    getAlertasStock: (sede_id?: number) => apiClient.get('/inventario/alertas', { params: { sede_id } }),
    
    // Cierres
    getCierres: (sede_id?: number) => apiClient.get('/cierres/', { params: { sede_id } }),
    createCierre: (data: any) => apiClient.post('/cierres/', data),
    getPreviewCierre: (sede_id: number, fecha: string) => 
        apiClient.get('/cierres/preview', { params: { sede_id, fecha } }),
    
    // Reportes
    getDashboard: (sede_id?: number) => apiClient.get('/reportes/dashboard', { params: { sede_id } }),
    getReporteVentas: (fecha_inicio: string, fecha_fin: string, sede_id?: number) => 
        apiClient.get('/reportes/ventas', { params: { fecha_inicio, fecha_fin, sede_id } }),
    getTopProductos: (fecha_inicio: string, fecha_fin: string, sede_id?: number, limite?: number) => 
        apiClient.get('/reportes/productos-mas-vendidos', { params: { fecha_inicio, fecha_fin, sede_id, limite } }),
    
    // Usuarios (solo admin)
    getUsuarios: () => apiClient.get('/usuarios/'),
    getUsuario: (id: number) => apiClient.get(`/usuarios/${id}`),
    createUsuario: (data: any) => apiClient.post('/usuarios/', data),
    updateUsuario: (id: number, data: any) => apiClient.put(`/usuarios/${id}`, data),
    deleteUsuario: (id: number) => apiClient.delete(`/usuarios/${id}`),
};

export default api;