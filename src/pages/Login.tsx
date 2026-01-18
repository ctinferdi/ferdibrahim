import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass">
                <div className="auth-header">
                </div>

                {error && (
                    <div className="error-message">
                        {error.includes('Invalid login credentials')
                            ? 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.'
                            : error.includes('Email not confirmed')
                                ? 'Lütfen giriş yapmadan önce e-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı onaylayın.'
                                : error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">E-POSTA ADRESİ</label>
                        <input
                            id="email"
                            className="form-input"
                            type="email"
                            placeholder="admin@ferdibrahim.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">ŞİFRE</label>
                        <input
                            id="password"
                            className="form-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block mt-md" disabled={loading}>
                        {loading ? 'Giriş yapılıyor...' : 'GİRİŞ YAP'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Giriş yapmakta sorun yaşıyorsanız yönetici ile iletişime geçin.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
