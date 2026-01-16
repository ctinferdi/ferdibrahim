import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { subscribeToApartments, addApartment, updateApartment, deleteApartment } from '../services/apartmentService';
import { Apartment, ApartmentInput, ApartmentStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Apartments = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ApartmentStatus | 'all'>('all');

    const [formData, setFormData] = useState<ApartmentInput>({
        bina: '',
        daireNo: '',
        kat: 0,
        metrekare: 0,
        fiyat: 0,
        durum: 'musait' as ApartmentStatus,
        aciklama: '',
        musteriAdi: '',
        musteriTelefon: ''
    });

    const { currentUser } = useAuth();

    useEffect(() => {
        const unsubscribe = subscribeToApartments(setApartments);
        setLoading(false);
        return unsubscribe;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingApartment) {
                await updateApartment(editingApartment.id, formData);
            } else {
                await addApartment(formData, currentUser!.uid);
            }

            setShowModal(false);
            setEditingApartment(null);
            setFormData({ bina: '', daireNo: '', kat: 0, metrekare: 0, fiyat: 0, durum: 'musait', aciklama: '', musteriAdi: '', musteriTelefon: '' });
        } catch (error) {
            console.error('Error saving apartment:', error);
            alert('Daire kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleEdit = (apartment: Apartment) => {
        setEditingApartment(apartment);
        setFormData({
            bina: apartment.bina,
            daireNo: apartment.daireNo,
            kat: apartment.kat,
            metrekare: apartment.metrekare,
            fiyat: apartment.fiyat,
            durum: apartment.durum,
            aciklama: apartment.aciklama || '',
            musteriAdi: apartment.musteriAdi || '',
            musteriTelefon: apartment.musteriTelefon || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bu daireyi silmek istediğinizden emin misiniz?')) {
            try {
                await deleteApartment(id);
            } catch (error) {
                console.error('Error deleting apartment:', error);
                alert('Daire silinemedi. Lütfen tekrar deneyin.');
            }
        }
    };

    const filteredApartments = apartments.filter(apt => {
        const matchesSearch = apt.bina.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.daireNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.durum === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const availableCount = apartments.filter(a => a.durum === 'musait').length;
    const reservedCount = apartments.filter(a => a.durum === 'rezerve').length;
    const soldCount = apartments.filter(a => a.durum === 'satildi').length;
    const totalRevenue = apartments.filter(a => a.durum === 'satildi').reduce((sum, a) => sum + a.fiyat, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (durum: ApartmentStatus) => {
        const badges = {
            musait: { className: 'badge-success', label: 'Müsait' },
            rezerve: { className: 'badge-warning', label: 'Rezerve' },
            satildi: { className: 'badge-info', label: 'Satıldı' }
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
                    <h1>🏢 Daire Yönetimi</h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingApartment(null);
                            setFormData({ bina: '', daireNo: '', kat: 0, metrekare: 0, fiyat: 0, durum: 'musait', aciklama: '', musteriAdi: '', musteriTelefon: '' });
                            setShowModal(true);
                        }}
                    >
                        ➕ Yeni Daire
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>MÜSAİT</h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{availableCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>REZERVE</h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{reservedCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>SATILDI</h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{soldCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem' }}>TOPLAM GELİR</h3>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{formatCurrency(totalRevenue)}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card mb-lg">
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Daire ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ flex: 1, minWidth: '250px' }}
                        />
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ApartmentStatus | 'all')}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="all">Tüm Durumlar</option>
                            <option value="musait">Müsait</option>
                            <option value="rezerve">Rezerve</option>
                            <option value="satildi">Satıldı</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                {filteredApartments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <p style={{ color: 'var(--color-text-light)' }}>
                            {searchTerm || statusFilter !== 'all' ? 'Arama kriterlerine uygun daire bulunamadı.' : 'Henüz daire kaydı yok. Yeni daire ekleyerek başlayın.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Bina</th>
                                    <th>Daire No</th>
                                    <th>Kat</th>
                                    <th>m²</th>
                                    <th style={{ textAlign: 'right' }}>Fiyat</th>
                                    <th>Durum</th>
                                    <th>Müşteri</th>
                                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApartments.map((apartment) => (
                                    <tr key={apartment.id}>
                                        <td><strong>{apartment.bina}</strong></td>
                                        <td>{apartment.daireNo}</td>
                                        <td>{apartment.kat}</td>
                                        <td>{apartment.metrekare} m²</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                            {formatCurrency(apartment.fiyat)}
                                        </td>
                                        <td>{getStatusBadge(apartment.durum)}</td>
                                        <td style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {apartment.musteriAdi ? (
                                                <>
                                                    {apartment.musteriAdi}
                                                    {apartment.musteriTelefon && <><br /><span style={{ color: 'var(--color-text-light)' }}>{apartment.musteriTelefon}</span></>}
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(apartment)}
                                                style={{ marginRight: 'var(--spacing-sm)' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(apartment.id)}
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
                                <h2 className="modal-title">{editingApartment ? 'Daire Düzenle' : 'Yeni Daire'}</h2>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Bina</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.bina}
                                                onChange={(e) => setFormData({ ...formData, bina: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Daire No</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.daireNo}
                                                onChange={(e) => setFormData({ ...formData, daireNo: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Kat</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={formData.kat}
                                                onChange={(e) => setFormData({ ...formData, kat: Number(e.target.value) })}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Metrekare</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={formData.metrekare}
                                                onChange={(e) => setFormData({ ...formData, metrekare: Number(e.target.value) })}
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Fiyat (₺)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.fiyat}
                                            onChange={(e) => setFormData({ ...formData, fiyat: Number(e.target.value) })}
                                            min="0"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Durum</label>
                                        <select
                                            className="form-select"
                                            value={formData.durum}
                                            onChange={(e) => setFormData({ ...formData, durum: e.target.value as ApartmentStatus })}
                                        >
                                            <option value="musait">Müsait</option>
                                            <option value="rezerve">Rezerve</option>
                                            <option value="satildi">Satıldı</option>
                                        </select>
                                    </div>

                                    {formData.durum !== 'musait' && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">Müşteri Adı</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.musteriAdi}
                                                    onChange={(e) => setFormData({ ...formData, musteriAdi: e.target.value })}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Müşteri Telefon</label>
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    value={formData.musteriTelefon}
                                                    onChange={(e) => setFormData({ ...formData, musteriTelefon: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}

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
                                        {editingApartment ? 'Güncelle' : 'Kaydet'}
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

export default Apartments;
