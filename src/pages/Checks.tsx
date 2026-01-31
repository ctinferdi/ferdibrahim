import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { subscribeToChecks, getChecks, addCheck, updateCheck, deleteCheck } from '../services/checkService';
import { projectService } from '../services/projectService';
import { supabase } from '../config/supabase';
import { Check, CheckInput, CheckStatus, Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CheckModal from './ProjectDetail/Modals/CheckModal';
import { isUserSuperAdmin } from '../config/admin';

const Checks = () => {
    const [checks, setChecks] = useState<Check[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCheck, setEditingCheck] = useState<Check | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'all'>('pending');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    // Security Code State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [receivedCode, setReceivedCode] = useState('');
    const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
    const [deletingCheckInfo, setDeletingCheckInfo] = useState<{ id: string, name: string } | null>(null);
    const [sendingCode, setSendingCode] = useState(false);

    const { user } = useAuth();
    const isSuperAdmin = isUserSuperAdmin(user?.email);

    const handleAdminAction = (action: () => void) => {
        if (!isSuperAdmin) {
            alert(`Bu işlem için yönetici onayı gereklidir.`);
            return;
        }
        action();
    };

    const [formData, setFormData] = useState<any>({
        check_number: '',
        amount: 0,
        company: '',
        category: '',
        vat_status: '',
        issuer: '',
        given_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending' as CheckStatus,
        description: '',
        notification_email: '',
        notification_email_2: '',
        notification_email_3: '',
        project_id: ''
    });


    useEffect(() => {
        const handleRefresh = () => {
            getChecks().then(setChecks);
            projectService.getProjects().then(setProjects);
        };

        window.addEventListener('system-refresh', handleRefresh);

        const unsubscribe = subscribeToChecks(setChecks);
        projectService.getProjects().then(setProjects);
        setLoading(false);

        return () => {
            window.removeEventListener('system-refresh', handleRefresh);
            unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setErrorMsg(null);

            const submitData = {
                ...formData,
                notification_email: formData.notification_email?.trim() || '',
                notification_email_2: formData.notification_email_2?.trim() || '',
                notification_email_3: formData.notification_email_3?.trim() || ''
            };

            if (editingCheck) {
                await updateCheck(editingCheck.id, submitData as CheckInput);
            } else {
                await addCheck(submitData as CheckInput, user?.id || '');
            }

            setShowModal(false);
            setEditingCheck(null);
            resetForm();
        } catch (error: any) {
            console.error('Error saving check:', error);
            setErrorMsg(error.message || 'Çek kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    const resetForm = () => {
        setFormData({
            check_number: '',
            amount: 0,
            company: '',
            category: '',
            vat_status: '',
            issuer: '',
            given_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            description: '',
            notification_email: '',
            notification_email_2: '',
            notification_email_3: '',
            project_id: ''
        });
    };

    const handleEdit = (check: Check) => {
        setEditingCheck(check);
        setFormData({
            check_number: check.check_number,
            amount: check.amount,
            company: check.company,
            category: check.category,
            vat_status: check.vat_status || '',
            issuer: check.issuer,
            given_date: check.given_date,
            due_date: check.due_date,
            status: check.status,
            description: check.description || '',
            notification_email: check.notification_email || '',
            notification_email_2: check.notification_email_2 || '',
            notification_email_3: check.notification_email_3 || '',
            project_id: check.project_id || ''
        });
        setErrorMsg(null);
        setShowModal(true);
    };

    const handleDelete = (id: string, name: string) => {
        handleAdminAction(async () => {
            setSendingCode(true);
            setDeletingCheckInfo({ id, name });
            try {
                const { data, error } = await supabase.functions.invoke('send-delete-code', {
                    body: {
                        targetName: name,
                        actionType: 'check',
                        userEmail: user?.email
                    }
                });

                if (error) throw error;
                if (data?.code) {
                    setReceivedCode(data.code);
                    setShowDeleteModal(true);
                }
            } catch (error: any) {
                console.error('Code trigger error:', error);
                alert('Güvenlik kodu gönderilemedi: ' + error.message);
            } finally {
                setSendingCode(false);
            }
        });
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirmCode === receivedCode && deletingCheckInfo) {
            try {
                await deleteCheck(deletingCheckInfo.id);
                setShowDeleteModal(false);
                setDeleteConfirmCode('');
                setReceivedCode('');
                setDeletingCheckInfo(null);
            } catch (error: any) {
                console.error('Delete error:', error);
                alert('Silme işlemi sırasında bir hata oluştu.');
            }
        } else {
            alert('Girdiğiniz kod hatalı. Lütfen meilinizi kontrol edin.');
        }
    };

    const handleManualNotify = async (check: Check) => {
        const emails = [
            check.notification_email,
            ...(check.notification_emails || []),
            ...(projects.find(p => p.id === check.project_id)?.notification_emails || [])
        ].filter(e => e);

        if (emails.length === 0) {
            alert('Bu çek için tanımlı bir e-posta adresi bulunamadı. Lütfen önce e-posta adresi ekleyin.');
            handleEdit(check);
            return;
        }

        if (!window.confirm(`${check.check_number} numaralı çek için bildirim e-postası şimdi gönderilsin mi?\n\nAlıcılar: ${emails.join(', ')}`)) return;

        setSendingCode(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-manual-notification', {
                body: { checkId: check.id }
            });

            if (error) {
                console.error('Manual notify function error:', error);
                throw error;
            }

            if (data?.success === false) {
                alert('❌ Bildirim gönderilemedi: ' + (data.error || 'Bilinmeyen hata'));
            } else {
                alert('✅ Bildirim e-postası başarıyla gönderildi.');
            }
        } catch (error: any) {
            console.error('Manual notify error details:', error);
            const errorMsg = error.context?.message || error.message || 'Bilinmeyen bir hata oluştu.';
            alert('❌ Bildirim gönderilemedi: ' + errorMsg);
        } finally {
            setSendingCode(false);
        }
    };


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const filteredChecks = checks.filter(check => {
        const matchesSearch =
            (check.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (check.check_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (check.category || '').toLowerCase().includes(searchTerm.toLowerCase());

        let matchesTab = true;
        if (activeTab === 'pending') matchesTab = check.status === 'pending';
        else if (activeTab === 'paid') matchesTab = check.status === 'paid';

        return matchesSearch && matchesTab;
    });

    if (loading) {
        return (
            <Layout>
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-xl">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#1a365d' }}>
                        <span style={{ fontSize: '1.5em' }}>💳</span> Çek Yönetimi
                    </h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="🔍 Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingRight: '40px', margin: 0 }}
                            />
                        </div>
                        <div style={{ display: 'flex', background: 'var(--color-bg-alt)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                            <button
                                onClick={() => setActiveTab('pending')}
                                style={{
                                    padding: '8px 15px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    background: activeTab === 'pending' ? 'white' : 'transparent',
                                    color: activeTab === 'pending' ? 'var(--color-primary)' : 'var(--color-text-light)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Bekleyenler
                            </button>
                            <button
                                onClick={() => setActiveTab('paid')}
                                style={{
                                    padding: '8px 15px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    background: activeTab === 'paid' ? 'white' : 'transparent',
                                    color: activeTab === 'paid' ? 'var(--color-primary)' : 'var(--color-text-light)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Ödenenler
                            </button>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setEditingCheck(null);
                                resetForm();
                                setErrorMsg(null);
                                setShowModal(true);
                            }}
                            style={{ boxShadow: 'var(--shadow-md)', padding: '12px 25px' }}
                        >
                            ➕ Ekle
                        </button>
                    </div>
                </div>

                {/* Table Header Style like Excel */}
                <div style={{
                    textAlign: 'center',
                    background: '#fef3c7',
                    padding: '15px',
                    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                    border: '1px solid #f59e0b',
                    borderBottom: 'none'
                }}>
                    <h2 style={{ margin: 0, color: '#92400e', letterSpacing: '2px', fontWeight: 800 }}>YAPILACAK ÇEK ÖDEMELERİ</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#b45309', fontSize: '11px', fontWeight: 600 }}>
                        🔔 Bildirim simgesi olan çekler için vadeye 10 gün kala otomatik e-posta gönderilir.
                    </p>
                </div>

                {/* Table */}
                <div className="table-container card" style={{ padding: 0, overflow: 'hidden', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', border: '1px solid #f59e0b' }}>
                    <table className="table" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#fef3c7' }}>
                            <tr>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a', width: '60px' }}>📢</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>VADE TARİHİ</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ÇEKLER</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ŞİRKET</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>KULLANILACAK YER</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>KDV DURUMU</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>PROJE</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ÇEKİ VEREN KİŞİ</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>DURUM</th>
                                <th style={{ color: '#92400e', textAlign: 'center' }}>İŞLEMLER</th>
                            </tr>
                        </thead>
                        <tbody style={{ background: '#fff' }}>
                            {filteredChecks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '50px', color: 'var(--color-text-light)' }}>
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                filteredChecks.map((check) => (
                                    <tr key={check.id} style={{
                                        opacity: check.status === 'paid' ? 0.7 : 1,
                                        borderBottom: '1px solid #fde68a'
                                    }}>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontSize: '1.2rem' }}>
                                            <div
                                                onClick={() => handleManualNotify(check)}
                                                style={{ cursor: 'pointer', transition: 'transform 0.2s', opacity: sendingCode ? 0.5 : 1 }}
                                                className="hover-scale"
                                                title={(check.notification_email || check.notification_email_2 || check.notification_email_3 || projects.find(p => p.id === check.project_id)?.notification_emails?.length) ? "Şimdi bildirim gönder" : "E-posta tanımlamak için tıkla"}
                                            >
                                                {(check.notification_email || check.notification_email_2 || check.notification_email_3 || projects.find(p => p.id === check.project_id)?.notification_emails?.length) ? '🔔' : '🔕'}
                                            </div>
                                        </td>
                                        <td style={{
                                            textAlign: 'center',
                                            borderRight: '1px solid #fef3c7',
                                            fontWeight: 500,
                                            color: (() => {
                                                const dueDate = new Date(check.due_date);
                                                const today = new Date('2026-01-22'); // Using system provided current date
                                                const diffTime = dueDate.getTime() - today.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                return (diffDays <= 10 && check.status === 'pending') ? '#dc2626' : 'inherit';
                                            })(),
                                            background: (() => {
                                                const dueDate = new Date(check.due_date);
                                                const today = new Date('2026-01-22');
                                                const diffTime = dueDate.getTime() - today.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                return (diffDays <= 10 && check.status === 'pending') ? '#fee2e2' : 'transparent';
                                            })()
                                        }}>
                                            {new Date(check.due_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontWeight: 600 }}>
                                            {formatCurrency(check.amount)}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7' }}>
                                            {check.company}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7' }}>
                                            {check.category}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontSize: 'var(--font-size-xs)' }}>
                                            {check.vat_status || ''}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontSize: 'var(--font-size-xs)' }}>
                                            {projects.find(p => p.id === check.project_id)?.name || '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontSize: 'var(--font-size-xs)' }}>
                                            {check.issuer}
                                        </td>
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontWeight: 800, color: '#059669' }}>
                                            {check.status === 'paid' ? 'ÖDENDİ' : ''}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleEdit(check)}
                                                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 8px' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    disabled={sendingCode}
                                                    onClick={() => handleDelete(check.id, `${check.company} (${check.check_number})`)}
                                                    style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '4px 8px', opacity: sendingCode ? 0.5 : 1 }}
                                                >
                                                    {sendingCode && deletingCheckInfo?.id === check.id ? '...' : '🗑️'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Standardized Master Check Modal */}
                <CheckModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSave={handleSubmit}
                    editingCheckId={editingCheck?.id || null}
                    checkFormData={formData}
                    setCheckFormData={setFormData}
                    saving={loading}
                    errorMsg={errorMsg}
                    projects={projects}
                />
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
                        zIndex: 2000,
                        padding: 'var(--spacing-md)'
                    }} onClick={() => setShowDeleteModal(false)}>
                        <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <h2 className="mb-md">Çeki Sil</h2>
                            <p className="mb-lg" style={{ color: 'var(--color-text-light)', fontSize: '14px' }}>
                                <strong>{deletingCheckInfo?.name}</strong> kaydını silmek için e-posta adresinize ({user?.email}) gönderilen 4 haneli kodu girin.
                            </p>

                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '11px', textAlign: 'center', display: 'block' }}>KOD E-POSTA ADRESİNİZE GÖNDERİLDİ</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={deleteConfirmCode}
                                    onChange={(e) => setDeleteConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="4 haneli kodu girin"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoFocus
                                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 800, marginTop: '10px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                                <button
                                    onClick={handleDeleteConfirm}
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
                                        setReceivedCode('');
                                        setDeletingCheckInfo(null);
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
        </Layout>
    );
};

export default Checks;
