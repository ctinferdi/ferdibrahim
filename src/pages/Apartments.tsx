import React, { useEffect, useState } from 'react';
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
        building_name: '',
        apartment_number: '',
        floor: 0,
        square_meters: 0,
        price: 0,
        status: 'available' as ApartmentStatus,
        customer_name: '',
        customer_phone: '',
    });

    const { user } = useAuth();

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
                await addApartment(formData, user!.id);
            }

            setShowModal(false);
            setEditingApartment(null);
            resetForm();
        } catch (error) {
            console.error('Error saving apartment:', error);
            alert('Daire kaydedilemedi. Lütfen tekrar deneyin.');
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
        const matchesSearch =
            (apt.building_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (apt.apartment_number || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const availableCount = apartments.filter(a => a.status === 'available').length;
    const reservedCount = apartments.filter(a => a.status === 'reserved').length;
    const soldCount = apartments.filter(a => a.status === 'sold').length;
    const totalRevenue = apartments.filter(a => a.status === 'sold').reduce((sum, a) => sum + (a.price || 0), 0);

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
            reserved: { className: 'badge-warning', label: 'Rezerve' },
            sold: { className: 'badge-info', label: 'Satıldı' }
        };
        const badge = badges[status] || badges.available;
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
            <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-xl">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2em' }}>🏢</span> Daire Yönetimi
                    </h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingApartment(null);
                            resetForm();
                            setShowModal(true);
                        }}
                        style={{ boxShadow: 'var(--shadow-md)' }}
                    >
                        ➕ Yeni Daire
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', border: 'none' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>MÜSAİT</h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>{availableCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', border: 'none' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>REZERVE</h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>{reservedCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', border: 'none' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>SATILDI</h3>
                        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>{soldCount}</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
                        <h3 style={{ color: 'white', opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '0.5rem', fontWeight: 600 }}>TOPLAM SATIŞ</h3>
                        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>{formatCurrency(totalRevenue)}</div>
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
                            style={{ margin: 0, paddingLeft: '40px' }}
                        />
                    </div>
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ApartmentStatus | 'all')}
                        style={{ minWidth: '180px', margin: 0 }}
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="available">Müsait</option>
                        <option value="reserved">Rezerve</option>
                        <option value="sold">Satıldı</option>
                    </select>
                </div>

                {/* Table */}
                <div className="table-container card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Bina Adı</th>
                                <th>Daire No</th>
                                <th>Kat</th>
                                <th>m²</th>
                                <th style={{ textAlign: 'right' }}>Fiyat</th>
                                <th>Durum</th>
                                <th>Müşteri Bilgisi</th>
                                <th style={{ textAlign: 'center' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApartments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-light)' }}>
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                filteredApartments.map((apartment) => (
                                    <tr key={apartment.id}>
                                        <td><strong>{apartment.building_name}</strong></td>
                                        <td>{apartment.apartment_number}</td>
                                        <td>{apartment.floor}. Kat</td>
                                        <td>{apartment.square_meters} m²</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                                            {formatCurrency(apartment.price)}
                                        </td>
                                        <td>{getStatusBadge(apartment.status)}</td>
                                        <td>
                                            {apartment.customer_name ? (
                                                <div style={{ fontSize: 'var(--font-size-sm)' }}>
                                                    <div style={{ fontWeight: 600 }}>{apartment.customer_name}</div>
                                                    <div style={{ opacity: 0.7 }}>{apartment.customer_phone}</div>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleEdit(apartment)}
                                                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleDelete(apartment.id)}
                                                    style={{ background: '#fee2e2', border: '1px solid #fecaca' }}
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
                    <div className="modal-overlay" style={{ backdropFilter: 'blur(5px)' }} onClick={() => setShowModal(false)}>
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
                                            <option value="reserved">Rezerve</option>
                                            <option value="sold">Satıldı</option>
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
