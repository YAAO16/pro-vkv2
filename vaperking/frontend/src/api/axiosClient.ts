import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api/v1',  // Cambia a 8000 si es necesario
    timeout: 30000,  // Aumenta el timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar el token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Para FormData, no establecer Content-Type
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            console.error('No tiene permisos para esta acción');
            alert('No tiene permisos suficientes');
        } else if (error.response?.status === 404) {
            console.error('Endpoint no encontrado:', error.config?.url);
        }
        return Promise.reject(error);
    }
);

export default apiClient;