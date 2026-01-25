import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { subscribeToChecks, addCheck, updateCheck, deleteCheck } from '../services/checkService';
import { projectService } from '../services/projectService';
import { supabase } from '../config/supabase';
import { Check, CheckInput, CheckStatus, Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatNumberWithDots, parseNumberFromDots } from '../utils/formatters';

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
    const superAdminEmails = ['ctinferdi@gmail.com', 'ibrahim.erhan2@gmail.com'];
    const isSuperAdmin = user?.email && superAdminEmails.includes(user.email);

    const handleAdminAction = (action: () => void) => {
        if (!isSuperAdmin) {
            alert(`Bu işlem için yönetici onayı gereklidir.`);
            return;
        }
        action();
    };

    const [formData, setFormData] = useState<CheckInput>({
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
        project_id: ''
    });


    useEffect(() => {
        const unsubscribe = subscribeToChecks(setChecks);
        projectService.getProjects().then(setProjects);
        setLoading(false);
        return unsubscribe;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setErrorMsg(null);
            if (editingCheck) {
                await updateCheck(editingCheck.id, formData);
            } else {
                await addCheck(formData, user!.id);
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
            project_id: check.project_id || ''
        });
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
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>VADE TARİHİ</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ÇEKLER</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ŞİRKET</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>KULLANILACAK YER</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>KDV DURUMU</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>PROJE</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>BİLDİRİM</th>
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
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7' }}>
                                            {(check.notification_email || projects.find(p => p.id === check.project_id)?.notification_emails?.length) ? (
                                                <span title="Bu çek için bildirim kuruludur (Vadeye 10 gün kala)" style={{ cursor: 'help' }}>🔔</span>
                                            ) : '-'}
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

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)}>
                        <div className="modal" style={{ maxWidth: '480px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header" style={{ background: 'var(--color-bg-alt)', padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{editingCheck ? 'Çeki Düzenle' : 'Yeni Çek Kaydı'}</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ padding: '15px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>ŞİRKET BİLGİSİ</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            placeholder="Örn: ÖZYILMAZLAR"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>ÇEK NO</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.check_number}
                                            onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                                            placeholder="000123"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>TUTAR (₺)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formatNumberWithDots(formData.amount)}
                                            onChange={(e) => setFormData({ ...formData, amount: parseNumberFromDots(e.target.value) })}
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>KULLANILACAK YER</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Örn: BETON, ASANSÖR"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>KDV DURUMU</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.vat_status}
                                            onChange={(e) => setFormData({ ...formData, vat_status: e.target.value })}
                                            placeholder="Örn: KDV DAHİL"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>PROJE (OPSİYONEL)</label>
                                        <select
                                            className="form-input"
                                            value={formData.project_id}
                                            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                            style={{ padding: '8px 12px', fontSize: '13px', height: 'auto' }}
                                        >
                                            <option value="">Proje Seçilmedi</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>ÇEKİ VERECEK KİŞİ</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.issuer}
                                            onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                                            placeholder="Örn: ERHANLAR"
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>DURUM</label>
                                        <select
                                            className="form-select"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as CheckStatus })}
                                            style={{ padding: '8px 12px', fontSize: '13px', margin: 0 }}
                                        >
                                            <option value="pending">Beklemede</option>
                                            <option value="paid">Ödendi</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>VERİLİŞ TARİHİ</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.given_date}
                                            onChange={(e) => setFormData({ ...formData, given_date: e.target.value })}
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>VADE TARİHİ</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            style={{ padding: '8px 12px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px', color: '#dc2626', fontWeight: 700 }}>BİLDİRİM GÖNDERİLECEK E-POSTA</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.notification_email}
                                            onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                                            placeholder="Örn: ornek@mail.com (Vade yaklaştığında mail gider)"
                                            style={{ padding: '8px 12px', fontSize: '13px', borderColor: '#fca5a5' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: '5px' }}>
                                        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>AÇIKLAMA (OPSİYONEL)</label>
                                        <textarea
                                            className="form-input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={1}
                                            style={{ resize: 'none', padding: '8px 12px', fontSize: '13px' }}
                                        />
                                    </div>

                                    {errorMsg && (
                                        <div style={{
                                            gridColumn: 'span 2',
                                            padding: '10px',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            border: '1px solid #fecaca'
                                        }}>
                                            ⚠️ {errorMsg}
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', borderTop: '1px solid var(--color-border)' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '8px 15px', fontSize: '13px' }}>
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 25px', fontWeight: 600, fontSize: '13px' }}>
                                        {editingCheck ? 'Güncelle' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
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
                                <strong>{deletingCheckInfo?.name}</strong> kaydını silmek için e-posta adresinize (ctinferdi@gmail.com) gönderilen 4 haneli kodu girin.
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
