import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import type { Usuario } from '../../store/authStore';
import '../../App.css';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        <div className="login-container">
            <div className="vape-particles">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            width: Math.random() * 150 + 40 + 'px',
                            height: Math.random() * 150 + 40 + 'px',
                            left: Math.random() * 100 + '%',
                            top: Math.random() * 100 + '%',
                            animationDelay: Math.random() * 10 + 's',
                            animationDuration: Math.random() * 10 + 10 + 's'
                        }}
                    />
                ))}
            </div>

            <div className="login-card">
                <div className="logo-container">
                    <div className="logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none"/>
                            <path d="M12 2v20" stroke="currentColor"/>
                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                        </svg>
                    </div>
                    <h1 className="logo-text">VAPERKING</h1>
                    <p className="logo-subtitle">PREMIUM VAPE STORE</p>
                </div>

                {error && (
                    <div style={{ 
                        background: 'rgba(0, 255, 136, 0.15)', 
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        color: '#00ff88', 
                        padding: '0.6rem', 
                        borderRadius: '0.65rem', 
                        marginBottom: '1.25rem',
                        fontSize: '0.75rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">USUARIO</label>
                        <div className="input-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5"/>
                                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-field"
                                placeholder="Ingresa tu usuario"
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">CONTRASEÑA</label>
                        <div className="input-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="Ingresa tu contraseña"
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-login">
                        {loading ? 'ACCEDIENDO...' : 'INGRESAR'}
                    </button>
                </form>

                <div className="test-credentials">
                    <p>🔐 ACCESO DE PRUEBA</p>
                    <div>
                        <span className="credential-badge">
                            <span>Admin:</span> Eduar_admin / ******
                        </span>
                        <span className="credential-badge">
                            <span>Vendedor:</span> villavp / ******
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;