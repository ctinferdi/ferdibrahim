import React, { useMemo } from 'react';
import { Project, Expense } from '../../../types';
import { formatNumberWithDots } from '../../../utils/formatters';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (e: React.FormEvent) => Promise<void>;
    project: Project;
    expenses?: Expense[];
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
    isOpen, onClose, onSave, project, expenses = [], editingExpenseId,
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

    // Suggestions from past expenses and common defaults
    const categorySuggestions = useMemo(() => {
        const set = new Set<string>();
        ['BETON', 'DEMİR', 'HAFRİYAT', 'İŞÇİLİK', 'ELEKTRİK', 'TESİSAT', 'BOYA', 'KAPLAMA', 'NOTER', 'ASANSÖR', 'NAKLİYE', 'BEKÇİ', 'MALZEME', 'HARÇ', 'YEMEK'].forEach(c => set.add(c));
        expenses?.forEach(e => {
            if (e.category && e.category.trim()) {
                set.add(e.category.trim().toLocaleUpperCase('tr-TR'));
            }
        });
        return Array.from(set);
    }, [expenses]);

    const recipientSuggestions = useMemo(() => {
        const set = new Set<string>();
        expenses?.forEach(e => {
            if (e.recipient && e.recipient.trim()) {
                set.add(e.recipient.trim().toLocaleUpperCase('tr-TR'));
            }
        });
        return Array.from(set);
    }, [expenses]);

    const paymentMethodSuggestions = useMemo(() => {
        const set = new Set<string>(['EFT', 'NAKİT', 'KART', 'ÇEK', 'ELDEN', 'HAVALE']);
        expenses?.forEach(e => {
            if (e.payment_method && e.payment_method.trim()) {
                set.add(e.payment_method.trim().toLocaleUpperCase('tr-TR'));
            }
        });
        return Array.from(set);
    }, [expenses]);

    const descriptionSuggestions = useMemo(() => {
        const set = new Set<string>();
        expenses?.forEach(e => {
            if (e.description && e.description.trim()) {
                set.add(e.description.trim().toLocaleUpperCase('tr-TR'));
            }
        });
        return Array.from(set).slice(0, 30);
    }, [expenses]);

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

    // Handle individual partner amount change (user types manually)
    const handlePartnerShareChange = (partnerId: string, rawVal: string) => {
        const cleaned = rawVal.replace(/\D/g, '');
        const updated = {
            ...partnerShares,
            [partnerId]: cleaned
        };
        setPartnerShares(updated);

        // Auto-sum all partners and set as total amount
        let sum = 0;
        project.partners?.forEach(p => {
            const val = p.id === partnerId ? cleaned : (updated[p.id] || '0');
            sum += Number(val.replace(/\D/g, '')) || 0;
        });
        setAmount(sum.toString());
    };

    // Clear all partner inputs
    const handleResetShares = () => {
        const newShares: Record<string, string> = {};
        project.partners?.forEach(p => {
            newShares[p.id] = '0';
        });
        setPartnerShares(newShares);
        setAmount('0');
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
                {/* Datalist Elements for Suggestions & Autocomplete */}
                <datalist id="expense_category_datalist">
                    {categorySuggestions.map((cat, i) => (
                        <option key={i} value={cat} />
                    ))}
                </datalist>

                <datalist id="expense_recipient_datalist">
                    {recipientSuggestions.map((rec, i) => (
                        <option key={i} value={rec} />
                    ))}
                </datalist>

                <datalist id="expense_payment_method_datalist">
                    {paymentMethodSuggestions.map((m, i) => (
                        <option key={i} value={m} />
                    ))}
                </datalist>

                <datalist id="expense_description_datalist">
                    {descriptionSuggestions.map((d, i) => (
                        <option key={i} value={d} />
                    ))}
                </datalist>

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
                    <form onSubmit={onSave} autoComplete="on">
                        {/* Ortak Dağıtımı Tetikleyici Butonu (Ödemeyi Yapan Ortakları Seçin) */}
                        {!editingExpenseId && hasMultiplePartners && (
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (paymentSplitMode === 'split') {
                                            setPaymentSplitMode('single');
                                        } else {
                                            setPaymentSplitMode('split');
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '9px 14px',
                                        fontSize: '12.5px',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                        border: paymentSplitMode === 'split' ? '1.5px solid #2563eb' : '1.5px dashed #93c5fd',
                                        cursor: 'pointer',
                                        background: paymentSplitMode === 'split' ? '#2563eb' : '#eff6ff',
                                        color: paymentSplitMode === 'split' ? '#ffffff' : '#1d4ed8',
                                        boxShadow: paymentSplitMode === 'split' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span>{paymentSplitMode === 'split' ? '✓' : '👥'}</span>
                                    <span>{paymentSplitMode === 'split' ? 'Ödemeyi Yapan Ortakları Seçin (Aktif)' : 'Ödemeyi Yapan Ortakları Seçin'}</span>
                                    {paymentSplitMode === 'split' && (
                                        <span style={{
                                            fontSize: '11px',
                                            opacity: 0.9,
                                            marginLeft: '6px',
                                            fontWeight: 500,
                                            textDecoration: 'underline'
                                        }}>
                                            (Tek Kişiye Dön)
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Date & Ödemeyi Yapan (When Single Payer) */}
                        <div style={{ display: 'grid', gridTemplateColumns: (paymentSplitMode === 'single' && project.partners && project.partners.length > 0) ? '1fr 1fr' : '1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>TARİH</label>
                                <input
                                    type="date"
                                    name="expense_date"
                                    id="expense_date"
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
                                    <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>ÖDEMEYİ YAPAN</label>
                                    <select
                                        className="form-input"
                                        name="expense_partner"
                                        id="expense_partner"
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
                                    id="expense_payment_method"
                                    name="expense_payment_method"
                                    autoComplete="on"
                                    list="expense_payment_method_datalist"
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
                                    id="expense_recipient"
                                    name="expense_recipient"
                                    autoComplete="on"
                                    list="expense_recipient_datalist"
                                    className="form-input"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    placeholder="Firma veya Kişi adı"
                                    style={{ padding: '0.6rem' }}
                                />
                            </div>
                        </div>

                        {/* İş Adı / Kategori */}
                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>İŞ ADI / KATEGORİ</label>
                            <input
                                type="text"
                                id="expense_category"
                                name="expense_category"
                                autoComplete="on"
                                list="expense_category_datalist"
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
                            <input
                                type="text"
                                id="expense_description"
                                name="expense_description"
                                autoComplete="on"
                                list="expense_description_datalist"
                                className="form-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Gider ile ilgili detaylı notlar..."
                                style={{ padding: '0.6rem' }}
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
                                        id="expense_amount"
                                        name="expense_amount"
                                        autoComplete="off"
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
                            /* MULTI-PARTNER DIRECT MANUAL INPUT SECTION */
                            <div style={{
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: '14px',
                                padding: '15px',
                                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                                marginBottom: 0
                            }}>


                                {/* List of Partners */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '230px', overflowY: 'auto', paddingRight: '2px' }}>
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

                                                {/* Right: Manual Input */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            value={formatNumberWithDots(pVal)}
                                                            onChange={(e) => handlePartnerShareChange(partner.id, e.target.value)}
                                                            placeholder="0"
                                                            style={{
                                                                width: '120px',
                                                                padding: '7px 28px 7px 10px',
                                                                fontSize: '13px',
                                                                fontWeight: 800,
                                                                textAlign: 'right',
                                                                borderRadius: '8px',
                                                                border: isPaying ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                                                                background: isPaying ? '#ffffff' : '#f8fafc',
                                                                color: isPaying ? '#0f172a' : '#64748b',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                        <span style={{
                                                            position: 'absolute',
                                                            right: '8px',
                                                            fontSize: '10.5px',
                                                            fontWeight: 700,
                                                            color: '#94a3b8',
                                                            pointerEvents: 'none'
                                                        }}>TL</span>
                                                    </div>

                                                    {numVal > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePartnerShareChange(partner.id, '0')}
                                                            style={{
                                                                padding: '6px 8px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                background: '#fef2f2',
                                                                border: '1px solid #fecaca',
                                                                borderRadius: '6px',
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
                                        );
                                    })}
                                </div>

                                {/* Summary & Total Card */}
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: partnerSum > 0 ? '#ecfdf5' : '#f8fafc',
                                    border: `1px solid ${partnerSum > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: partnerSum > 0 ? '#065f46' : '#64748b'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>💰</span>
                                        <span>
                                            <strong>TOPLAM GİDER:</strong> {formatNumberWithDots(partnerSum.toString())} TL
                                        </span>
                                    </div>
                                    <span>
                                        {contributingCount > 1
                                            ? `👥 ${contributingCount} Ortak Paylaştı`
                                            : contributingCount === 1
                                            ? `👤 ${contributingDetails}`
                                            : `⚠️ Henüz tutar girilmedi`}
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
