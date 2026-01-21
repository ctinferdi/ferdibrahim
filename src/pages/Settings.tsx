import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

const Settings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const { user } = useAuth();

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            // Sadece mevcut kullanıcıyı göster (users tablosu yok)
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUsers([{
                    id: user.id,
                    email: user.email,
                    created_at: user.created_at,
                    user_metadata: { role: user.user_metadata?.role || 'editor' }
                }]);
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleResetPassword = async (userEmail: string) => {
        if (!confirm(`${userEmail} için şifre sıfırlama linki gönderilecek. Devam edilsin mi?`)) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;
            alert('✅ Şifre sıfırlama linki email adresine gönderildi!');
        } catch (error: any) {
            alert('❌ Hata: ' + error.message);
        }
    };

};

useEffect(() => {
    fetchUsers();
}, []);

const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email: newUserEmail,
            password: newUserPassword,
            email_confirm: true,
            user_metadata: { role: 'admin' }
        });

        if (error) throw error;

        setMessage(`✅ Kullanıcı başarıyla oluşturuldu: ${newUserEmail}`);
        setNewUserEmail('');
        setNewUserPassword('');
        fetchUsers();
    } catch (err: any) {
        setError(err.message || 'Kullanıcı oluşturulurken bir hata oluştu');
    } finally {
        setLoading(false);
    }
};

return (
    <Layout>
        <div>
            <h1 className="mb-lg">Ayarlar</h1>

            <div className="card" style={{ maxWidth: '480px', padding: '20px' }}>
                <h2 className="mb-xs" style={{ fontSize: '1.2rem' }}>Yeni Kullanıcı Oluştur</h2>
                <p className="mb-md" style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    Panele giriş yapabilecek yeni bir kullanıcı hesabı oluşturun.
                </p>

                {message && (
                    <div className="success-message" style={{ padding: '8px 12px', fontSize: '0.85rem', marginBottom: '15px' }}>
                        {message}
                    </div>
                )}

                {error && (
                    <div className="error-message" style={{ padding: '8px 12px', fontSize: '0.85rem', marginBottom: '15px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                            E-POSTA ADRESİ
                        </label>
                        <input
                            type="email"
                            className="form-input"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            required
                            style={{ width: '100%', margin: 0 }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                            ŞİFRE
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                required
                                minLength={6}
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

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                        style={{ padding: '10px', fontSize: '14px', fontWeight: 700 }}
                    >
                        {loading ? 'Oluşturuluyor...' : 'Kullanıcıyı Oluştur'}
                    </button>
                </form>

                {/* User List */}
                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                    <h2 className="mb-md" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Kayıtlı Kullanıcılar</h2>

                    {loadingUsers ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {users.map((user: any) => (
                                <div key={user.id} style={{
                                    padding: '10px 15px',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>
                                            {user.email}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '2px' }}>
                                            {user.user_metadata?.role === 'admin' ? '👑 Yönetici' : '✏️ Düzenleyici'} • {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleResetPassword(user.email)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '11px',
                                                background: '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 600
                                            }}
                                        >
                                            🔑 Şifre Sıfırla
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {users.length === 0 && (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-light)' }}>
                                    Henüz kullanıcı bulunmuyor.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </Layout>
);
};

export default Settings;
