import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { subscribeToChecks, addCheck, updateCheck, deleteCheck } from '../services/checkService';
import { Check, CheckInput, CheckStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Checks = () => {
    const [checks, setChecks] = useState<Check[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCheck, setEditingCheck] = useState<Check | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'all'>('pending');

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
        description: ''
    });

    const { user } = useAuth();

    useEffect(() => {
        const unsubscribe = subscribeToChecks(setChecks);
        setLoading(false);
        return unsubscribe;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingCheck) {
                await updateCheck(editingCheck.id, formData);
            } else {
                await addCheck(formData, user!.id);
            }

            setShowModal(false);
            setEditingCheck(null);
            resetForm();
        } catch (error) {
            console.error('Error saving check:', error);
            alert('Çek kaydedilemedi. Lütfen tekrar deneyin.');
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
            description: ''
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
            description: check.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bu çeki silmek istediğinizden emin misiniz?')) {
            try {
                await deleteCheck(id);
            } catch (error) {
                console.error('Error deleting check:', error);
                alert('Çek silinemedi. Lütfen tekrar deneyin.');
            }
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
                </div>

                {/* Table */}
                <div className="table-container card" style={{ padding: 0, overflow: 'hidden', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', border: '1px solid #f59e0b' }}>
                    <table className="table" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#fef3c7' }}>
                            <tr>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>TARİH</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ÇEKLER</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>FİRMA</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>KULLANILACAK YER</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>KDV</th>
                                <th style={{ color: '#92400e', textAlign: 'center', borderRight: '1px solid #fde68a' }}>ÇEKİ VERECEK KİŞİ</th>
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
                                        <td style={{ textAlign: 'center', borderRight: '1px solid #fef3c7', fontWeight: 500 }}>
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
                                                    onClick={() => handleDelete(check.id)}
                                                    style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '4px 8px' }}
                                                >
                                                    🗑️
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
                    <div className="modal-overlay" style={{ backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowModal(false)}>
                        <div className="modal" style={{ maxWidth: '600px', borderRadius: '15px' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header" style={{ background: 'var(--color-bg-alt)', padding: '20px 25px' }}>
                                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.4rem' }}>{editingCheck ? 'Çeki Düzenle' : 'Yeni Çek Kaydı'}</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}>×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">FİRMA ADI</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            placeholder="Örn: ÖZYILMAZLAR"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">ÇEK NO</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.check_number}
                                            onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                                            placeholder="000123"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">TUTAR (₺)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">KULLANILACAK YER</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Örn: BETON, ASANSÖR"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">KDV DURUMU</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.vat_status}
                                            onChange={(e) => setFormData({ ...formData, vat_status: e.target.value })}
                                            placeholder="Örn: KDV DAHİL"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">ÇEKİ VERECEK KİŞİ</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.issuer}
                                            onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                                            placeholder="Örn: ERHANLAR"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">DURUM</label>
                                        <select
                                            className="form-select"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as CheckStatus })}
                                        >
                                            <option value="pending">Beklemede</option>
                                            <option value="paid">Ödendi</option>
                                            <option value="cancelled">İptal</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">VERİLİŞ TARİHİ</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.given_date}
                                            onChange={(e) => setFormData({ ...formData, given_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">VADE TARİHİ</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">AÇIKLAMA (OPSİYONEL)</label>
                                        <textarea
                                            className="form-input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={2}
                                            style={{ resize: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer" style={{ padding: '20px 25px', background: '#f8fafc', borderBottomLeftRadius: '15px', borderBottomRightRadius: '15px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '10px 20px' }}>
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 30px', fontWeight: 600 }}>
                                        {editingCheck ? 'Değişiklikleri Kaydet' : 'Çeki Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Checks;
