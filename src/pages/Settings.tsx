import React, { useState } from 'react';
import { supabase } from '../config/supabase';

const Settings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
            });

            if (error) throw error;

            setMessage(`Kullanıcı başarıyla oluşturuldu! Lütfen ${newUserEmail} adresini doğrulayın.`);
            setNewUserEmail('');
            setNewUserPassword('');
        } catch (err: any) {
            setError(err.message || 'Kullanıcı oluşturulurken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '600px', marginTop: '2rem' }}>
            <h1 className="mb-xl">Ayarlar</h1>

            <div className="card">
                <h2 className="mb-md" style={{ fontSize: '1.5rem' }}>Yeni Kullanıcı Oluştur</h2>
                <p className="mb-lg" style={{ color: 'var(--color-text-light)' }}>
                    Panele giriş yapabilecek yeni bir yönetici hesabı oluşturun.
                </p>

                {message && (
                    <div className="success-message">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreateUser}>
                    <div className="form-group">
                        <label className="form-label">E-POSTA ADRESİ</label>
                        <input
                            type="email"
                            className="form-input"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="ornek@ferdibrahim.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">ŞİFRE</label>
                        <input
                            type="password"
                            className="form-input"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Oluşturuluyor...' : 'Kullanıcıyı Oluştur'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Settings;
