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

    // Handle split equally among all partners
    const handleSplitEqually = () => {
        if (!project.partners || project.partners.length === 0) return;
        const totalNum = Number(amount.replace(/\D/g, '')) || partnerSum || 0;
        if (totalNum <= 0) return;

        const count = project.partners.length;
        const perPartner = Math.floor(totalNum / count);
        const remainder = totalNum - (perPartner * count);

        const newShares: Record<string, string> = {};
        project.partners.forEach((p, idx) => {
            const val = perPartner + (idx === 0 ? remainder : 0);
            newShares[p.id] = val > 0 ? val.toString() : '0';
        });
        setPartnerShares(newShares);
        setAmount(totalNum.toString());
    };

    // Handle split by share percentage
    const handleSplitByPercentage = () => {
        if (!project.partners || project.partners.length === 0) return;
        const totalNum = Number(amount.replace(/\D/g, '')) || partnerSum || 0;
        if (totalNum <= 0) return;

        let allocated = 0;
        const newShares: Record<string, string> = {};
        project.partners.forEach((p, idx) => {
            if (idx === project.partners!.length - 1) {
                const remaining = Math.max(0, totalNum - allocated);
                newShares[p.id] = remaining > 0 ? remaining.toString() : '0';
            } else {
                const val = Math.round((totalNum * (p.share_percentage || 0)) / 100);
                allocated += val;
                newShares[p.id] = val > 0 ? val.toString() : '0';
            }
        });
        setPartnerShares(newShares);
        setAmount(totalNum.toString());
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
        const totalNum = Number(amount.replace(/\D/g, '')) || partnerSum || 0;
        const newShares: Record<string, string> = {};
        project.partners?.forEach(p => {
            newShares[p.id] = p.id === partnerId ? (totalNum > 0 ? totalNum.toString() : '0') : '0';
        });
        setPartnerShares(newShares);
        if (totalNum > 0) setAmount(totalNum.toString());
    };

    // Top total amount change in split mode
    const handleTopAmountChangeInSplit = (rawVal: string) => {
        const cleaned = rawVal.replace(/\D/g, '');
        setAmount(cleaned);
        const totalNum = Number(cleaned) || 0;

        // If no partner amounts entered yet or only 1 partner has full amount, distribute or update
        if (project.partners && project.partners.length > 0) {
            const count = project.partners.length;
            const perPartner = Math.floor(totalNum / count);
            const remainder = totalNum - (perPartner * count);

            const newShares: Record<string, string> = {};
            project.partners.forEach((p, idx) => {
                const val = perPartner + (idx === 0 ? remainder : 0);
                newShares[p.id] = val > 0 ? val.toString() : '0';
            });
            setPartnerShares(newShares);
        }
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
                width: 'min(100%, 540px)',
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
                                borderRadius: '10px',
                                display: 'flex',
                                gap: '4px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setPaymentSplitMode('single')}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: paymentSplitMode === 'single' ? '#ffffff' : 'transparent',
                                        color: paymentSplitMode === 'single' ? '#1e293b' : '#64748b',
                                        boxShadow: paymentSplitMode === 'single' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    👤 Tek Kişi Ödedi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentSplitMode('split');
                                        // Initialize shares if empty
                                        if (Object.keys(partnerShares).length === 0 && amount) {
                                            handleSplitEqually();
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: paymentSplitMode === 'split' ? '#2563eb' : 'transparent',
                                        color: paymentSplitMode === 'split' ? '#ffffff' : '#64748b',
                                        boxShadow: paymentSplitMode === 'split' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    👥 Ortaklar Arası Paylaştır (Kim Ne Kadar Verdi?)
                                </button>
                            </div>
                        )}

                        {/* Date & Kim İçin (When Single Payer) */}
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
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formatNumberWithDots(amount)}
                                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                                    placeholder="0"
                                    style={{ padding: '0.8rem', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}
                                    required
                                />
                            </div>
                        ) : (
                            /* MULTI-PARTNER SPLIT AMOUNT SECTION */
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '12px',
                                padding: '14px',
                                marginBottom: 0
                            }}>
                                {/* Total and Quick Calculation Toolbar */}
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                                            TOPLAM GİDER TUTARI (TL)
                                        </label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={handleSplitEqually}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    background: '#e0e7ff',
                                                    color: '#4338ca',
                                                    border: '1px solid #c7d2fe',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Toplam tutarı ortaklar arasında eşit olarak paylaştırır"
                                            >
                                                ⚖️ Eşit Böl
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSplitByPercentage}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    background: '#fef3c7',
                                                    color: '#b45309',
                                                    border: '1px solid #fde68a',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Toplam tutarı ortakların hisse yüzdelerine göre paylaştırır"
                                            >
                                                📊 Hisseye Göre
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleResetShares}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    background: '#fee2e2',
                                                    color: '#b91c1c',
                                                    border: '1px solid #fecaca',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Tüm tutarları sıfırlar"
                                            >
                                                🧹 Sıfırla
                                            </button>
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formatNumberWithDots(amount)}
                                        onChange={(e) => handleTopAmountChangeInSplit(e.target.value)}
                                        placeholder="0"
                                        style={{ padding: '0.65rem', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', background: '#ffffff' }}
                                    />
                                </div>

                                {/* List of Partners and their inputs */}
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Ortakların Verdiği Tutarlar:
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                    {project.partners?.map((partner) => {
                                        const pVal = partnerShares[partner.id] || '';
                                        return (
                                            <div
                                                key={partner.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: '#ffffff',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    gap: '10px'
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {partner.name}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                        Hisse: %{partner.share_percentage}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input
                                                        type="text"
                                                        value={formatNumberWithDots(pVal)}
                                                        onChange={(e) => handlePartnerShareChange(partner.id, e.target.value)}
                                                        placeholder="0"
                                                        style={{
                                                            width: '110px',
                                                            padding: '6px 8px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            textAlign: 'right',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            background: '#f8fafc',
                                                            color: '#0f172a'
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>TL</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGiveAllToPartner(partner.id)}
                                                        style={{
                                                            padding: '4px 6px',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            background: '#f1f5f9',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            color: '#475569'
                                                        }}
                                                        title="Tüm toplam gideri tek başına bu ortağa yazar"
                                                    >
                                                        Tümü
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary Bar */}
                                <div style={{
                                    marginTop: '10px',
                                    padding: '8px 12px',
                                    background: '#ecfdf5',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: '#065f46'
                                }}>
                                    <span>
                                        <strong>Dağıtılan Toplam:</strong> {formatNumberWithDots(partnerSum.toString())} TL
                                    </span>
                                    <span>
                                        {contributingCount > 1
                                            ? `👥 ${contributingCount} ortak paylaştı`
                                            : contributingCount === 1
                                            ? `👤 1 ortak ödedi`
                                            : `⚠️ Tutar girilmedi`}
                                    </span>
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
                                    background: paymentSplitMode === 'split' && contributingCount > 1 ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : undefined
                                }}
                                disabled={saving}
                            >
                                {saving
                                    ? 'Kaydediliyor...'
                                    : editingExpenseId
                                    ? 'Güncelle'
                                    : paymentSplitMode === 'split' && contributingCount > 1
                                    ? `Ortak Gideri Kaydet (${contributingCount} Kayıt)`
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
