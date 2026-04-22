import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { isUserSuperAdmin } from '../config/admin';

const Settings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [updatingUser, setUpdatingUser] = useState<string | null>(null);


    const { user } = useAuth();
    const isSuperAdmin = isUserSuperAdmin(user?.email);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const [{ data: userData, error: userError }, { data: projData, error: projError }] = await Promise.all([
                supabase.from('users').select('*').order('created_at', { ascending: false }),
                supabase.from('projects').select('id, name')
            ]);

            if (userError) throw userError;
            setUsers(userData.map(u => {
                // Verinin hem kolondan hem de metadata'dan gelme ihtimaline karşı birleştiriyoruz
                const metadata = u.user_metadata || {};
                const accessible_projects = u.accessible_projects || metadata.accessible_projects || [];
                
                return {
                    ...u,
                    user_metadata: metadata,
                    accessible_projects: accessible_projects
                };
            }));
            if (projData) setProjects(projData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleToggleProject = async (userId: string, projId: string, current: string[]) => {
        setUpdatingUser(userId);
        const updated = current.includes(projId) ? current.filter(id => id !== projId) : [...current, projId];
        
        try {
            // 1. Önce public.users tablosunu güncellemeyi dene
            const { error: updateError } = await supabase
                .from('users')
                .update({ accessible_projects: updated })
                .eq('id', userId);
            
            if (updateError) {
                console.warn('Public table update failed, trying metadata...', updateError);
                // 2. Eğer tablo güncellemesi başarısız olursa metadata üzerinden dene (RPC veya Edge Function gerekebilir)
                // Şimdilik sadece hatayı fırlatalım ki kullanıcı bilsin
                throw new Error(updateError.message);
            }
            
            // Başarılıysa listeyi yenile
            await fetchUsers();
        } catch (err: any) { 
            console.error('Yetki güncelleme hatası:', err);
            alert('Yetki güncellenemedi: ' + err.message + '\n\nLütfen "accessible_projects" sütununun veritabanında olduğundan emin olun.');
        } finally { 
            setUpdatingUser(null); 
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
            alert('Girdiğiniz kod hatalı. Lütfen mailinizi kontrol edin.');
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
        if (user?.id) {
            fetchUsers();
        }
    }, [user?.id]);


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

    if (!isSuperAdmin) {
        return (
            <Layout>
                <div className="card">
                    <h2>Kişisel Bilgiler</h2>
                    <p>Email: {user?.email}</p>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
                        Bu sayfada sadece yöneticiler işlem yapabilir.
                    </p>
                </div>
            </Layout>
        );
    }

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
                                    {users.map((u: any) => {
                                        const isSuper = isUserSuperAdmin(u.email);
                                        const hasProjects = (u.accessible_projects || []).length > 0;
                                        
                                        return (
                                            <div key={u.id} style={{
                                                padding: '16px',
                                                background: 'white',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div className="lowercase" style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                                                            {u.email}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                            <span style={{ 
                                                                fontSize: '10px', 
                                                                padding: '2px 8px', 
                                                                borderRadius: '20px', 
                                                                background: isSuper ? '#fef3c7' : (hasProjects ? '#dcfce7' : '#f1f5f9'),
                                                                color: isSuper ? '#92400e' : (hasProjects ? '#166534' : '#64748b'),
                                                                fontWeight: 800,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                {isSuper ? '👑 SÜPER YÖNETİCİ' : (hasProjects ? '👤 PROJE YÖNETİCİSİ' : '🚫 YETKİSİZ')}
                                                            </span>
                                                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                                • {new Date(u.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            onClick={() => handleResetPassword(u.email)}
                                                            title="Şifre Sıfırlama Linki Gönder"
                                                            style={{
                                                                padding: '6px',
                                                                fontSize: '14px',
                                                                background: '#fff7ed',
                                                                color: '#f59e0b',
                                                                border: '1px solid #ffedd5',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            🔑
                                                        </button>
                                                        {user?.id !== u.id && (
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id, u.email)}
                                                                disabled={sendingCode}
                                                                title="Kullanıcıyı Sil"
                                                                style={{
                                                                    padding: '6px',
                                                                    fontSize: '14px',
                                                                    background: '#fef2f2',
                                                                    color: '#ef4444',
                                                                    border: '1px solid #fee2e2',
                                                                    borderRadius: '6px',
                                                                    cursor: sendingCode ? 'wait' : 'pointer',
                                                                    opacity: sendingCode ? 0.5 : 1
                                                                }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Proje Yetkileri Alanı */}
                                                <div style={{ 
                                                    background: '#f8fafc', 
                                                    padding: '12px', 
                                                    borderRadius: '8px', 
                                                    border: '1px dashed #e2e8f0' 
                                                }}>
                                                    <div style={{ 
                                                        fontSize: '11px', 
                                                        fontWeight: 800, 
                                                        marginBottom: '10px', 
                                                        color: '#475569',
                                                        display: 'flex',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <span>📂 YÖNETİM YETKİSİ VERİLEN PROJELER</span>
                                                        <span style={{ color: hasProjects ? '#10b981' : '#94a3b8' }}>
                                                            {u.accessible_projects?.length || 0} Proje
                                                        </span>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {projects.map(p => {
                                                            const hasAccess = (u.accessible_projects || []).includes(p.id);
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    disabled={updatingUser === u.id}
                                                                    onClick={() => handleToggleProject(u.id, p.id, u.accessible_projects || [])}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        fontSize: '11px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid',
                                                                        borderColor: hasAccess ? '#22c55e' : '#cbd5e1',
                                                                        background: hasAccess ? '#22c55e' : 'white',
                                                                        color: hasAccess ? 'white' : '#64748b',
                                                                        cursor: 'pointer',
                                                                        fontWeight: hasAccess ? 700 : 500,
                                                                        transition: 'all 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        boxShadow: hasAccess ? '0 2px 4px rgba(34, 197, 94, 0.2)' : 'none'
                                                                    }}
                                                                >
                                                                    {hasAccess ? '✅' : '➕'} {p.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {hasProjects && (
                                                        <div style={{ marginTop: '10px', fontSize: '10px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span>ℹ️</span> Bu kullanıcı yukarıdaki projeleri yönetebilir.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

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
                                    <strong>{deletingUser?.email}</strong> kullanıcısını silmek için e-posta adresinize ({user?.email}) gönderilen 4 haneli kodu girin.
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
