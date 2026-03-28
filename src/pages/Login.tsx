import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err: any) {
            setError(err.message || 'Şifre sıfırlama e-postası gönderilemedi.');
        } finally {
            setResetLoading(false);
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

                {resetSent ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: '1rem' }}>
                            Şifre sıfırlama linki e-posta adresinize gönderildi.
                        </p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => { setResetSent(false); setResetMode(false); }}
                        >
                            Giriş sayfasına dön
                        </button>
                    </div>
                ) : resetMode ? (
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                            E-posta adresinizi girin, şifre sıfırlama linki göndereceğiz.
                        </p>
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
                        <button type="submit" className="btn btn-primary btn-block mt-md" disabled={resetLoading}>
                            {resetLoading ? 'Gönderiliyor...' : 'SIFIRLAMA LİNKİ GÖNDER'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-block mt-sm"
                            onClick={() => { setResetMode(false); setError(''); }}
                        >
                            Geri Dön
                        </button>
                    </form>
                ) : (
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

                        <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => { setResetMode(true); setError(''); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    textDecoration: 'underline',
                                    padding: 0
                                }}
                            >
                                Şifremi Unuttum
                            </button>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block mt-md" disabled={loading}>
                            {loading ? 'Giriş yapılıyor...' : 'GİRİŞ YAP'}
                        </button>
                    </form>
                )}

                {!resetMode && !resetSent && (
                    <div className="auth-footer">
                        <p>Giriş yapmakta sorun yaşıyorsanız yönetici ile iletişime geçin.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
