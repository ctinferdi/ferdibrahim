import React, { useMemo } from 'react';
import { Project } from '../../../types';
import { formatNumberWithDots } from '../../../utils/formatters';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (e: React.FormEvent) => Promise<void>;
    project: Project;
    editingExpenseId: string | null;
    expenseDate: string;
    setExpenseDate: (val: string) => void;
    selectedPartner: string;
    setSelectedPartner: (val: string) => void;
    paymentMethod: string;
    setPaymentMethod: (val: string) => void;
    recipient: string;
    setRecipient: (val: string) => void;
    category: string;
    setCategory: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    amount: string;
    setAmount: (val: string) => void;
    partnerShares: Record<string, string>;
    setPartnerShares: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    paymentSplitMode: 'single' | 'split';
    setPaymentSplitMode: (mode: 'single' | 'split') => void;
    saving: boolean;
    errorMsg: string | null;
}

const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #2563eb, #1d4ed8)', // Blue
    'linear-gradient(135deg, #059669, #047857)', // Green
    'linear-gradient(135deg, #7c3aed, #5b21b6)', // Purple
    'linear-gradient(135deg, #d97706, #b45309)', // Amber
    'linear-gradient(135deg, #e11d48, #be123c)', // Rose
    'linear-gradient(135deg, #0891b2, #0e7490)', // Cyan
];

const getAvatarColor = (index: number) => {
    return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
};

const ExpenseModal: React.FC<ExpenseModalProps> = ({
    isOpen, onClose, onSave, project, editingExpenseId,
    expenseDate, setExpenseDate,
    selectedPartner, setSelectedPartner,
    paymentMethod, setPaymentMethod,
    recipient, setRecipient,
    category, setCategory,
    description, setDescription,
    amount, setAmount,
    partnerShares, setPartnerShares,
    paymentSplitMode, setPaymentSplitMode,
    saving, errorMsg
}) => {
    if (!isOpen) return null;

    const hasMultiplePartners = Boolean(project.partners && project.partners.length > 1);

    // Numeric total amount from top input
    const totalNum = useMemo(() => {
        return Number(amount.replace(/\D/g, '')) || 0;
    }, [amount]);

    // Sum of partner shares
    const partnerSum = useMemo(() => {
        if (!project.partners) return 0;
        return project.partners.reduce((sum, p) => {
            const raw = partnerShares[p.id] || '0';
            return sum + (Number(raw.replace(/\D/g, '')) || 0);
        }, 0);
    }, [partnerShares, project.partners]);

    // Count of partners with amount > 0
    const contributingCount = useMemo(() => {
        if (!project.partners) return 0;
        return project.partners.filter(p => {
            const raw = partnerShares[p.id] || '0';
            return (Number(raw.replace(/\D/g, '')) || 0) > 0;
        }).length;
    }, [partnerShares, project.partners]);

    // Contributing partners summary text
    const contributingDetails = useMemo(() => {
        if (!project.partners) return '';
        const paying = project.partners
            .map(p => ({
                name: p.name,
                amt: Number((partnerShares[p.id] || '0').replace(/\D/g, '')) || 0
            }))
            .filter(p => p.amt > 0);

        if (paying.length === 1) {
            return `${paying[0].name} (${formatNumberWithDots(paying[0].amt.toString())} TL)`;
        }
        return `${paying.length} Ortak`;
    }, [partnerShares, project.partners]);

    const isBalanced = totalNum > 0 && partnerSum === totalNum;
    const isOver = totalNum > 0 && partnerSum > totalNum;
    const remainingToDistribute = Math.max(0, totalNum - partnerSum);

    // Handle split equally among all partners
    const handleSplitEqually = () => {
        if (!project.partners || project.partners.length === 0) return;
        const target = totalNum || partnerSum || 0;
        if (target <= 0) return;

        const count = project.partners.length;
        const perPartner = Math.floor(target / count);
        const remainder = target - (perPartner * count);

        const newShares: Record<string, string> = {};
        project.partners.forEach((p, idx) => {
            const val = perPartner + (idx === 0 ? remainder : 0);
            newShares[p.id] = val > 0 ? val.toString() : '0';
        });
        setPartnerShares(newShares);
        setAmount(target.toString());
    };

    // Handle split by share percentage
    const handleSplitByPercentage = () => {
        if (!project.partners || project.partners.length === 0) return;
        const target = totalNum || partnerSum || 0;
        if (target <= 0) return;

        let allocated = 0;
        const newShares: Record<string, string> = {};
        project.partners.forEach((p, idx) => {
            if (idx === project.partners!.length - 1) {
                const remaining = Math.max(0, target - allocated);
                newShares[p.id] = remaining > 0 ? remaining.toString() : '0';
            } else {
                const val = Math.round((target * (p.share_percentage || 0)) / 100);
                allocated += val;
                newShares[p.id] = val > 0 ? val.toString() : '0';
            }
        });
        setPartnerShares(newShares);
        setAmount(target.toString());
    };

    // Handle clearing partner inputs
    const handleResetShares = () => {
        const newShares: Record<string, string> = {};
        project.partners?.forEach(p => {
            newShares[p.id] = '0';
        });
        setPartnerShares(newShares);
        setAmount('0');
    };

    // Handle individual partner amount change
    const handlePartnerShareChange = (partnerId: string, rawVal: string) => {
        const cleaned = rawVal.replace(/\D/g, '');
        const updated = {
            ...partnerShares,
            [partnerId]: cleaned
        };
        setPartnerShares(updated);

        // Recalculate total amount from all partners
        let sum = 0;
        project.partners?.forEach(p => {
            const val = p.id === partnerId ? cleaned : (updated[p.id] || '0');
            sum += Number(val.replace(/\D/g, '')) || 0;
        });
        setAmount(sum.toString());
    };

    // Give 100% of the total to one partner
    const handleGiveAllToPartner = (partnerId: string) => {
        const target = totalNum || partnerSum || 0;
        const newShares: Record<string, string> = {};
        project.partners?.forEach(p => {
            newShares[p.id] = p.id === partnerId ? (target > 0 ? target.toString() : '0') : '0';
        });
        setPartnerShares(newShares);
        if (target > 0) setAmount(target.toString());
    };

    // Give specific percentage share of total to one partner
    const handleGiveSharePercentageToPartner = (partnerId: string, pct: number) => {
        const target = totalNum || partnerSum || 0;
        if (target <= 0) return;
        const val = Math.round((target * pct) / 100);
        handlePartnerShareChange(partnerId, val.toString());
    };

    // Top total amount change in split mode
    const handleTopAmountChange = (rawVal: string) => {
        const cleaned = rawVal.replace(/\D/g, '');
        setAmount(cleaned);
        const newTotal = Number(cleaned) || 0;

        // If currently all partner shares are 0, distribute equally automatically
        const allZero = !project.partners || project.partners.every(p => (Number((partnerShares[p.id] || '0').replace(/\D/g, '')) || 0) === 0);
        if (allZero && newTotal > 0 && project.partners && project.partners.length > 0) {
            const count = project.partners.length;
            const perPartner = Math.floor(newTotal / count);
            const remainder = newTotal - (perPartner * count);

            const newShares: Record<string, string> = {};
            project.partners.forEach((p, idx) => {
                const val = perPartner + (idx === 0 ? remainder : 0);
                newShares[p.id] = val > 0 ? val.toString() : '0';
            });
            setPartnerShares(newShares);
        }
    };

    // Distribute remaining amount evenly among partners with 0 or all
    const handleDistributeRemaining = () => {
        if (!project.partners || remainingToDistribute <= 0) return;
        const zeroPartners = project.partners.filter(p => (Number((partnerShares[p.id] || '0').replace(/\D/g, '')) || 0) === 0);
        const targets = zeroPartners.length > 0 ? zeroPartners : project.partners;
        const perPartner = Math.floor(remainingToDistribute / targets.length);
        const remainder = remainingToDistribute - (perPartner * targets.length);

        const newShares = { ...partnerShares };
        targets.forEach((p, idx) => {
            const current = Number((newShares[p.id] || '0').replace(/\D/g, '')) || 0;
            const add = perPartner + (idx === 0 ? remainder : 0);
            newShares[p.id] = (current + add).toString();
        });
        setPartnerShares(newShares);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 'var(--spacing-md)'
        }}>
            <div className="card" style={{
                width: 'min(100%, 560px)',
                maxHeight: '92vh',
                background: 'white',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                padding: 0,
                overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-lg)', margin: 0, color: '#0f172a', fontWeight: 800 }}>
                            {editingExpenseId ? '📝 Gideri Düzenle' : '💳 Yeni Gider Ekle'}
                        </h1>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                            {project.name} {hasMultiplePartners ? `(${project.partners?.length} Ortaklı Proje)` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-light)' }}>×</button>
                </div>

                {/* Form Body */}
                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>
                    <form onSubmit={onSave}>
                        {/* Split Mode Selector (Only when creating a new expense and project has multiple partners) */}
                        {!editingExpenseId && hasMultiplePartners && (
                            <div style={{
                                marginBottom: 'var(--spacing-md)',
                                background: '#f1f5f9',
                                padding: '4px',
                                borderRadius: '12px',
                                display: 'flex',
                                gap: '4px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setPaymentSplitMode('single')}
                                    style={{
                                        flex: 1,
                                        padding: '9px 12px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '9px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: paymentSplitMode === 'single' ? '#ffffff' : 'transparent',
                                        color: paymentSplitMode === 'single' ? '#1e293b' : '#64748b',
                                        boxShadow: paymentSplitMode === 'single' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    👤 Tek Kişi Ödedi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentSplitMode('split');
                                        // Initialize shares if empty and amount exists
                                        if (Object.keys(partnerShares).length === 0 && amount) {
                                            handleSplitEqually();
                                        }
                                    }}
                                    style={{
                                        flex: 1.2,
                                        padding: '9px 12px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '9px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: paymentSplitMode === 'split' ? '#2563eb' : 'transparent',
                                        color: paymentSplitMode === 'split' ? '#ffffff' : '#64748b',
                                        boxShadow: paymentSplitMode === 'split' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    👥 Ortaklar Arası Paylaştır
                                </button>
                            </div>
                        )}

                        {/* Date & Kimin Adına (When Single Payer) */}
                        <div style={{ display: 'grid', gridTemplateColumns: (paymentSplitMode === 'single' && project.partners && project.partners.length > 0) ? '1fr 1fr' : '1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>TARİH</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    style={{ padding: '0.6rem' }}
                                    required
                                />
                            </div>

                            {/* Dropdown only visible in single payer mode */}
                            {paymentSplitMode === 'single' && project.partners && project.partners.length > 0 && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>KİMİN ADINA (ÖDEYEN)</label>
                                    <select
                                        className="form-input"
                                        value={selectedPartner}
                                        onChange={(e) => setSelectedPartner(e.target.value)}
                                        style={{ padding: '0.6rem' }}
                                        required
                                    >
                                        {project.partners.map((partner) => (
                                            <option key={partner.id} value={partner.id}>
                                                {partner.name} (%{partner.share_percentage})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Ödeme Şekli & Verilen Kişi */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>ÖDEME ŞEKLİ</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    placeholder="EFT, Nakit, vb."
                                    style={{ padding: '0.6rem' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>VERİLEN KİŞİ / FİRMA</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    placeholder="Firma veya Kişi adı"
                                    style={{ padding: '0.6rem' }}
                                />
                            </div>
                        </div>

                        {/* İş Adı */}
                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>İŞ ADI / KATEGORİ</label>
                            <input
                                type="text"
                                className="form-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Beton, Demir, Hafriyat, İşçilik, vb."
                                style={{ padding: '0.6rem' }}
                                required
                            />
                        </div>

                        {/* Açıklama */}
                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>AÇIKLAMA (OPSİYONEL)</label>
                            <textarea
                                className="form-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Gider ile ilgili detaylı notlar..."
                                rows={2}
                                style={{ resize: 'none', padding: '0.6rem' }}
                            />
                        </div>

                        {/* ─────────────────────────────────────────────────────────────────── */}
                        {/* TUTAR VE ORTAKLAR DAĞILIM BÖLÜMÜ */}
                        {/* ─────────────────────────────────────────────────────────────────── */}
                        {paymentSplitMode === 'single' ? (
                            /* SINGLE PAYER AMOUNT */
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>TUTAR (TL)</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: '14px', fontSize: '1.2rem', fontWeight: 800, color: '#64748b' }}>₺</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formatNumberWithDots(amount)}
                                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0"
                                        style={{ padding: '0.75rem 1rem 0.75rem 36px', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            /* MULTI-PARTNER SPLIT AMOUNT SECTION */
                            <div style={{
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '14px',
                                padding: '15px',
                                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                                marginBottom: 0
                            }}>
                                {/* Section Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '10px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            background: '#eff6ff',
                                            color: '#2563eb',
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '7px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '13px',
                                            fontWeight: 700
                                        }}>
                                            💰
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', letterSpacing: '0.2px' }}>
                                            TOPLAM GİDER TUTARI (TL)
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                        {project.partners?.length} Ortaklı
                                    </span>
                                </div>

                                {/* Toplam Tutar Input Box */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '14px',
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: '#2563eb'
                                    }}>₺</span>
                                    <input
                                        type="text"
                                        value={formatNumberWithDots(amount)}
                                        onChange={(e) => handleTopAmountChange(e.target.value)}
                                        placeholder="0"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px 10px 38px',
                                            fontSize: '1.35rem',
                                            fontWeight: 800,
                                            color: '#0f172a',
                                            background: '#ffffff',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '10px',
                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                                            outline: 'none',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                    />
                                </div>

                                {/* Quick Division Toolbar Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr auto',
                                    gap: '6px',
                                    marginBottom: '14px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={handleSplitEqually}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: '#eef2ff',
                                            color: '#4338ca',
                                            border: '1px solid #c7d2fe',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            transition: 'all 0.15s'
                                        }}
                                        title="Toplam tutarı tüm ortaklara kuruşu kuruşuna eşit böler"
                                    >
                                        <span>⚖️</span>
                                        <span>Eşit Böl</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSplitByPercentage}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: '#fffbeb',
                                            color: '#b45309',
                                            border: '1px solid #fde68a',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            transition: 'all 0.15s'
                                        }}
                                        title="Toplam tutarı ortakların hisse yüzdelerine göre böler"
                                    >
                                        <span>📊</span>
                                        <span>Hisseye Göre</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleResetShares}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: '#fef2f2',
                                            color: '#b91c1c',
                                            border: '1px solid #fecaca',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                        title="Tüm tutarları sıfırlar"
                                    >
                                        <span>🧹</span>
                                        <span>Sıfırla</span>
                                    </button>
                                </div>

                                {/* Partner Inputs Header */}
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>👥 ORTAKLARIN VERDİĞİ TUTARLAR:</span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                                        Kendi tutarını yazabilir veya [Tümü] seçebilirsiniz
                                    </span>
                                </div>

                                {/* List of Partners */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '210px', overflowY: 'auto', paddingRight: '2px' }}>
                                    {project.partners?.map((partner, index) => {
                                        const pVal = partnerShares[partner.id] || '';
                                        const numVal = Number(pVal.replace(/\D/g, '')) || 0;
                                        const isPaying = numVal > 0;
                                        const initials = getInitials(partner.name);
                                        const avatarGradient = getAvatarColor(index);

                                        return (
                                            <div
                                                key={partner.id}
                                                style={{
                                                    background: isPaying ? '#ffffff' : '#f8fafc',
                                                    border: isPaying ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                    borderRadius: '10px',
                                                    padding: '9px 12px',
                                                    boxShadow: isPaying ? '0 2px 6px rgba(59, 130, 246, 0.12)' : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '10px',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {/* Left: Avatar & Info */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                    <div style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '50%',
                                                        background: avatarGradient,
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        flexShrink: 0,
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {initials}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '12.5px',
                                                            fontWeight: 700,
                                                            color: '#0f172a',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {partner.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                background: '#f1f5f9',
                                                                color: '#475569',
                                                                padding: '1px 5px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                Hisse: %{partner.share_percentage}
                                                            </span>
                                                            {isPaying ? (
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: 700,
                                                                    color: '#059669',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px'
                                                                }}>
                                                                    ✓ Ödüyor
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                                    Ödemedi (0 TL)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Input & Actions */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            value={formatNumberWithDots(pVal)}
                                                            onChange={(e) => handlePartnerShareChange(partner.id, e.target.value)}
                                                            placeholder="0"
                                                            style={{
                                                                width: '110px',
                                                                padding: '6px 26px 6px 8px',
                                                                fontSize: '12.5px',
                                                                fontWeight: 700,
                                                                textAlign: 'right',
                                                                borderRadius: '7px',
                                                                border: isPaying ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                                background: isPaying ? '#ffffff' : '#f8fafc',
                                                                color: isPaying ? '#0f172a' : '#64748b',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                        <span style={{
                                                            position: 'absolute',
                                                            right: '7px',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#94a3b8',
                                                            pointerEvents: 'none'
                                                        }}>TL</span>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '3px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGiveAllToPartner(partner.id)}
                                                            style={{
                                                                padding: '5px 8px',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                background: '#f1f5f9',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '5px',
                                                                cursor: 'pointer',
                                                                color: '#334155',
                                                                transition: 'all 0.1s'
                                                            }}
                                                            title="Toplam tutarın tamamını tek başına bu ortağa yazar"
                                                        >
                                                            Tümü
                                                        </button>
                                                        {numVal > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePartnerShareChange(partner.id, '0')}
                                                                style={{
                                                                    padding: '5px 7px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 700,
                                                                    background: '#fef2f2',
                                                                    border: '1px solid #fecaca',
                                                                    borderRadius: '5px',
                                                                    cursor: 'pointer',
                                                                    color: '#b91c1c'
                                                                }}
                                                                title="Bu ortağın tutarını sıfırla"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary & Live Status Verification Card */}
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    background: isBalanced ? '#ecfdf5' : isOver ? '#fef2f2' : '#fffbeb',
                                    border: `1px solid ${isBalanced ? '#a7f3d0' : isOver ? '#fecaca' : '#fde68a'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        color: isBalanced ? '#065f46' : isOver ? '#991b1b' : '#92400e'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{isBalanced ? '✅' : isOver ? '⚠️' : 'ℹ️'}</span>
                                            <span>
                                                <strong>Dağıtılan:</strong> {formatNumberWithDots(partnerSum.toString())} TL
                                                {totalNum > 0 && ` / ${formatNumberWithDots(totalNum.toString())} TL`}
                                            </span>
                                        </div>
                                        <span>
                                            {contributingCount > 1
                                                ? `👥 ${contributingCount} Ortak Paylaştı`
                                                : contributingCount === 1
                                                ? `👤 ${contributingDetails}`
                                                : `⚠️ Tutar girilmedi`}
                                        </span>
                                    </div>

                                    {/* Difference Message if Any */}
                                    {!isBalanced && totalNum > 0 && (
                                        <div style={{
                                            fontSize: '11px',
                                            color: isOver ? '#b91c1c' : '#b45309',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingTop: '4px',
                                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                                        }}>
                                            <span>
                                                {isOver
                                                    ? `Ortakların toplamı fatura tutarından ${formatNumberWithDots((partnerSum - totalNum).toString())} TL fazla!`
                                                    : `Dağıtılacak kalan: ${formatNumberWithDots(remainingToDistribute.toString())} TL`}
                                            </span>
                                            {!isOver && remainingToDistribute > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleDistributeRemaining}
                                                    style={{
                                                        padding: '2px 8px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        border: '1px solid #fde68a',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Kalanı Dağıt ⚡
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Explicit Reassurance Note for User Request */}
                                    <div style={{
                                        fontSize: '10.5px',
                                        color: isBalanced ? '#047857' : '#64748b',
                                        paddingTop: '4px',
                                        borderTop: '1px solid rgba(0,0,0,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}>
                                        <span>📌</span>
                                        <span>
                                            <strong>Gider Tablosu:</strong> Kaydedildiğinde her ortağın verdiği tutar, tablodaki <u>KİM İÇİN</u> sütununa ayrı birer satır olarak işlenir.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {errorMsg && (
                            <div style={{
                                padding: '10px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                border: '1px solid #fecaca',
                                marginTop: 'var(--spacing-md)'
                            }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        {/* Actions Footer */}
                        <div style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            gap: 'var(--spacing-md)',
                            margin: `var(--spacing-lg) calc(-1 * var(--spacing-lg)) calc(-1 * var(--spacing-lg)) calc(-1 * var(--spacing-lg))`,
                            background: '#f8fafc'
                        }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                                style={{ flex: 1, padding: '0.6rem' }}
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{
                                    flex: 2,
                                    padding: '0.6rem',
                                    fontWeight: 800,
                                    background: paymentSplitMode === 'split' && contributingCount > 1 ? 'linear-gradient(135deg, #2563eb, #4338ca)' : undefined
                                }}
                                disabled={saving}
                            >
                                {saving
                                    ? 'Kaydediliyor...'
                                    : editingExpenseId
                                    ? 'Güncelle'
                                    : paymentSplitMode === 'split' && contributingCount > 1
                                    ? `Ortak Gideri Kaydet (${contributingCount} Kayıt Oluşacak)`
                                    : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ExpenseModal;
