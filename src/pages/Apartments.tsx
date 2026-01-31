import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { subscribeToApartments, addApartment, updateApartment } from '../services/apartmentService';
import { Apartment, ApartmentInput, ApartmentStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Apartments = () => {
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ApartmentStatus | 'all'>('all');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { user } = useAuth();


    const [formData, setFormData] = useState<ApartmentInput>({
        building_name: '',
        apartment_number: '',
        floor: 0,
        square_meters: 0,
        price: 0,
        status: 'available' as ApartmentStatus,
        customer_name: '',
        customer_phone: '',
    });


    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const handleRefresh = () => {
            if (unsubscribe) unsubscribe();
            unsubscribe = subscribeToApartments(setApartments);
        };

        window.addEventListener('system-refresh', handleRefresh);

        unsubscribe = subscribeToApartments(setApartments);
        setLoading(false);

        return () => {
            window.removeEventListener('system-refresh', handleRefresh);
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setErrorMsg(null);
            if (editingApartment) {
                await updateApartment(editingApartment.id, formData);
            } else {
                await addApartment(formData, user!.id);
            }

            setShowModal(false);
            setEditingApartment(null);
            resetForm();
        } catch (error: any) {
            console.error('Error saving apartment:', error);
            setErrorMsg(error.message || 'Daire kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    const resetForm = () => {
        setFormData({
            building_name: '',
            apartment_number: '',
            floor: 0,
            square_meters: 0,
            price: 0,
            status: 'available',
            customer_name: '',
            customer_phone: '',
        });
    };

    const handleEdit = (apartment: Apartment) => {
        setEditingApartment(apartment);
        setFormData({
            building_name: apartment.building_name,
            apartment_number: apartment.apartment_number,
            floor: apartment.floor,
            square_meters: apartment.square_meters,
            price: apartment.price,
            status: apartment.status,
            customer_name: apartment.customer_name || '',
            customer_phone: apartment.customer_phone || '',
        });
        setShowModal(true);
    };


    const filteredApartments = apartments.filter(apt => {
        const matchesSearch =
            (apt.building_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (apt.apartment_number || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : apt.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalCount = filteredApartments.length;
    const availableCount = filteredApartments.filter(a => a.status === 'available').length;
    const ownerCount = filteredApartments.filter(a => a.status === 'owner').length;
    const soldCount = filteredApartments.filter(a => a.status === 'sold').length;
    const commonCount = filteredApartments.filter(a => a.status === 'common').length;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (status: ApartmentStatus) => {
        const badges = {
            available: { className: 'badge-success', label: 'Müsait' },
            owner: { className: 'badge-warning', label: 'M. Sahibi' },
            sold: { className: 'badge-info', label: 'Satıldı' },
            common: { className: 'badge-secondary', label: 'Ortak Alan' }
        };
        const badge = badges[status] || badges.available;
        const style = status === 'common' ? { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' } : {};
        return <span className={`badge ${badge.className}`} style={style}>{badge.label}</span>;
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
            <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-md">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
                        <span style={{ fontSize: '1.2em' }}>🏢</span> Daire Yönetimi
                    </h1>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '10px 15px' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: '0.6rem', marginBottom: '0.2rem', fontWeight: 600 }}>TOPLAM</h3>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', border: 'none', padding: '10px 15px' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: '0.6rem', marginBottom: '0.2rem', fontWeight: 600 }}>SATILACAK</h3>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{availableCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', border: 'none', padding: '10px 15px' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: '0.6rem', marginBottom: '0.2rem', fontWeight: 600 }}>M. SAHİBİ</h3>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{ownerCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', border: 'none', padding: '10px 15px' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: '0.6rem', marginBottom: '0.2rem', fontWeight: 600 }}>SATILDI</h3>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{soldCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', color: 'white', border: 'none', padding: '10px 15px' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: '0.6rem', marginBottom: '0.2rem', fontWeight: 600 }}>ORTAK ALAN</h3>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{commonCount}</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Bina veya Daire No Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ margin: 0, padding: '8px 12px', paddingLeft: '40px', fontSize: '13px' }}
                        />
                    </div>
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ApartmentStatus | 'all')}
                        style={{ minWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="available">Müsait</option>
                        <option value="owner">M. Sahibi</option>
                        <option value="sold">Satıldı</option>
                        <option value="common">Ortak Alan</option>
                    </select>

                    {(searchTerm || statusFilter !== 'all') && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                            style={{ height: '36px', padding: '0 15px', fontSize: '12px' }}
                        >
                            Filtreyi Temizle
                        </button>
                    )}
                </div>


                {/* Apartments Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
                    gap: '12px',
                    gridAutoRows: 'auto'
                }}>
                    {filteredApartments.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)' }}>
                            Kayıt bulunamadı.
                        </div>
                    ) : (
                        filteredApartments.map((apartment) => (
                            <div key={apartment.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {/* Daire Kartı */}
                                <div
                                    className="card"
                                    onClick={() => handleEdit(apartment)}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        padding: '12px 15px',
                                        marginBottom: 0,
                                        minHeight: '130px',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>

                                    <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '8px', paddingRight: '2.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {apartment.building_name}
                                    </h3>

                                    <div style={{ marginTop: 'auto', fontSize: '11px' }}>
                                        <div style={{ fontWeight: 600, opacity: 0.9, marginBottom: '2px' }}>
                                            🏠 Daire: {apartment.apartment_number}
                                        </div>
                                        <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                            <div>📏 {apartment.square_meters} m² | 🏢 {apartment.floor}. Kat</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Durum Barı */}
                                <div style={{
                                    background: 'rgba(102, 126, 234, 0.15)',
                                    border: '1px solid rgba(102, 126, 234, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {getStatusBadge(apartment.status)}
                                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                                            {formatCurrency(apartment.price)}
                                        </span>
                                    </div>
                                    {apartment.customer_name && (
                                        <span style={{ opacity: 0.7, fontSize: '0.6rem' }}>
                                            👤 {apartment.customer_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>


                {/* Modal */}
                {showModal && (
                    <div className="modal-overlay" style={{ backdropFilter: 'blur(5px)' }}>
                        <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">{editingApartment ? 'Daire Düzenle' : 'Yeni Daire Kaydı'}</h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">BİNA ADI</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.building_name}
                                            onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">DAİRE NO</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.apartment_number}
                                            onChange={(e) => setFormData({ ...formData, apartment_number: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">KAT</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.floor}
                                            onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">METREKARE (m²)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.square_meters}
                                            onChange={(e) => setFormData({ ...formData, square_meters: Number(e.target.value) })}
                                            min="0"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">FİYAT (₺)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                            min="0"
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">DURUM</label>
                                        <select
                                            className="form-select"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as ApartmentStatus })}
                                        >
                                            <option value="available">Müsait</option>
                                            <option value="owner">M. Sahibi</option>
                                            <option value="sold">Satıldı</option>
                                            <option value="common">Ortak Alan</option>
                                        </select>
                                    </div>

                                    {formData.status !== 'available' && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">MÜŞTERİ ADI</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.customer_name}
                                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">MÜŞTERİ TELEFON</label>
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    value={formData.customer_phone}
                                                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}
                                    {errorMsg && (
                                        <div style={{
                                            gridColumn: 'span 2',
                                            padding: '10px',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            border: '1px solid #fecaca',
                                            marginTop: '10px'
                                        }}>
                                            ⚠️ {errorMsg}
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 30px' }}>
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
