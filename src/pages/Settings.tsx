import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../config/supabase';

type UserRole = 'admin' | 'editor';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'general'>('users');
    const [loading, setLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('editor');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

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
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-xl)',
                    borderBottom: '2px solid var(--color-border)',
                    paddingBottom: 'var(--spacing-md)'
                }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            background: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'users' ? 'white' : 'var(--color-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 'var(--font-size-md)',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        👥 Kullanıcı Yönetimi
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            background: activeTab === 'general' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'general' ? 'white' : 'var(--color-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 'var(--font-size-md)',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        ⚙️ Genel Ayarlar
                    </button>
                </div>

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="card" style={{ maxWidth: '600px' }}>
                        <h2 className="mb-md" style={{ fontSize: '1.5rem' }}>Yeni Kullanıcı Oluştur</h2>
                        <p className="mb-lg" style={{ color: 'var(--color-text-light)' }}>
                            Panele giriş yapabilecek yeni bir kullanıcı hesabı oluşturun.
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
                                <label className="form-label">KULLANICI ROLÜ</label>
                                <div style={{
                                    display: 'flex',
                                    gap: 'var(--spacing-md)',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        padding: 'var(--spacing-md)',
                                        border: `2px solid ${newUserRole === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        flex: 1,
                                        background: newUserRole === 'admin' ? 'var(--color-primary-light)' : 'white'
                                    }}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="admin"
                                            checked={newUserRole === 'admin'}
                                            onChange={() => setNewUserRole('admin')}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{ fontSize: '1.5rem' }}>👑</span>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Yönetici</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                                                Tüm yetkilere sahip
                                            </div>
                                        </div>
                                    </label>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        padding: 'var(--spacing-md)',
                                        border: `2px solid ${newUserRole === 'editor' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        flex: 1,
                                        background: newUserRole === 'editor' ? 'var(--color-primary-light)' : 'white'
                                    }}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="editor"
                                            checked={newUserRole === 'editor'}
                                            onChange={() => setNewUserRole('editor')}
                                            style={{ display: 'none' }}
                                        />
                                        <span style={{ fontSize: '1.5rem' }}>✏️</span>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Düzenleyici</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                                                Sınırlı yetkiler
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

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
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        placeholder="••••••••"
                                        minLength={6}
                                        required
                                        style={{ paddingRight: '3rem' }}
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
                            >
                                {loading ? 'Oluşturuluyor...' : 'Kullanıcıyı Oluştur'}
                            </button>
                        </form>

                        {/* User List */}
                        <div style={{ marginTop: 'var(--spacing-2xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)' }}>
                            <h2 className="mb-md" style={{ fontSize: '1.5rem' }}>Kayıtlı Kullanıcılar</h2>

                            {loadingUsers ? (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                                    <div className="spinner"></div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {users.map((user: any) => (
                                        <div key={user.id} style={{
                                            padding: 'var(--spacing-md)',
                                            background: 'var(--color-bg)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 'var(--spacing-sm)'
                                        }}>
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                                    {user.email}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                                    {user.user_metadata?.role === 'admin' ? '👑 Yönetici' : '✏️ Düzenleyici'}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                                                {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                            </div>
                                        </div>
                                    ))}

                                    {users.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-light)' }}>
                                            Henüz kullanıcı bulunmuyor.
                                        </div>
                                    )}

                                    <div style={{
                                        marginTop: 'var(--spacing-md)',
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--color-primary-light)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}>
                                        <strong>Not:</strong> Kullanıcı silme ve şifre sıfırlama işlemleri için{' '}
                                        <a
                                            href="https://supabase.com/dashboard"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                                        >
                                            Supabase Dashboard
                                        </a>
                                        {' '}→ Authentication → Users bölümünü kullanın.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* General Settings Tab */}
                {activeTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <div className="card" style={{ maxWidth: '600px' }}>
                            <h2 className="mb-md" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                🔔 Bildirim Ayarları
                            </h2>
                            <p className="mb-lg" style={{ color: 'var(--color-text-light)' }}>
                                Çek vadeleri yaklaştığında uyarı maili gitmesini istediğiniz adresleri buraya ekleyin.
                            </p>

                            <NotificationEmailsManager />
                        </div>

                        <div className="card" style={{ maxWidth: '600px' }}>
                            <h2 className="mb-md" style={{ fontSize: '1.5rem' }}>Sistem Ayarları</h2>
                            <p style={{ color: 'var(--color-text-light)' }}>
                                Diğer genel ayarlar yakında eklenecek...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

const NotificationEmailsManager: React.FC = () => {
    const [emails, setEmails] = useState<any[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchEmails = async () => {
        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) console.error('Error fetching emails:', error);
        else setEmails(data || []);
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('notification_settings')
            .insert([{ email: newEmail, user_id: user?.id }]);

        if (error) {
            alert('Hata: ' + error.message);
        } else {
            setNewEmail('');
            fetchEmails();
        }
        setLoading(false);
    };

    const handleDeleteEmail = async (id: string) => {
        const { error } = await supabase
            .from('notification_settings')
            .delete()
            .eq('id', id);

        if (error) alert('Hata: ' + error.message);
        else fetchEmails();
    };

    return (
        <div>
            <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                <input
                    type="email"
                    className="form-input"
                    placeholder="mail@örnek.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    style={{ flex: 1, margin: 0 }}
                />
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
                    {loading ? '...' : 'Ekle'}
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {emails.map((e) => (
                    <div key={e.id} style={{
                        padding: '12px 15px',
                        background: 'var(--color-bg)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid var(--color-border)'
                    }}>
                        <span style={{ fontWeight: 500 }}>{e.email}</span>
                        <button
                            onClick={() => handleDeleteEmail(e.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                            title="Sil"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
                {emails.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-light)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                        Henüz bildirim adresi eklenmemiş.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
