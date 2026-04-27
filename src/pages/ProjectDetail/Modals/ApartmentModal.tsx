import React, { useState, useEffect } from 'react';
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

    const [installments, setInstallments] = useState<any[]>([]);
    const [showInstallments, setShowInstallments] = useState(false);
    const [showSalesDetails, setShowSalesDetails] = useState(false);
    const [showPlans, setShowPlans] = useState(false);
    const [baseDownpayment, setBaseDownpayment] = useState<string>('0');

    useEffect(() => {
        const initialInstallments = apartmentFormData.installments || [];
        setInstallments(initialInstallments);

        // İlk açılışta ana peşinatı hesapla: Toplam Alınan - Ödenmiş Taksitler
        const totalPaid = apartmentFormData.paid_amount || 0;
        const paidInstallmentsSum = initialInstallments
            .filter((ins: any) => ins.status === 'paid')
            .reduce((sum: number, ins: any) => sum + (Number(ins.amount) || 0), 0);
        
        setBaseDownpayment(formatNumberWithDots(totalPaid - paidInstallmentsSum));
    }, [apartmentFormData.installments, apartmentFormData.paid_amount]);

    const addInstallment = () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + installments.length + 1);
        const newInstallment = {
            id: crypto.randomUUID(),
            amount: 0,
            due_date: nextMonth.toISOString().split('T')[0],
            status: 'pending',
            description: `${installments.length + 1}. Taksit`
        };
        setInstallments([...installments, newInstallment]);
    };

    const updateInstallment = (id: string, field: string, value: any) => {
        setInstallments(installments.map(ins => 
            ins.id === id ? { ...ins, [field]: value } : ins
        ));
    };

    const removeInstallment = (id: string) => {
        setInstallments(installments.filter(ins => ins.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const cleanInstallments = installments.map(ins => ({
                ...ins,
                amount: typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : ins.amount
            }));

            // Ödenen taksitlerin toplamını hesapla
            const paidInstallmentsTotal = cleanInstallments
                .filter(ins => ins.status === 'paid')
                .reduce((sum, ins) => sum + (ins.amount || 0), 0);

            // Ana peşinat (input'tan gelen)
            const currentBaseDownpayment = parseNumberFromDots(baseDownpayment);

            const cleanData = {
                ...apartmentFormData,
                price: parseNumberFromDots(apartmentFormData.price),
                sold_price: parseNumberFromDots(apartmentFormData.sold_price),
                // Toplam alınan ödeme = Ana Peşinat + Ödenen Taksitler
                paid_amount: currentBaseDownpayment + paidInstallmentsTotal,
                square_meters: Number(apartmentFormData.square_meters) || 0,
                floor: Number(apartmentFormData.floor) || 0,
                sort_order: Number(apartmentFormData.sort_order) || 0,
                installments: cleanInstallments
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
                                    required={apartmentFormData.status !== 'common'}
                                    value={apartmentFormData.apartment_number}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, apartment_number: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                    placeholder={apartmentFormData.status === 'common' ? 'Opsiyonel' : 'Daire numarası'}
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



                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
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
                                    Daire Alanı (m²)
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={apartmentFormData.square_meters}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, square_meters: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={showSalesDetails} 
                                        onChange={(e) => setShowSalesDetails(e.target.checked)}
                                        id="chkSalesDetails"
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="chkSalesDetails" style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                                        Satış Detayları {showSalesDetails ? '' : '(Gizli)'}
                                    </label>
                                </div>

                                {showSalesDetails && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: '8px' }}>
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
                                                    value={baseDownpayment}
                                                    onChange={(e) => setBaseDownpayment(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#10b981' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px dashed #feb2b2' }}>
                                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#c53030' }}>GERÇEK KALAN ALACAK:</span>
                                            <span style={{ fontWeight: 'bold', color: '#c53030' }}>
                                                {formatCurrency(
                                                    parseNumberFromDots(apartmentFormData.sold_price) - 
                                                    (parseNumberFromDots(baseDownpayment) + 
                                                    installments.filter(ins => ins.status === 'paid').reduce((sum, ins) => sum + (typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : ins.amount), 0))
                                                )}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Taksitler Bölümü Header (Gizle/Göster) */}
                                <div style={{ 
                                    marginTop: 'var(--spacing-sm)', 
                                    padding: '10px', 
                                    background: '#fff', 
                                    borderRadius: '6px', 
                                    border: '1px solid #e2e8f0' 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={showInstallments} 
                                                onChange={(e) => setShowInstallments(e.target.checked)}
                                                id="chkInstallments"
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label htmlFor="chkInstallments" style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                                                TAKSİT PLANI {showInstallments ? '' : '(Gizli)'}
                                            </label>
                                        </div>
                                        {showInstallments && (
                                            <button 
                                                type="button" 
                                                onClick={addInstallment}
                                                style={{ padding: '2px 8px', fontSize: '10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                + Taksit Ekle
                                            </button>
                                        )}
                                    </div>
                                    
                                    {showInstallments && (
                                        <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                                            {installments.map((ins, _idx) => (
                                                <div key={ins.id} style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '6px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                                    <input 
                                                        type="text"
                                                        placeholder="Tutar"
                                                        value={formatNumberWithDots(ins.amount)}
                                                        onChange={(e) => updateInstallment(ins.id, 'amount', e.target.value)}
                                                        style={{ width: '80px', padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    />
                                                    <input 
                                                        type="date"
                                                        value={ins.due_date}
                                                        onChange={(e) => updateInstallment(ins.id, 'due_date', e.target.value)}
                                                        style={{ flex: 1, padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    />
                                                    <select 
                                                        value={ins.status}
                                                        onChange={(e) => updateInstallment(ins.id, 'status', e.target.value)}
                                                        style={{ padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', color: ins.status === 'paid' ? '#10b981' : '#f59e0b' }}
                                                    >
                                                        <option value="pending">Bekliyor</option>
                                                        <option value="paid">Ödendi</option>
                                                    </select>
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeInstallment(ins.id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}
                                                    >✕</button>
                                                </div>
                                            ))}
                                            {installments.length === 0 && (
                                                <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', padding: '10px', fontStyle: 'italic' }}>
                                                    Taksit planı oluşturulmadı.
                                                </div>
                                            )}
                                            
                                            {installments.length > 0 && (
                                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                    <span style={{ fontWeight: 600 }}>Taksit Toplamı:</span>
                                                    <span style={{ fontWeight: 700, color: '#6366f1' }}>
                                                        {formatCurrency(installments.reduce((sum, ins) => sum + (typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : ins.amount), 0))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={showPlans} 
                                        onChange={(e) => setShowPlans(e.target.checked)}
                                        id="chkPlans"
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <label htmlFor="chkPlans" style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                                        Daire Planları {showPlans ? '' : '(Gizli)'}
                                    </label>
                                </div>

                                {showPlans && (
                                    <FileUploadSection
                                        editingApartmentId={editingApartmentId}
                                        apartmentFormData={apartmentFormData}
                                        setApartments={setApartments}
                                        setApartmentFormData={setApartmentFormData}
                                        projectId={id}
                                    />
                                )}

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
