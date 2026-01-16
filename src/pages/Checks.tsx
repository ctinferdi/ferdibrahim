import { useEffect, useState } from 'react';
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
    const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all');

    const [formData, setFormData] = useState<CheckInput>({
        alici: '',
        tutar: 0,
        tarih: new Date(),
        cekNo: '',
        durum: 'beklemede' as CheckStatus,
        aciklama: ''
    });

    const { currentUser } = useAuth();

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
                await addCheck(formData, currentUser!.uid);
            }

            setShowModal(false);
            setEditingCheck(null);
            setFormData({ alici: '', tutar: 0, tarih: new Date(), cekNo: '', durum: 'beklemede', aciklama: '' });
        } catch (error) {
            console.error('Error saving check:', error);
            alert('Çek kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleEdit = (check: Check) => {
        setEditingCheck(check);
        setFormData({
            alici: check.alici,
            tutar: check.tutar,
            tarih: check.tarih,
            cekNo: check.cekNo,
            durum: check.durum,
            aciklama: check.aciklama || ''
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

    const filteredChecks = checks.filter(check => {
        const matchesSearch = check.alici.toLowerCase().includes(searchTerm.toLowerCase()) ||
            check.cekNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || check.durum === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPending = checks.filter(c => c.durum === 'beklemede').reduce((sum, c) => sum + c.tutar, 0);
    const totalPaid = checks.filter(c => c.durum === 'odendi').reduce((sum, c) => sum + c.tutar, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (durum: CheckStatus) => {
        const badges = {
            beklemede: { className: 'badge-warning', label: 'Beklemede' },
            odendi: { className: 'badge-success', label: 'Ödendi' },
            iptal: { className: 'badge-danger', label: 'İptal' }
        };
        const badge = badges[durum];
        return <span className={`badge ${badge.className}`}>{badge.label}</span>;
    };

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
            <div>
                <div className="flex justify-between items-center mb-xl">
                    <h1>💳 Çek Yönetimi</h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingCheck(null);
                            setFormData({ alici: '', tutar: 0, tarih: new Date(), cekNo: '', durum: 'beklemede', aciklama: '' });
                            setShowModal(true);
                        }}
                    >
                        ➕ Yeni Çek
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>BEKLEYEN ÇEKLER</h3>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{formatCurrency(totalPending)}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>ÖDENMİŞ ÇEKLER</h3>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{formatCurrency(totalPaid)}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card mb-lg">
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Çek ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1, minWidth: '250px' }}
                        />
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as CheckStatus | 'all')}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="all">Tüm Durumlar</option>
                            <option value="beklemede">Beklemede</option>
                            <option value="odendi">Ödendi</option>
                            <option value="iptal">İptal</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                {filteredChecks.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <p style={{ color: 'var(--color-text-light)' }}>
                            {searchTerm || statusFilter !== 'all' ? 'Arama kriterlerine uygun çek bulunamadı.' : 'Henüz çek kaydı yok. Yeni çek ekleyerek başlayın.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Çek No</th>
                                    <th>Alıcı</th>
                                    <th style={{ textAlign: 'right' }}>Tutar</th>
                                    <th>Durum</th>
                                    <th>Açıklama</th>
                                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredChecks.map((check) => (
                                    <tr key={check.id}>
                                        <td>{check.tarih.toLocaleDateString('tr-TR')}</td>
                                        <td><strong>{check.cekNo}</strong></td>
                                        <td>{check.alici}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(check.tutar)}</td>
                                        <td>{getStatusBadge(check.durum)}</td>
                                        <td style={{ color: 'var(--color-text-light)' }}>{check.aciklama || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(check)}
                                                style={{ marginRight: 'var(--spacing-sm)' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(check.id)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">{editingCheck ? 'Çek Düzenle' : 'Yeni Çek'}</h2>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Çek No</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.cekNo}
                                            onChange={(e) => setFormData({ ...formData, cekNo: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Alıcı</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.alici}
                                            onChange={(e) => setFormData({ ...formData, alici: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tutar (₺)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.tutar}
                                            onChange={(e) => setFormData({ ...formData, tutar: Number(e.target.value) })}
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tarih</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.tarih instanceof Date ? formData.tarih.toISOString().split('T')[0] : ''}
                                            onChange={(e) => setFormData({ ...formData, tarih: new Date(e.target.value) })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Durum</label>
                                        <select
                                            className="form-select"
                                            value={formData.durum}
                                            onChange={(e) => setFormData({ ...formData, durum: e.target.value as CheckStatus })}
                                        >
                                            <option value="beklemede">Beklemede</option>
                                            <option value="odendi">Ödendi</option>
                                            <option value="iptal">İptal</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Açıklama (Opsiyonel)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.aciklama}
                                            onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingCheck ? 'Güncelle' : 'Kaydet'}
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
