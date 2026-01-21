import { apartmentService } from '../../../services/apartmentService';
import { formatNumberWithDots, parseNumberFromDots } from '../../../utils/formatters';
import FileUploadSection from './FileUploadSection';

interface ApartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    id: string;
    project: any;
    editingApartmentId: string | null;
    apartmentFormData: any;
    setApartmentFormData: (data: any) => void;
    setEditingApartmentId: (id: string | null) => void;
    setApartments: (apts: any[]) => void;
    formatCurrency: (val: number) => string;
}

const ApartmentModal: React.FC<ApartmentModalProps> = ({
    isOpen, onClose, id, project, editingApartmentId,
    apartmentFormData, setApartmentFormData,
    setEditingApartmentId, setApartments, formatCurrency
}) => {
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const cleanData = {
                ...apartmentFormData,
                price: parseNumberFromDots(apartmentFormData.price),
                sold_price: parseNumberFromDots(apartmentFormData.sold_price),
                paid_amount: parseNumberFromDots(apartmentFormData.paid_amount),
                square_meters: Number(apartmentFormData.square_meters) || 0,
                floor: Number(apartmentFormData.floor) || 0,
                sort_order: Number(apartmentFormData.sort_order) || 0
            };

            if (editingApartmentId) {
                const { project_id, ...updateData } = cleanData;
                await apartmentService.updateApartment(editingApartmentId, updateData);
            } else {
                await apartmentService.addApartment(cleanData, project?.user_id || '');
            }
            onClose();
            setEditingApartmentId(null);
            setApartmentFormData({
                building_name: project?.name || '',
                apartment_number: '',
                floor: 1,
                square_meters: 0,
                price: 0,
                sold_price: 0,
                paid_amount: 0,
                status: 'available',
                customer_name: '',
                customer_phone: '',
                sort_order: 0,
                project_id: id || ''
            });
            const allApartments = await apartmentService.getApartments();
            setApartments(allApartments.filter(a => a.project_id === id));
        } catch (error: any) {
            console.error('Daire hatası:', error);
            alert(`Hata: ${error.message || 'Daire işlemi sırasında bir hata oluştu!'}`);
        }
    };

    // Helpers removed and replaced by shared formatters

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 'var(--spacing-md)'
        }}>
            <div className="card" style={{
                width: 'min(100%, 500px)',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: 'var(--spacing-lg)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>
                    {editingApartmentId
                        ? `Daire ${apartmentFormData.apartment_number || '—'} - Düzenle`
                        : 'Yeni Daire Ekle'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                Bina Adı
                            </label>
                            <input
                                type="text"
                                required
                                value={apartmentFormData.building_name}
                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, building_name: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    Daire No
                                </label>
                                <input
                                    type="text"
                                    required={apartmentFormData.status !== 'common_area'}
                                    value={apartmentFormData.apartment_number}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, apartment_number: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                    placeholder={apartmentFormData.status === 'common_area' ? 'Opsiyonel' : 'Daire numarası'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    Kat
                                </label>
                                <input
                                    type="number"
                                    required
                                    disabled={!!editingApartmentId}
                                    value={apartmentFormData.floor}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, floor: parseInt(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: editingApartmentId ? '#f1f5f9' : 'white',
                                        cursor: editingApartmentId ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>
                        </div>



                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                Daire Liste Fiyatı
                            </label>
                            <input
                                type="text"
                                required
                                value={formatNumberWithDots(apartmentFormData.price)}
                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, price: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                Durum
                            </label>
                            <select
                                value={apartmentFormData.status}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setApartmentFormData({
                                        ...apartmentFormData,
                                        status: newStatus,
                                        price: (newStatus === 'owner' || newStatus === 'common') ? 0 : apartmentFormData.price,
                                        sold_price: newStatus === 'sold' ? (apartmentFormData.sold_price || apartmentFormData.price) : 0,
                                        paid_amount: newStatus === 'sold' ? apartmentFormData.paid_amount : 0
                                    });
                                }}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="available">Müsait</option>
                                <option value="owner">Mal Sahibi</option>
                                <option value="sold">Satıldı</option>
                                <option value="common">Ortak Alan</option>
                            </select>
                        </div>

                        {apartmentFormData.status === 'sold' && (
                            <div style={{ padding: 'var(--spacing-md)', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gap: 'var(--spacing-sm)' }}>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Satış Detayları</h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Kaça Satıldı?</label>
                                        <input
                                            type="text"
                                            value={formatNumberWithDots(apartmentFormData.sold_price)}
                                            onChange={(e) => setApartmentFormData({ ...apartmentFormData, sold_price: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#1e40af' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Aldığım (Peşinat/Ara Öd.)</label>
                                        <input
                                            type="text"
                                            value={formatNumberWithDots(apartmentFormData.paid_amount)}
                                            onChange={(e) => setApartmentFormData({ ...apartmentFormData, paid_amount: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#10b981' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px dashed #feb2b2' }}>
                                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#c53030' }}>KALAN ALACAK:</span>
                                    <span style={{ fontWeight: 'bold', color: '#c53030' }}>
                                        {formatCurrency(parseNumberFromDots(apartmentFormData.sold_price) - parseNumberFromDots(apartmentFormData.paid_amount))}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* File Upload Section */}
                        <FileUploadSection
                            editingApartmentId={editingApartmentId}
                            apartmentFormData={apartmentFormData}
                            setApartments={setApartments}
                            projectId={id}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    {apartmentFormData.status === 'owner' ? 'Mal Sahibi Adı' : 'Müşteri Adı (Opsiyonel)'}
                                </label>
                                <input
                                    type="text"
                                    value={apartmentFormData.customer_name}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, customer_name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                    Müşteri Telefon (Opsiyonel)
                                </label>
                                <input
                                    type="tel"
                                    value={apartmentFormData.customer_phone}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, customer_phone: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                                {editingApartmentId ? 'Güncelle' : 'Kaydet'}
                            </button>
                            {editingApartmentId && (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={async () => {
                                        if (confirm('Bu daireyi silmek istediğinize emin misiniz?')) {
                                            await apartmentService.deleteApartment(editingApartmentId);
                                            onClose();
                                            setEditingApartmentId(null);
                                            const allApartments = await apartmentService.getApartments();
                                            setApartments(allApartments.filter(a => a.project_id === id));
                                        }
                                    }}
                                    style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                >
                                    Sil
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                style={{ flex: 1 }}
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApartmentModal;
