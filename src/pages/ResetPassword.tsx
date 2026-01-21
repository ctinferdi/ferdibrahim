import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const ResetPassword: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // URL'den recovery token'ı kontrol et
        const hash = window.location.hash;
        if (!hash || !hash.includes('access_token')) {
            setError('Geçersiz veya süresi dolmuş link. Lütfen yeni şifre sıfırlama linki isteyin.');
        }
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // Şifre kontrolü
        if (newPassword !== confirmPassword) {
            setError('Şifreler eşleşmiyor!');
            return;
        }

        if (newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalı!');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage('✅ Şifreniz başarıyla değiştirildi! Yönlendiriliyorsunuz...');

            // 2 saniye sonra login sayfasına yönlendir
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error: any) {
            setError('❌ Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #5a67d8 100%)',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                maxWidth: '400px',
                width: '100%'
            }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '10px', textAlign: 'center' }}>
                    🔐 Yeni Şifre Belirle
                </h1>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                    Hesabınız için yeni bir şifre oluşturun.
                </p>

                {message && (
                    <div className="success-message" style={{ marginBottom: '20px', padding: '12px', fontSize: '0.9rem' }}>
                        {message}
                    </div>
                )}

                {error && (
                    <div className="error-message" style={{ marginBottom: '20px', padding: '12px', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                            YENİ ŞİFRE
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="En az 6 karakter"
                                style={{ width: '100%', margin: 0, paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem'
                                }}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                            ŞİFRE TEKRAR
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Şifreyi tekrar girin"
                            style={{ width: '100%', margin: 0 }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                        style={{ padding: '12px', fontSize: '15px', fontWeight: 700, marginTop: '10px' }}
                    >
                        {loading ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <a
                        href="/login"
                        style={{
                            color: 'var(--color-primary)',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            fontWeight: 600
                        }}
                    >
                        ← Giriş sayfasına dön
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
