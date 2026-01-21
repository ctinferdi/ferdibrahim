import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

type UserRole = 'admin' | 'editor';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users'>('users');
    const [loading, setLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('editor');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const { user } = useAuth();
    const superAdminEmail = 'ctinferdi@gmail.com';
    const isSuperAdmin = user?.email === superAdminEmail;

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            // Note: This requires service_role key which is not exposed to frontend
            // For production, create a backend API endpoint
            const { data: { users: userList }, error } = await supabase.auth.admin.listUsers();

            if (error) {
                console.error('Error fetching users:', error);
                // Fallback: Just show current user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUsers([user]);
                }
            } else {
                setUsers(userList || []);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
            // Show current user as fallback
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUsers([user]);
            }
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleResetPassword = async (userEmail: string) => {
        if (!isSuperAdmin) {
            alert(`Bu işlem için ${superAdminEmail} onayına ihtiyaç var.`);
            return;
        }

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

    const handleChangeRole = async (userId: string, currentRole: string) => {
        if (!isSuperAdmin) {
            alert(`Bu işlem için ${superAdminEmail} onayına ihtiyaç var.`);
            return;
        }

        const newRole = currentRole === 'admin' ? 'editor' : 'admin';

        if (!confirm(`Kullanıcı rolü "${currentRole}" → "${newRole}" olarak değiştirilecek. Devam edilsin mi?`)) return;

        try {
            const { error } = await supabase.auth.admin.updateUserById(userId, {
                user_metadata: { role: newRole }
            });

            if (error) throw error;
            alert(`✅ Rol başarıyla ${newRole} olarak değiştirildi!`);
            fetchUsers(); // Listeyi yenile
        } catch (error: any) {
            alert('❌ Hata: ' + error.message);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        role: newUserRole
                    }
                }
            });

            if (error) throw error;

            const roleText = newUserRole === 'admin' ? 'Yönetici' : 'Düzenleyici';
            setMessage(`${roleText} olarak ${newUserEmail} başarıyla oluşturuldu!`);
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole('editor');
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

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: 'var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '8px'
                }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            padding: '8px 16px',
                            background: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'users' ? 'white' : 'var(--color-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        👥 Kullanıcı Yönetimi
                    </button>
                </div>

                {/* Users Tab */}
                {activeTab === 'users' && (
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

                        <form onSubmit={handleCreateUser}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label" style={{ fontSize: '10px', marginBottom: '6px' }}>KULLANICI ROLÜ</label>
                                <div style={{
                                    display: 'flex',
                                    gap: '10px'
                                }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        border: `1.5px solid ${newUserRole === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        flex: 1,
                                        background: newUserRole === 'admin' ? 'var(--color-primary-light)' : 'white',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="admin"
                                            checked={newUserRole === 'admin'}
                                            onChange={() => setNewUserRole('admin')}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{ fontSize: '1.2rem' }}>👑</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '13px' }}>Yönetici</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-light)', lineHeight: 1.1 }}>
                                                Tam Yetki
                                            </div>
                                        </div>
                                    </label>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        border: `1.5px solid ${newUserRole === 'editor' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        flex: 1,
                                        background: newUserRole === 'editor' ? 'var(--color-primary-light)' : 'white',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="editor"
                                            checked={newUserRole === 'editor'}
                                            onChange={() => setNewUserRole('editor')}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{ fontSize: '1.2rem' }}>✏️</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '13px' }}>Düzenleyici</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-light)', lineHeight: 1.1 }}>
                                                Sınırlı Yetki
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label" style={{ fontSize: '10px', marginBottom: '6px' }}>E-POSTA ADRESİ</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    placeholder="ornek@ferdibrahim.com"
                                    style={{ padding: '8px 12px', fontSize: '13px' }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" style={{ fontSize: '10px', marginBottom: '6px' }}>ŞİFRE</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        placeholder="••••••••"
                                        minLength={6}
                                        required
                                        style={{ paddingRight: '2.5rem', padding: '8px 12px', fontSize: '13px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '0.75rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.25rem',
                                            padding: '0.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
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
                                                <button
                                                    onClick={() => handleChangeRole(user.id, user.user_metadata?.role || 'editor')}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: '11px',
                                                        background: user.user_metadata?.role === 'admin' ? '#ef4444' : '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {user.user_metadata?.role === 'admin' ? '⬇️ Düzenleyici Yap' : '⬆️ Yönetici Yap'}
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
