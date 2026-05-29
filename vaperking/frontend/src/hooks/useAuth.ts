import { useAuthStore } from '../store/authStore';
import api from '../api';

export const useAuth = () => {
    const { token, usuario, isAuthenticated, login, logout } = useAuthStore();

    const handleLogin = async (username: string, password: string) => {
        try {
            const response = await api.login(username, password);
            const { access_token, usuario: userData } = response.data;
            login(access_token, userData);
            return { success: true, error: null };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.detail || 'Error al iniciar sesión' };
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const isAdmin = usuario?.rol === 'ADMIN' || usuario?.rol === 'admin';
    const isVendedor = usuario?.rol === 'VENDEDOR' || usuario?.rol === 'vendedor';

    return {
        token,
        usuario,
        isAuthenticated,
        isAdmin,
        isVendedor,
        sedeId: usuario?.sede_id ?? null,
        login: handleLogin,
        logout: handleLogout,
    };
};

export default useAuth;