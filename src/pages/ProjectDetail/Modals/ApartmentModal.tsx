import React, { useState, useEffect } from 'react';
import { apartmentService } from '../../../services/apartmentService';
import { formatNumberWithDots, parseNumberFromDots, formatMoneyWithCurrency, getCurrencySymbol } from '../../../utils/formatters';
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

    const [currency, setCurrency] = useState<string>('TRY');
    const [installments, setInstallments] = useState<any[]>([]);
    const [showInstallments, setShowInstallments] = useState(true);
    const [showSalesDetails, setShowSalesDetails] = useState(true);
    const [showPlans, setShowPlans] = useState(false);
    const [baseDownpayment, setBaseDownpayment] = useState<string>('0');

    useEffect(() => {
        const initialCurrency = apartmentFormData.currency || 'TRY';
        setCurrency(initialCurrency);

        const initialInstallments = apartmentFormData.installments || [];
        setInstallments(initialInstallments);

        // İlk açılışta ana peşinatı hesapla: Toplam Alınan - Ödenmiş Taksitler
        const totalPaid = apartmentFormData.paid_amount || 0;
        const paidInstallmentsSum = initialInstallments
            .filter((ins: any) => ins.status === 'paid')
            .reduce((sum: number, ins: any) => sum + (Number(ins.amount) || 0), 0);
        
        setBaseDownpayment(formatNumberWithDots(Math.max(0, totalPaid - paidInstallmentsSum)));

        if (apartmentFormData.status === 'sold') {
            setShowSalesDetails(true);
            if (initialInstallments.length > 0) {
                setShowInstallments(true);
            }
        }
    }, [apartmentFormData]);

    const addPayment = (type: 'paid' | 'pending') => {
        if (type === 'paid') {
            const newPayment = {
                id: crypto.randomUUID(),
                amount: 0,
                due_date: new Date().toISOString().split('T')[0],
                status: 'paid',
                description: 'Ara Ödeme / Elden',
                currency: currency
            };
            setInstallments([...installments, newPayment]);
        } else {
            const pendingCount = installments.filter(ins => ins.status === 'pending').length;
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + pendingCount + 1);
            const newInstallment = {
                id: crypto.randomUUID(),
                amount: 0,
                due_date: nextMonth.toISOString().split('T')[0],
                status: 'pending',
                description: `${pendingCount + 1}. Taksit`,
                currency: currency
            };
            setInstallments([...installments, newInstallment]);
        }
        setShowInstallments(true);
    };

    const autoSplitRemaining = () => {
        const soldPriceNum = parseNumberFromDots(apartmentFormData.sold_price);
        const baseDownpaymentNum = parseNumberFromDots(baseDownpayment);
        const paidSum = installments
            .filter(ins => ins.status === 'paid')
            .reduce((sum, ins) => sum + (typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : (Number(ins.amount) || 0)), 0);
        const currentRemaining = Math.max(0, soldPriceNum - (baseDownpaymentNum + paidSum));

        if (currentRemaining <= 0) {
            alert('Kalan borç bulunmamaktadır.');
            return;
        }

        const countStr = prompt(`Kalan borç (${formatMoneyWithCurrency(currentRemaining, currency)}). Kaç eşit taksite bölünsün?`, '3');
        if (!countStr) return;
        const count = parseInt(countStr);
        if (isNaN(count) || count <= 0) {
            alert('Geçerli bir taksit sayısı giriniz.');
            return;
        }

        const installmentAmount = Math.floor(currentRemaining / count);
        const remainder = currentRemaining - (installmentAmount * count);
        const newRows: any[] = [];
        for (let i = 1; i <= count; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            newRows.push({
                id: crypto.randomUUID(),
                amount: i === count ? installmentAmount + remainder : installmentAmount,
                due_date: date.toISOString().split('T')[0],
                status: 'pending',
                description: `${i}. Taksit`,
                currency: currency
            });
        }

        const hasPending = installments.some(i => i.status === 'pending');
        if (hasPending) {
            if (confirm('Mevcut bekleyen taksitlerin üzerine mi eklensin? İptal derseniz sadece bekleyenler yenilenir.')) {
                setInstallments([...installments, ...newRows]);
            } else {
                setInstallments([...installments.filter(i => i.status === 'paid'), ...newRows]);
            }
        } else {
            setInstallments([...installments, ...newRows]);
        }
        setShowInstallments(true);
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
                amount: typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : (Number(ins.amount) || 0),
                currency: ins.currency || currency || 'TRY'
            }));

            // Ödenen taksitlerin / ara ödemelerin toplamını hesapla
            const paidInstallmentsTotal = cleanInstallments
                .filter(ins => ins.status === 'paid')
                .reduce((sum, ins) => sum + (ins.amount || 0), 0);

            // Ana peşinat
            const currentBaseDownpayment = parseNumberFromDots(baseDownpayment);

            const cleanData = {
                ...apartmentFormData,
                currency: currency || 'TRY',
                price: parseNumberFromDots(apartmentFormData.price),
                sold_price: parseNumberFromDots(apartmentFormData.sold_price),
                // Toplam alınan ödeme = Ana Peşinat + Ödenen Taksitler / Ara Ödemeler
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
                currency: 'TRY',
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

    // Finansal Özet Hesaplamaları
    const soldPriceNum = parseNumberFromDots(apartmentFormData.sold_price);
    const baseDownpaymentNum = parseNumberFromDots(baseDownpayment);
    const paidInstallmentsSum = installments
        .filter((ins: any) => ins.status === 'paid')
        .reduce((sum: number, ins: any) => sum + (typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : (Number(ins.amount) || 0)), 0);
    const totalCollected = baseDownpaymentNum + paidInstallmentsSum;
    const remainingDebt = Math.max(0, soldPriceNum - totalCollected);
    const pendingInstallmentsSum = installments
        .filter((ins: any) => ins.status === 'pending')
        .reduce((sum: number, ins: any) => sum + (typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : (Number(ins.amount) || 0)), 0);

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
                width: 'min(100%, 640px)',
                maxHeight: '92vh',
                overflow: 'auto',
                padding: 'var(--spacing-lg)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                        {editingApartmentId
                            ? `Daire ${apartmentFormData.apartment_number || '—'} - Düzenle`
                            : 'Yeni Daire Ekle'}
                    </h2>
                    {/* Para Birimi Seçici */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                        {(['TRY', 'USD', 'EUR'] as const).map(curr => (
                            <button
                                key={curr}
                                type="button"
                                onClick={() => setCurrency(curr)}
                                style={{
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    border: 'none',
                                    background: currency === curr ? '#3b82f6' : 'transparent',
                                    color: currency === curr ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {curr === 'TRY' ? '₺ TL' : curr === 'USD' ? '$ USD' : '€ EUR'}
                            </button>
                        ))}
                    </div>
                </div>

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
                                    Daire Liste Fiyatı ({getCurrencySymbol(currency)})
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={showSalesDetails} 
                                            onChange={(e) => setShowSalesDetails(e.target.checked)}
                                            id="chkSalesDetails"
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label htmlFor="chkSalesDetails" style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                                            Satış & Tahsilat Detayları {showSalesDetails ? '' : '(Gizli)'}
                                        </label>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                                        Para Birimi: {getCurrencySymbol(currency)} {currency}
                                    </span>
                                </div>

                                {showSalesDetails && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: '4px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                                    Kaça Satıldı? ({getCurrencySymbol(currency)})
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formatNumberWithDots(apartmentFormData.sold_price)}
                                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, sold_price: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#1e40af' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                                    İlk Peşinat ({getCurrencySymbol(currency)})
                                                </label>
                                                <input
                                                    type="text"
                                                    value={baseDownpayment}
                                                    onChange={(e) => setBaseDownpayment(e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#10b981' }}
                                                />
                                            </div>
                                        </div>

                                        {/* 4 Renkli Finansal Özet Kartı */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginTop: '4px' }}>
                                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Toplam Satış</div>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                                                    {formatMoneyWithCurrency(soldPriceNum, currency)}
                                                </div>
                                            </div>
                                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Toplam Alınan</div>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                                                    {formatMoneyWithCurrency(totalCollected, currency)}
                                                </div>
                                            </div>
                                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Kalan Borç</div>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b', marginTop: '2px' }}>
                                                    {formatMoneyWithCurrency(remainingDebt, currency)}
                                                </div>
                                            </div>
                                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Bekleyen Taksit</div>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
                                                    {formatMoneyWithCurrency(pendingInstallmentsSum, currency)}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Taksit & Ara Ödeme Bölümü */}
                                <div style={{ 
                                    marginTop: 'var(--spacing-xs)', 
                                    padding: '10px', 
                                    background: '#fff', 
                                    borderRadius: '6px', 
                                    border: '1px solid #e2e8f0' 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={showInstallments} 
                                                onChange={(e) => setShowInstallments(e.target.checked)}
                                                id="chkInstallments"
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label htmlFor="chkInstallments" style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#334155', cursor: 'pointer' }}>
                                                ÖDEME & TAKSİT PLANI ({installments.length})
                                            </label>
                                        </div>
                                        
                                        {showInstallments && (
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => addPayment('paid')}
                                                    style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                    title="Müşterinin getirdiği 50 bin, 100 bin gibi ara ödemeleri ekler, anında kalan borçtan düşer"
                                                >
                                                    + Ara Ödeme (Alındı)
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => addPayment('pending')}
                                                    style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 700, background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                    title="İleri tarihli bekleyen taksit ekler"
                                                >
                                                    + Gelecek Taksit
                                                </button>
                                                {remainingDebt > 0 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={autoSplitRemaining}
                                                        style={{ padding: '3px 8px', fontSize: '10px', fontWeight: 700, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                        title="Kalan borcu eşit taksitlere böler"
                                                    >
                                                        ⚡ Eşit Taksitlendir
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {showInstallments && (
                                        <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
                                            {installments.length === 0 ? (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '4px', fontStyle: 'italic' }}>
                                                    Henüz taksit veya ara ödeme kaydı yok. Müşteri ödeme getirdiğinde '+ Ara Ödeme' veya '+ Gelecek Taksit' butonlarına basınız.
                                                </div>
                                            ) : (
                                                installments.map((ins) => {
                                                    const isPaid = ins.status === 'paid';
                                                    const rowCurrency = ins.currency || currency;
                                                    return (
                                                        <div key={ins.id} style={{ 
                                                            display: 'flex', 
                                                            gap: '4px', 
                                                            alignItems: 'center', 
                                                            padding: '5px 6px', 
                                                            background: isPaid ? '#f0fdf4' : '#fffbeb', 
                                                            borderRadius: '4px', 
                                                            border: `1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}` 
                                                        }}>
                                                            {/* Açıklama */}
                                                            <input 
                                                                type="text"
                                                                placeholder="Açıklama"
                                                                value={ins.description || ''}
                                                                onChange={(e) => updateInstallment(ins.id, 'description', e.target.value)}
                                                                style={{ flex: 1.2, minWidth: '70px', padding: '4px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                            />
                                                            {/* Tutar */}
                                                            <input 
                                                                type="text"
                                                                placeholder="Tutar"
                                                                value={formatNumberWithDots(ins.amount)}
                                                                onChange={(e) => updateInstallment(ins.id, 'amount', e.target.value)}
                                                                style={{ 
                                                                    width: '80px', 
                                                                    padding: '4px 6px', 
                                                                    fontSize: '10px', 
                                                                    fontWeight: 'bold', 
                                                                    borderRadius: '4px', 
                                                                    border: '1px solid #cbd5e1', 
                                                                    textAlign: 'right',
                                                                    color: isPaid ? '#15803d' : '#92400e' 
                                                                }}
                                                            />
                                                            {/* Para Birimi */}
                                                            <select
                                                                value={rowCurrency}
                                                                onChange={(e) => updateInstallment(ins.id, 'currency', e.target.value)}
                                                                style={{ padding: '3px 2px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
                                                            >
                                                                <option value="TRY">₺ TL</option>
                                                                <option value="USD">$ USD</option>
                                                                <option value="EUR">€ EUR</option>
                                                            </select>
                                                            {/* Vade / Ödeme Tarihi */}
                                                            <input 
                                                                type="date"
                                                                value={ins.due_date || ''}
                                                                onChange={(e) => updateInstallment(ins.id, 'due_date', e.target.value)}
                                                                style={{ width: '105px', padding: '4px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                            />
                                                            {/* Durum Toggle Butonu */}
                                                            <button
                                                                type="button"
                                                                onClick={() => updateInstallment(ins.id, 'status', isPaid ? 'pending' : 'paid')}
                                                                style={{
                                                                    padding: '3px 6px',
                                                                    fontSize: '9px',
                                                                    fontWeight: 800,
                                                                    borderRadius: '4px',
                                                                    border: 'none',
                                                                    background: isPaid ? '#10b981' : '#f59e0b',
                                                                    color: '#fff',
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                title={isPaid ? 'Bekliyor durumuna çevir' : 'Ödendi olarak işaretle'}
                                                            >
                                                                {isPaid ? '✓ ÖDENDİ' : '⏳ BEKLİYOR'}
                                                            </button>
                                                            {/* Sil */}
                                                            <button 
                                                                type="button"
                                                                onClick={() => removeInstallment(ins.id)}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '12px', fontWeight: 700 }}
                                                                title="Sil"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            
                                            {installments.length > 0 && (
                                                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                    <div>
                                                        <span style={{ color: '#15803d', fontWeight: 700 }}>
                                                            Alınan Ara Ödemeler: {formatMoneyWithCurrency(paidInstallmentsSum, currency)}
                                                        </span>
                                                        <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
                                                        <span style={{ color: '#b45309', fontWeight: 700 }}>
                                                            Bekleyen Taksitler: {formatMoneyWithCurrency(pendingInstallmentsSum, currency)}
                                                        </span>
                                                    </div>
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
