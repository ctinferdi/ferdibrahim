import React, { useState, useEffect } from 'react';
import { apartmentService } from '../../../services/apartmentService';
import { formatNumberWithDots, parseNumberFromDots, formatMoneyWithCurrency, getCurrencySymbol } from '../../../utils/formatters';
import FileUploadSection from './FileUploadSection';
import { Installment } from '../../../types';

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
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [showPlans, setShowPlans] = useState(false);
    const [baseDownpayment, setBaseDownpayment] = useState<string>('0');

    // Parça Ödeme (Kısmi Tahsilat) Modalı State'i
    const [partialModal, setPartialModal] = useState<{
        isOpen: boolean;
        installment: Installment | null;
        collectedAmount: string;
        tlNote: string;
    }>({
        isOpen: false,
        installment: null,
        collectedAmount: '',
        tlNote: ''
    });

    useEffect(() => {
        const initialCurrency = apartmentFormData.currency || 'TRY';
        setCurrency(initialCurrency);

        const initialInstallments = (apartmentFormData.installments || []) as Installment[];
        setInstallments(initialInstallments);

        // İlk açılışta ana peşinatı hesapla: Toplam Alınan - Ödenmiş Taksitler
        const totalPaid = apartmentFormData.paid_amount || 0;
        const paidInstallmentsSum = initialInstallments
            .filter((ins: any) => ins.status === 'paid')
            .reduce((sum: number, ins: any) => sum + (Number(ins.amount) || 0), 0);
        
        setBaseDownpayment(formatNumberWithDots(Math.max(0, totalPaid - paidInstallmentsSum)));
    }, [apartmentFormData]);

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
    const pendingCount = installments.filter(ins => ins.status === 'pending').length;
    const paidCount = installments.filter(ins => ins.status === 'paid').length;

    // Peşin Satış: Tek tıkla tüm bedeli peşinata eşitle
    const handleSetFullCashPayment = () => {
        const fullPrice = apartmentFormData.sold_price || apartmentFormData.price || 0;
        setBaseDownpayment(formatNumberWithDots(fullPrice));
        if (installments.length > 0) {
            if (confirm('Mevcut taksit kayıtları silinsin mi? (Daire tamamen peşin ödendi olarak kaydedilecek)')) {
                setInstallments([]);
            }
        }
    };

    // Yeni Taksit veya Ara Ödeme Ekleme
    const addPayment = (type: 'paid' | 'pending') => {
        if (type === 'paid') {
            const newPayment: Installment = {
                id: crypto.randomUUID(),
                amount: 0,
                due_date: new Date().toISOString().split('T')[0],
                status: 'paid',
                description: 'Ara Ödeme / Elden',
                currency: currency,
                tl_note: ''
            };
            setInstallments([...installments, newPayment]);
        } else {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + pendingCount + 1);
            const newInstallment: Installment = {
                id: crypto.randomUUID(),
                amount: remainingDebt > 0 ? Math.round(remainingDebt / Math.max(1, 4 - pendingCount)) : 0,
                due_date: nextMonth.toISOString().split('T')[0],
                status: 'pending',
                description: `${pendingCount + 1}. Taksit`,
                currency: currency,
                tl_note: ''
            };
            setInstallments([...installments, newInstallment]);
        }
    };

    // Kalan Borcu Eşit Taksite Bölme
    const autoSplitRemaining = () => {
        if (remainingDebt <= 0) {
            alert('Kalan borç bulunmamaktadır.');
            return;
        }

        const countStr = prompt(`Kalan borç (${formatMoneyWithCurrency(remainingDebt, currency)}). Kaç eşit taksite bölünsün?`, '6');
        if (!countStr) return;
        const count = parseInt(countStr);
        if (isNaN(count) || count <= 0) {
            alert('Geçerli bir taksit sayısı giriniz.');
            return;
        }

        const installmentAmount = Math.floor(remainingDebt / count);
        const remainder = remainingDebt - (installmentAmount * count);
        const newRows: Installment[] = [];
        for (let i = 1; i <= count; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            newRows.push({
                id: crypto.randomUUID(),
                amount: i === count ? installmentAmount + remainder : installmentAmount,
                due_date: date.toISOString().split('T')[0],
                status: 'pending',
                description: `${i}. Taksit`,
                currency: currency,
                tl_note: ''
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
    };

    const updateInstallment = (id: string, field: string, value: any) => {
        setInstallments(installments.map(ins => 
            ins.id === id ? { ...ins, [field]: value } : ins
        ));
    };

    const removeInstallment = (id: string) => {
        setInstallments(installments.filter(ins => ins.id !== id));
    };

    // Taksiti Tamamen Tahsil Et (Tek Tık)
    const handleFullCollect = (ins: Installment) => {
        const amt = typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : (Number(ins.amount) || 0);
        const tlInput = currency !== 'TRY' ? prompt(`Tahsilat: ${formatMoneyWithCurrency(amt, ins.currency || currency)}.\nVarsa müşteriden alınan TL tutarı veya kur notu:`, ins.tl_note || '') : null;
        
        setInstallments(installments.map(item => {
            if (item.id === ins.id) {
                return {
                    ...item,
                    status: 'paid',
                    paid_at: new Date().toISOString().split('T')[0],
                    tl_note: tlInput !== null ? tlInput : item.tl_note
                };
            }
            return item;
        }));
    };

    // Parça Ödeme Modalını Aç
    const openPartialPaymentModal = (ins: Installment) => {
        setPartialModal({
            isOpen: true,
            installment: ins,
            collectedAmount: '',
            tlNote: ''
        });
    };

    // Parça Ödemeyi Uygula (Taksiti 2 parçaya böl: Ödenen kısım + Kalan bekleyen bakiye)
    const handleSavePartialPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!partialModal.installment) return;

        const ins = partialModal.installment;
        const fullAmt = typeof ins.amount === 'string' ? parseNumberFromDots(ins.amount) : (Number(ins.amount) || 0);
        const collected = parseNumberFromDots(partialModal.collectedAmount);

        if (collected <= 0) {
            alert('Lütfen geçerli bir tahsilat tutarı giriniz.');
            return;
        }

        if (collected >= fullAmt) {
            // Tamamı veya fazlası ödendiyse doğrudan ödendi yap
            setInstallments(installments.map(item => {
                if (item.id === ins.id) {
                    return {
                        ...item,
                        status: 'paid',
                        paid_at: new Date().toISOString().split('T')[0],
                        tl_note: partialModal.tlNote || item.tl_note
                    };
                }
                return item;
            }));
            setPartialModal({ isOpen: false, installment: null, collectedAmount: '', tlNote: '' });
            return;
        }

        const remaining = fullAmt - collected;

        // 1. Ödenen Kısım
        const paidEntry: Installment = {
            ...ins,
            id: crypto.randomUUID(),
            amount: collected,
            status: 'paid',
            paid_at: new Date().toISOString().split('T')[0],
            description: `${ins.description || 'Taksit'} (Kısmi Tahsilat)`,
            tl_note: partialModal.tlNote || ins.tl_note || ''
        };

        // 2. Kalan Bekleyen Kısım
        const remainingEntry: Installment = {
            ...ins,
            id: crypto.randomUUID(),
            amount: remaining,
            status: 'pending',
            description: `${ins.description || 'Taksit'} (Kalan Bakiye)`,
            tl_note: ''
        };

        const updated = installments.flatMap(item => item.id === ins.id ? [paidEntry, remainingEntry] : [item]);
        setInstallments(updated);
        setPartialModal({ isOpen: false, installment: null, collectedAmount: '', tlNote: '' });
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

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 'var(--spacing-md)'
        }}>
            <div className="card" style={{
                width: 'min(100%, 760px)',
                maxHeight: '94vh',
                overflow: 'auto',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                background: '#ffffff'
            }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1.5px solid #f1f5f9' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                            {editingApartmentId
                                ? `🏢 Daire ${apartmentFormData.apartment_number || '—'} Satış & Tahsilat Düzenle`
                                : '➕ Yeni Daire Ekle'}
                        </h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                            {apartmentFormData.building_name || project?.name || 'Proje Dairesi'}
                        </div>
                    </div>
                    {/* Para Birimi Seçici */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {(['TRY', 'USD', 'EUR', 'GOLD'] as const).map(curr => (
                            <button
                                key={curr}
                                type="button"
                                onClick={() => setCurrency(curr)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    border: 'none',
                                    background: currency === curr ? (curr === 'GOLD' ? '#d97706' : '#2563eb') : 'transparent',
                                    color: currency === curr ? '#fff' : '#64748b',
                                    boxShadow: currency === curr ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {curr === 'TRY' ? '₺ TL' : curr === 'USD' ? '$ USD' : curr === 'EUR' ? '€ EUR' : '🪙 Gr Altın'}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        
                        {/* ─── TEMEL BİLGİLER ─── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    Bina Adı
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={apartmentFormData.building_name}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, building_name: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    Daire No
                                </label>
                                <input
                                    type="text"
                                    required={apartmentFormData.status !== 'common'}
                                    value={apartmentFormData.apartment_number}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, apartment_number: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                                    placeholder={apartmentFormData.status === 'common' ? 'Opsiyonel' : 'Örn: 21'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
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
                                        padding: '9px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #cbd5e1',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        backgroundColor: editingApartmentId ? '#f8fafc' : 'white',
                                        cursor: editingApartmentId ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    Liste Fiyatı ({getCurrencySymbol(currency)})
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formatNumberWithDots(apartmentFormData.price)}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, price: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    Alanı (m²)
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={apartmentFormData.square_meters}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, square_meters: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
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
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 800, background: '#fff' }}
                                >
                                    <option value="available">🟢 Müsait (Satışta)</option>
                                    <option value="sold">🔵 Satıldı (Tahsilat / Taksit)</option>
                                    <option value="owner">👤 Mal Sahibi</option>
                                    <option value="common">🏛️ Ortak Alan</option>
                                </select>
                            </div>
                        </div>

                        {/* ─── SATILDI BÖLÜMÜ: SATIŞ & TAHSİLAT DETAYLARI ─── */}
                        {apartmentFormData.status === 'sold' && (
                            <div style={{
                                padding: '16px',
                                background: '#f8fafc',
                                borderRadius: '14px',
                                border: '1.5px solid #e2e8f0',
                                display: 'grid',
                                gap: '14px'
                            }}>
                                {/* Satış Başlığı ve Peşinat Aksiyonları */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>💰</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            SATIŞ BEDELİ & İLK PEŞİNAT
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={handleSetFullCashPayment}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                background: '#ecfdf5',
                                                color: '#059669',
                                                border: '1px solid #a7f3d0',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Satış bedelinin tamamı peşin alındı olarak ayarlar"
                                        >
                                            ⚡ Tamamı Peşin Alındı (Borçsuz)
                                        </button>
                                    </div>
                                </div>

                                {/* Kaça Satıldı ve İlk Peşinat Kutuları */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1.5px solid #bfdbfe' }}>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '11.5px', fontWeight: 800, color: '#1e40af' }}>
                                            KAÇA SATILDI? ({getCurrencySymbol(currency)})
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                value={formatNumberWithDots(apartmentFormData.sold_price)}
                                                onChange={(e) => setApartmentFormData({ ...apartmentFormData, sold_price: e.target.value })}
                                                placeholder="0"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 40px 8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1.5px solid #93c5fd',
                                                    fontSize: '18px',
                                                    fontWeight: 900,
                                                    color: '#1e3a8a',
                                                    outline: 'none'
                                                }}
                                            />
                                            <span style={{ position: 'absolute', right: '12px', fontSize: '13px', fontWeight: 900, color: '#1e40af' }}>
                                                {getCurrencySymbol(currency)}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1.5px solid #bbf7d0' }}>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '11.5px', fontWeight: 800, color: '#15803d' }}>
                                            İLK PEŞİNAT ({getCurrencySymbol(currency)})
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                value={baseDownpayment}
                                                onChange={(e) => setBaseDownpayment(e.target.value)}
                                                placeholder="0"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 40px 8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1.5px solid #86efac',
                                                    fontSize: '18px',
                                                    fontWeight: 900,
                                                    color: '#14532d',
                                                    outline: 'none'
                                                }}
                                            />
                                            <span style={{ position: 'absolute', right: '12px', fontSize: '13px', fontWeight: 900, color: '#15803d' }}>
                                                {getCurrencySymbol(currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4 Net Finansal Özet Rozeti */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Toplam Satış</div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#1e3a8a', marginTop: '3px' }}>
                                            {formatMoneyWithCurrency(soldPriceNum, currency)}
                                        </div>
                                    </div>
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Toplam Tahsilat</div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#14532d', marginTop: '3px' }}>
                                            {formatMoneyWithCurrency(totalCollected, currency)}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: remainingDebt > 0 ? '#fef2f2' : '#ecfdf5',
                                        border: `1.5px solid ${remainingDebt > 0 ? '#fecaca' : '#a7f3d0'}`,
                                        borderRadius: '8px',
                                        padding: '10px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: remainingDebt > 0 ? '#b91c1c' : '#059669', textTransform: 'uppercase' }}>
                                            {remainingDebt > 0 ? 'Kalan Borç' : 'Bakiye'}
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: remainingDebt > 0 ? '#991b1b' : '#047857', marginTop: '3px' }}>
                                            {remainingDebt > 0 ? formatMoneyWithCurrency(remainingDebt, currency) : '✓ Borcu Yok'}
                                        </div>
                                    </div>
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                                            Bekleyen Taksit
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#92400e', marginTop: '3px' }}>
                                            {formatMoneyWithCurrency(pendingInstallmentsSum, currency)}
                                            {pendingCount > 0 && <span style={{ fontSize: '11px', fontWeight: 700, marginLeft: '4px' }}>({pendingCount})</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* ─── TAKSİT VE ÖDEME LİSTESİ BÖLÜMÜ ─── */}
                                <div style={{
                                    background: '#ffffff',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1'
                                }}>
                                    {/* Başlık ve Aksiyon Butonları */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                                                📅 Ödeme & Taksit Takibi
                                            </span>
                                            {installments.length > 0 && (
                                                <span style={{ fontSize: '11px', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
                                                    {paidCount} Ödendi / {installments.length} Toplam
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => addPayment('paid')}
                                                style={{
                                                    padding: '5px 10px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    background: '#10b981',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                                                }}
                                                title="Müşterinin getirdiği peşin veya elden ara ödemeleri ekler, anında kalan borçtan düşer"
                                            >
                                                + Ara Ödeme (Alındı)
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => addPayment('pending')}
                                                style={{
                                                    padding: '5px 10px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    background: '#2563eb',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                                }}
                                                title="Gelecek tarihli bekleyen taksit ekler"
                                            >
                                                + Gelecek Taksit
                                            </button>
                                            {remainingDebt > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={autoSplitRemaining}
                                                    style={{
                                                        padding: '5px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        background: '#7c3aed',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        boxShadow: '0 2px 4px rgba(124,58,237,0.2)'
                                                    }}
                                                    title="Kalan borcu eşit aylık taksitlere böler"
                                                >
                                                    ⚡ Kalanı Eşit Böl
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Taksit Kayıtları Listesi */}
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {installments.length === 0 ? (
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#64748b',
                                                textAlign: 'center',
                                                padding: '24px 16px',
                                                background: '#f8fafc',
                                                borderRadius: '8px',
                                                border: '1px dashed #cbd5e1'
                                            }}>
                                                {remainingDebt > 0 ? (
                                                    <div>
                                                        Kalan borç <strong>{formatMoneyWithCurrency(remainingDebt, currency)}</strong> taksitlendirilmedi.
                                                        <br />
                                                        Otomatik bölmek için <strong>"⚡ Kalanı Eşit Böl"</strong> veya tek tek girmek için <strong>"+ Gelecek Taksit"</strong> butonunu kullanabilirsiniz.
                                                    </div>
                                                ) : (
                                                    <div>🎉 Tüm satış bedeli peşinatla karşılanmıştır, bekleyen taksit bulunmuyor.</div>
                                                )}
                                            </div>
                                        ) : (
                                            installments.map((ins, index) => {
                                                const isPaid = ins.status === 'paid';
                                                const rowCurrency = ins.currency || currency;
                                                return (
                                                    <div
                                                        key={ins.id}
                                                        style={{ 
                                                            display: 'grid',
                                                            gridTemplateColumns: '1.4fr 1.1fr 1fr auto',
                                                            gap: '8px', 
                                                            alignItems: 'center', 
                                                            padding: '8px 12px', 
                                                            background: isPaid ? '#f0fdf4' : '#fffbeb', 
                                                            borderRadius: '8px', 
                                                            border: `1.5px solid ${isPaid ? '#86efac' : '#fcd34d'}`,
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {/* 1. Sütun: Açıklama & Vade Tarihi */}
                                                        <div>
                                                            <input 
                                                                type="text"
                                                                placeholder="Açıklama (Örn: 1. Taksit)"
                                                                value={ins.description || ''}
                                                                onChange={(e) => updateInstallment(ins.id, 'description', e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '36px',
                                                                    boxSizing: 'border-box',
                                                                    padding: '6px 10px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #cbd5e1',
                                                                    marginBottom: '6px',
                                                                    color: '#0f172a'
                                                                }}
                                                            />
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}>
                                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, minWidth: '34px' }}>Vade:</span>
                                                                <input 
                                                                    type="date"
                                                                    value={ins.due_date || ''}
                                                                    onChange={(e) => updateInstallment(ins.id, 'due_date', e.target.value)}
                                                                    style={{
                                                                        flex: 1,
                                                                        height: '28px',
                                                                        boxSizing: 'border-box',
                                                                        padding: '2px 6px',
                                                                        fontSize: '11px',
                                                                        borderRadius: '5px',
                                                                        border: '1px solid #cbd5e1',
                                                                        fontWeight: 600,
                                                                        color: '#334155'
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* 2. Sütun: Tutar & Para Birimi */}
                                                        <div>
                                                            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                                                <input 
                                                                    type="text"
                                                                    placeholder="0"
                                                                    value={formatNumberWithDots(ins.amount)}
                                                                    onChange={(e) => updateInstallment(ins.id, 'amount', e.target.value)}
                                                                    style={{ 
                                                                        flex: 1,
                                                                        height: '36px',
                                                                        boxSizing: 'border-box',
                                                                        padding: '6px 10px', 
                                                                        fontSize: '14px', 
                                                                        fontWeight: 900, 
                                                                        borderRadius: '6px', 
                                                                        border: '1px solid #cbd5e1', 
                                                                        textAlign: 'right',
                                                                        color: isPaid ? '#15803d' : '#92400e' 
                                                                    }}
                                                                />
                                                                <select
                                                                    value={rowCurrency}
                                                                    onChange={(e) => updateInstallment(ins.id, 'currency', e.target.value)}
                                                                    style={{
                                                                        height: '36px',
                                                                        boxSizing: 'border-box',
                                                                        padding: '4px 8px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 800,
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #cbd5e1',
                                                                        background: '#fff',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    <option value="TRY">₺ TL</option>
                                                                    <option value="USD">$ USD</option>
                                                                    <option value="EUR">€ EUR</option>
                                                                    <option value="GOLD">🪙 gr</option>
                                                                </select>
                                                            </div>
                                                            {/* TL Notu / Kur Alanı */}
                                                            <input
                                                                type="text"
                                                                placeholder="Alınan TL Notu / Kur..."
                                                                value={ins.tl_note || ''}
                                                                onChange={(e) => updateInstallment(ins.id, 'tl_note', e.target.value)}
                                                                title="Örneğin: 70.000 TL nakit elden alındı"
                                                                style={{
                                                                    width: '100%',
                                                                    height: '28px',
                                                                    boxSizing: 'border-box',
                                                                    padding: '2px 8px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '5px',
                                                                    border: '1px dashed #cbd5e1',
                                                                    color: '#475569',
                                                                    background: '#ffffff'
                                                                }}
                                                            />
                                                        </div>

                                                        {/* 3. Sütun: Durum ve Hızlı Tahsilat Aksiyonları */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {isPaid ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (confirm('Bu ödemeyi tekrar bekleyen taksite çevirmek istiyor musunuz?')) {
                                                                            updateInstallment(ins.id, 'status', 'pending');
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        height: '70px',
                                                                        boxSizing: 'border-box',
                                                                        padding: '6px 8px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 800,
                                                                        borderRadius: '6px',
                                                                        border: 'none',
                                                                        background: '#10b981',
                                                                        color: '#fff',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '3px',
                                                                        boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                                                                    }}
                                                                    title="Ödendi olarak işaretli. Tıklayarak bekliyora çevirebilirsiniz."
                                                                >
                                                                    ✓ TAHSİL EDİLDİ
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleFullCollect(ins)}
                                                                        style={{
                                                                            height: '36px',
                                                                            boxSizing: 'border-box',
                                                                            padding: '4px 8px',
                                                                            fontSize: '11px',
                                                                            fontWeight: 800,
                                                                            borderRadius: '6px',
                                                                            border: 'none',
                                                                            background: '#059669',
                                                                            color: '#fff',
                                                                            cursor: 'pointer',
                                                                            whiteSpace: 'nowrap',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                        title="Bu taksitin tamamını tek tıkla tahsil et"
                                                                    >
                                                                        ✓ Tamamını Al
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openPartialPaymentModal(ins)}
                                                                        style={{
                                                                            height: '28px',
                                                                            boxSizing: 'border-box',
                                                                            padding: '2px 8px',
                                                                            fontSize: '10.5px',
                                                                            fontWeight: 800,
                                                                            borderRadius: '5px',
                                                                            border: '1px solid #3b82f6',
                                                                            background: '#eff6ff',
                                                                            color: '#1d4ed8',
                                                                            cursor: 'pointer',
                                                                            whiteSpace: 'nowrap',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                        title="Müşteri bu taksitin bir kısmını ödediyse tıkla (Örn: 10 binden 4 bin getirdi)"
                                                                    >
                                                                        💰 Parça Ödeme
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* 4. Sütun: Sil Butonu */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeInstallment(ins.id)}
                                                                style={{
                                                                    width: '34px',
                                                                    height: '34px',
                                                                    boxSizing: 'border-box',
                                                                    borderRadius: '6px',
                                                                    border: 'none',
                                                                    background: '#fee2e2',
                                                                    color: '#b91c1c',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '14px',
                                                                    fontWeight: 800,
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                title="Bu taksit satırını sil"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── DAİRE PLANLARI DOSYA YÜKLEME ─── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                                type="checkbox" 
                                checked={showPlans} 
                                onChange={(e) => setShowPlans(e.target.checked)}
                                id="chkPlans"
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="chkPlans" style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}>
                                Daire Planları & Belgeleri {showPlans ? '' : '(Göster)'}
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

                        {/* ─── MÜŞTERİ BİLGİLERİ ─── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    {apartmentFormData.status === 'owner' ? 'Mal Sahibi Adı' : 'Müşteri Adı Soyadı (Opsiyonel)'}
                                </label>
                                <input
                                    type="text"
                                    value={apartmentFormData.customer_name}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, customer_name: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                                    placeholder="Örn: Kadir Erhan"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    Müşteri Telefon Numarası
                                </label>
                                <input
                                    type="tel"
                                    value={apartmentFormData.customer_phone}
                                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, customer_phone: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                                    placeholder="Örn: 0532 000 00 00"
                                />
                            </div>
                        </div>

                        {/* Modal Alt Aksiyon Butonları */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1.5px solid #f1f5f9' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{
                                    flex: 2,
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 800,
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                                }}
                            >
                                {editingApartmentId ? '💾 Değişiklikleri Güncelle' : '➕ Daireyi Kaydet'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer'
                                }}
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ─── PARÇA ÖDEME (KISMİ TAHSİLAT) DİYALOĞU ─── */}
            {partialModal.isOpen && partialModal.installment && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '16px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        width: 'min(100%, 460px)',
                        padding: '24px',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        border: '1.5px solid #cbd5e1'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>💰</span>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                    Parça Ödeme (Kısmi Tahsilat)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPartialModal({ isOpen: false, installment: null, collectedAmount: '', tlNote: '' })}
                                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSavePartialPayment}>
                            {/* Bilgi Kartı */}
                            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>SEÇİLİ TAKSİT BİLGİSİ:</div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                                    {partialModal.installment.description || 'Taksit'} — {formatMoneyWithCurrency(partialModal.installment.amount, partialModal.installment.currency || currency)}
                                </div>
                            </div>

                            {/* Alınan Tutar */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                    Bu Sefer Alınan Tutar ({getCurrencySymbol(partialModal.installment.currency || currency)})
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Örn: 4.000"
                                    value={partialModal.collectedAmount}
                                    onChange={(e) => setPartialModal({ ...partialModal, collectedAmount: formatNumberWithDots(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        fontSize: '18px',
                                        fontWeight: 900,
                                        borderRadius: '8px',
                                        border: '2px solid #2563eb',
                                        color: '#0f172a',
                                        outline: 'none'
                                    }}
                                />
                                {parseNumberFromDots(partialModal.collectedAmount) > 0 && (
                                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                                        ✓ Kalan bakiye: {formatMoneyWithCurrency(Math.max(0, (typeof partialModal.installment.amount === 'string' ? parseNumberFromDots(partialModal.installment.amount) : Number(partialModal.installment.amount)) - parseNumberFromDots(partialModal.collectedAmount)), partialModal.installment.currency || currency)} olarak açık kalacak.
                                    </div>
                                )}
                            </div>

                            {/* Alınan TL Notu / Kur */}
                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                    Müşteriden Alınan TL Tutarı / Kur Notu (Opsiyonel)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Örn: 140.000 TL nakit alındı (Kur: 35.00)"
                                    value={partialModal.tlNote}
                                    onChange={(e) => setPartialModal({ ...partialModal, tlNote: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        fontSize: '12.5px',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        border: '1.5px solid #cbd5e1',
                                        color: '#334155'
                                    }}
                                />
                                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                                    Dövizli borçtan düşülecek tutarın karşılığında ne kadar TL aldığınızı takip etmek içindir.
                                </div>
                            </div>

                            {/* Aksiyon Butonları */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 2,
                                        padding: '10px',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        background: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    💾 Parça Ödemeyi Kaydet
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartialModal({ isOpen: false, installment: null, collectedAmount: '', tlNote: '' })}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Vazgeç
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApartmentModal;
