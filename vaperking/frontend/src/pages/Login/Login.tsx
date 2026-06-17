import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import type { Usuario } from '../../store/authStore';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState({ username: false, password: false });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/auth/login', { username, password });
            const { access_token, usuario } = response.data;
            login(access_token, usuario as Usuario);
            navigate('/dashboard');
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Fondo con gradiente */}
            <div className="login-bg">
                <div className="login-bg-glow" />
            </div>

            <div className="login-card">
                {/* Logo */}
                <div className="login-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    </svg>
                    <span>VAPERKING</span>
                </div>
                <p className="login-subtitle">Sistema de gestión</p>

                <div className="login-divider" />

                {/* Formulario */}
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label>Usuario</label>
                        <div className={`login-input ${isFocused.username ? 'focused' : ''}`}>
                            <span className="login-icon">👤</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onFocus={() => setIsFocused({ ...isFocused, username: true })}
                                onBlur={() => setIsFocused({ ...isFocused, username: false })}
                                placeholder="Ingresa tu usuario"
                                required
                            />
                        </div>
                    </div>

                    <div className="login-field">
                        <label>Contraseña</label>
                        <div className={`login-input ${isFocused.password ? 'focused' : ''}`}>
                            <span className="login-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setIsFocused({ ...isFocused, password: true })}
                                onBlur={() => setIsFocused({ ...isFocused, password: false })}
                                placeholder="Ingresa tu contraseña"
                                required
                            />
                            <button
                                type="button"
                                className="login-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'ACCEDIENDO...' : 'INGRESAR'}
                    </button>
                </form>

                <div className="login-footer">
                    <span className="login-cred-label">🔐 Acceso de prueba</span>
                    <div className="login-creds">
                        <span className="login-cred">
                            <strong>Admin:</strong> Eduar_admin
                        </span>
                        <span className="login-cred">
                            <strong>Vendedor:</strong> villavp
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;