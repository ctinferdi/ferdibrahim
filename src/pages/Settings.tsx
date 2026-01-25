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
            // public.users tablosundan tüm kullanıcıları çek
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Users tablosu bulunamadı, fallback yapılıyor...', error);
                // Tablo yoksa sadece mevcut kullanıcıyı göster (Fallback)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUsers([{
                        id: user.id,
                        email: user.email,
                        created_at: user.created_at,
                        user_metadata: { role: 'admin' }
                    }]);
                }
            } else {
                // Veri geldiyse state'i güncelle
                setUsers(data.map(u => ({
                    ...u,
                    user_metadata: { role: 'admin' } // Herkes yönetici
                })));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingUser, setDeletingUser] = useState<{ id: string, email: string } | null>(null);
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
    const [receivedCode, setReceivedCode] = useState('');
    const [sendingCode, setSendingCode] = useState(false);

    const handleDeleteUser = async (userId: string, targetEmail: string) => {
        setSendingCode(true);
        setDeletingUser({ id: userId, email: targetEmail });
        try {
            const { data, error } = await supabase.functions.invoke('send-delete-code', {
                body: {
                    targetName: targetEmail,
                    actionType: 'user',
                    userEmail: user?.email
                }
            });

            if (error) throw error;
            if (data?.code) {
                setReceivedCode(data.code);
                setShowDeleteModal(true);
            }
        } catch (error: any) {
            console.error('Full Error:', error);
            const errorMsg = error.context?.error?.message || error.message || 'Bilinmeyen bir hata oluştu';
            alert('Güvenlik kodu gönderilemedi: ' + errorMsg);
        } finally {
            setSendingCode(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (deleteConfirmCode !== receivedCode) {
            alert('Girdiğiniz kod hatalı. Lütfen meilinizi kontrol edin.');
            return;
        }

        try {
            if (!deletingUser) return;

            const { error } = await supabase.rpc('delete_user_by_id', {
                target_user_id: deletingUser.id
            });

            if (error) throw error;

            alert('✅ Kullanıcı başarıyla silindi.');
            setShowDeleteModal(false);
            setDeleteConfirmCode('');
            setReceivedCode('');
            setDeletingUser(null);
            fetchUsers();
        } catch (error: any) {
            console.error('Silme hatası:', error);
            alert('❌ Kullanıcı silinemedi: ' + error.message);
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


    useEffect(() => {
        fetchUsers();
    }, [user]);


    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            // Normal signUp kullan (admin.createUser izin vermiyor)
            const { error } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        role: 'admin'
                    }
                }
            });

            if (error) throw error;

            setMessage(`✅ Kullanıcı başarıyla oluşturuldu: ${newUserEmail}\n\nNOT: Email doğrulama linki gönderildi.`);
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

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'start' }}>

                    <div className="card" style={{ padding: '20px' }}>
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
                                    {users.map((u: any) => (
                                        <div key={u.id} style={{
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
                                                    {u.email}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '2px' }}>
                                                    👑 Yönetici • {new Date(u.created_at).toLocaleDateString('tr-TR')}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleResetPassword(u.email)}
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

                                                {/* Kendi kendini silemesin */}
                                                {user?.id !== u.id && (
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                        disabled={sendingCode}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '11px',
                                                            background: '#ef4444', // Kırmızı
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: sendingCode ? 'wait' : 'pointer',
                                                            fontWeight: 600,
                                                            opacity: sendingCode ? 0.5 : 1
                                                        }}
                                                    >
                                                        {sendingCode ? '...' : '🗑️ Sil'}
                                                    </button>
                                                )}
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
                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: 'var(--spacing-md)'
                        }}>
                            <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                <h2 className="mb-md">Kullanıcıyı Sil</h2>
                                <p className="mb-lg" style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
                                    <strong>{deletingUser?.email}</strong> kullanıcısını silmek için e-posta adresinize (ctinferdi@gmail.com) gönderilen 4 haneli kodu girin.
                                </p>

                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>KOD E-POSTA ADRESİNİZE GÖNDERİLDİ</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={deleteConfirmCode}
                                        onChange={(e) => setDeleteConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="4 haneli kodu girin"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoFocus
                                        style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 800 }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                                    <button
                                        onClick={confirmDeleteUser}
                                        className="btn btn-primary"
                                        style={{ flex: 1, backgroundColor: '#f5576c' }}
                                    >
                                        Sil
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setDeleteConfirmCode('');
                                            setDeletingUser(null);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
