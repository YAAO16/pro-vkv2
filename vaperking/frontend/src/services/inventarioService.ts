// frontend/src/services/inventarioService.ts
import apiClient from '../api/axiosClient';

export interface ProductoStock {
    producto_id: number;
    sku: string;
    nombre: string;
    stock_actual: number;
    stock_minimo: number;
    alerta: boolean;
}

export interface AjusteStock {
    sede_id: number;
    producto_id: number;
    cantidad: number;
    tipo: 'entrada' | 'salida';
    motivo?: string;
}

export interface Movimiento {
    id: number;
    fecha: string;
    sede_id: number;
    nombre_sede: string;
    producto_id: number;
    nombre_producto: string;
    sku: string;
    stock_inicio: number;
    entradas: number;
    salidas: number;
    stock_final: number;
    movimiento_neto: number;
}

const inventarioService = {
    async getStockActual(sedeId?: number | null): Promise<ProductoStock[]> {
        try {
            const params = sedeId ? { sede_id: sedeId } : {};
            const response = await apiClient.get('/stock-actual', { params });
            return response.data;
        } catch (error) {
            console.error('Error obteniendo stock actual:', error);
            throw error;
        }
    },

    async registrarAjuste(ajuste: AjusteStock): Promise<void> {
        try {
            await apiClient.post('/ajuste', ajuste);
        } catch (error) {
            console.error('Error registrando ajuste:', error);
            throw error;
        }
    },

    async getAlertas(sedeId?: number | null): Promise<ProductoStock[]> {
        try {
            const params = sedeId ? { sede_id: sedeId } : {};
            const response = await apiClient.get('/inventario/alertas', { params });
            return response.data.alertas || [];
        } catch (error) {
            console.error('Error obteniendo alertas:', error);
            return [];
        }
    },

    async getHistorial(
        sedeId?: number | null,
        productoId?: number | null,
        fechaInicio?: string,
        fechaFin?: string,
        limit: number = 500
    ): Promise<Movimiento[]> {
        try {
            const params: any = { limit };
            if (sedeId) params.sede_id = sedeId;
            if (productoId) params.producto_id = productoId;
            if (fechaInicio) params.fecha_inicio = fechaInicio;
            if (fechaFin) params.fecha_fin = fechaFin;
            
            // Cambiar la URL de '/inventario/historial' a '/historial'
            const response = await apiClient.get('/historial', { params });
            return response.data;
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    },

    async getMovimientos(productoId: number, sedeId?: number | null, limit: number = 50): Promise<Movimiento[]> {
        try {
            const params: any = { limit };
            if (sedeId) params.sede_id = sedeId;
            const response = await apiClient.get(`/inventario/movimientos/${productoId}`, { params });
            return response.data;
        } catch (error) {
            console.error('Error obteniendo movimientos:', error);
            return [];
        }
    }
};

export default inventarioService;