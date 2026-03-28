import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';

const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (password !== confirmPassword) {
            return setError('Şifreler eşleşmiyor');
        }

        if (password.length < 6) {
            return setError('Şifre en az 6 karakter olmalıdır');
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            setSuccess(true);
            // After 5 seconds redirect to login if they haven't clicked the link
            setTimeout(() => {
                if (!error) navigate('/login');
            }, 8000);
        } catch (err: any) {
            if (err.message.includes('User already registered')) {
                setError('Bu e-posta adresi zaten kayıtlı.');
            } else {
                setError(err.message || 'Hesap oluşturulamadı.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card glass">
                    <div className="auth-header">
                        <div className="success-icon" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }}>✓</div>
                        <h1>Kayıt Başarılı!</h1>
                        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                            Lütfen <strong>{email}</strong> adresine gönderilen doğrulama bağlantısına tıklayarak hesabınızı onaylayın.
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '1rem' }}>
                            Onayladıktan sonra giriş yapabilirsiniz.
                        </p>
                    </div>
                    <div className="auth-footer">
                        <Link to="/login" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                            Giriş Sayfasına Git
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card glass">
                <div className="auth-header">
                    <h1>Hesap Oluştur</h1>
                    <p>İnşaat Finansal Yönetim Sistemi</p>
                </div>

                {error && <div className="error-message">{error}</div>}

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

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">ŞİFRE TEKRAR</label>
                        <input
                            id="confirmPassword"
                            className="form-input"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block mt-md" disabled={loading}>
                        {loading ? 'Hesap oluşturuluyor...' : 'HESAP OLUŞTUR'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
