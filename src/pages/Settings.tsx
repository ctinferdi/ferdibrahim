import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { userService } from '../services/userService';

const Settings: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Company settings state
    const [companyInfo, setCompanyInfo] = useState({
        company_name: '',
        company_address: '',
        company_location: '',
        whatsapp_number: '',
        notification_emails: [] as string[]
    });
    const [savingProfile, setSavingProfile] = useState(false);

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

    const handleDeleteUser = async (userId: string, targetEmail: string) => {
        if (!confirm(`${targetEmail} kullanıcısını silmek istediğinize emin misiniz?\n\nBU İŞLEM GERİ ALINAMAZ!`)) return;

        try {
            // 1. Önce mail atılacak kişileri belirle (Silinen hariç, kendisi hariç)
            const recipients = users
                .filter(u => u.email !== targetEmail && u.email !== user?.email)
                .map(u => u.email);

            // 2. Kullanıcıyı sil
            const { error } = await supabase.rpc('delete_user_by_id', {
                target_user_id: userId
            });

            if (error) throw error;

            alert('✅ Kullanıcı başarıyla silindi.');

            // 3. Mail uygulamasını aç (Bilgilendirme için)
            if (recipients.length > 0) {
                if (confirm('Diğer kullanıcılara bilgilendirme maili göndermek ister misiniz?')) {
                    const subject = encodeURIComponent('Kullanıcı Silme Bildirimi');
                    const body = encodeURIComponent(`Merhaba,\n\n${targetEmail} hesabı sistemden silinmiştir.\n\nBilgilerinize.`);
                    const bcc = recipients.join(',');

                    // Mailto linkini aç
                    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
                }
            }

            // Listeyi yenile
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

    const fetchProfile = async () => {
        if (!user?.id) return;
        try {
            const profile = await userService.getUserProfile(user.id);
            if (profile) {
                setCompanyInfo({
                    company_name: profile.company_name || '',
                    company_address: profile.company_address || '',
                    company_location: profile.company_location || '',
                    whatsapp_number: profile.whatsapp_number || '',
                    notification_emails: profile.notification_emails || []
                });
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchProfile();
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;
        setSavingProfile(true);
        try {
            await userService.updateUserProfile(user.id, companyInfo);
            alert('✅ Firma ve bildirim ayarları başarıyla güncellendi.');
        } catch (err: any) {
            console.error('Update profile error:', err);
            alert('❌ Ayarlar güncellenemedi: ' + err.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleEmailChange = (index: number, value: string) => {
        const newEmails = [...companyInfo.notification_emails];
        newEmails[index] = value;
        setCompanyInfo({ ...companyInfo, notification_emails: newEmails });
    };

    const addEmailField = () => {
        if (companyInfo.notification_emails.length < 3) {
            setCompanyInfo({
                ...companyInfo,
                notification_emails: [...companyInfo.notification_emails, '']
            });
        }
    };

    const removeEmailField = (index: number) => {
        const newEmails = companyInfo.notification_emails.filter((_, i) => i !== index);
        setCompanyInfo({ ...companyInfo, notification_emails: newEmails });
    };

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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                    {/* Company Settings Section */}
                    <div className="card" style={{ padding: '20px' }}>
                        <h2 className="mb-xs" style={{ fontSize: '1.2rem' }}>Firma ve Bildirim Ayarları</h2>
                        <p className="mb-md" style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                            Projelerde görünecek firma bilgilerinizi ve çek bildirimlerini yönetecek e-postaları ayarlayın.
                        </p>

                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>FİRMA ADI</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyInfo.company_name}
                                    onChange={(e) => setCompanyInfo({ ...companyInfo, company_name: e.target.value })}
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>FİRMA ADRESİ</label>
                                <textarea
                                    className="form-input"
                                    value={companyInfo.company_address}
                                    onChange={(e) => setCompanyInfo({ ...companyInfo, company_address: e.target.value })}
                                    style={{ width: '100%', margin: 0, resize: 'vertical', minHeight: '60px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>HARİTA KONUMU (URL)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyInfo.company_location}
                                    onChange={(e) => setCompanyInfo({ ...companyInfo, company_location: e.target.value })}
                                    placeholder="Google Maps linki"
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>WHATSAPP NUMARASI</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={companyInfo.whatsapp_number}
                                    onChange={(e) => setCompanyInfo({ ...companyInfo, whatsapp_number: e.target.value })}
                                    placeholder="Örn: 905xx..."
                                    style={{ width: '100%', margin: 0 }}
                                />
                            </div>

                            <div style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>BİLDİRİM E-POSTALARI (MAKS 3)</label>
                                    {companyInfo.notification_emails.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={addEmailField}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '11px',
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + Ekle
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {companyInfo.notification_emails.map((email, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '5px' }}>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={email}
                                                onChange={(e) => handleEmailChange(index, e.target.value)}
                                                placeholder={`E-posta ${index + 1}`}
                                                style={{ flex: 1, margin: 0, fontSize: '13px', borderColor: '#fca5a5' }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeEmailField(index)}
                                                style={{
                                                    padding: '0 10px',
                                                    background: '#fee2e2',
                                                    color: '#ef4444',
                                                    border: '1px solid #fecaca',
                                                    borderRadius: 'var(--radius-sm)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {companyInfo.notification_emails.length === 0 && (
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                                            Henüz bildirim e-postası eklenmedi.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={savingProfile}
                                style={{ marginTop: '10px', fontWeight: 700 }}
                            >
                                {savingProfile ? 'Kaydediliyor...' : 'Firma Bilgilerini Güncelle'}
                            </button>
                        </form>
                    </div>

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
                                                    👑 Yönetici • {new Date(user.created_at).toLocaleDateString('tr-TR')}
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

                                                {/* Kendi kendini silemesin */}
                                                {user.id !== (supabase.auth.getUser() as any)?.data?.user?.id && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.email)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '11px',
                                                            background: '#ef4444', // Kırmızı
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        🗑️ Sil
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
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
