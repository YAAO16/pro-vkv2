import apiClient from './axiosClient';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface Usuario {
    id: number;
    username: string;
    nombre_completo: string;
    rol: string;
    sede_id: number | null;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    usuario: Usuario;
}

export const authApi = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post('/auth/login', data);
        return response.data;
    },

    getMe: async (): Promise<Usuario> => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
};
