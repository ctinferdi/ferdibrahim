import React, { useMemo, useState } from 'react';
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

// Clean floating suggestion input - appears right beneath input only when user types
interface SuggestionInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    suggestions: string[];
    required?: boolean;
    style?: React.CSSProperties;
}

const SuggestionInput: React.FC<SuggestionInputProps> = ({
    id, label, value, onChange, placeholder, suggestions, required, style
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const storageKey = `hidden_sugg_${id}`;

    // Load hidden / removed suggestions from localStorage
    const [hiddenList, setHiddenList] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const handleRemoveSuggestion = (e: React.MouseEvent, itemToRemove: string) => {
        e.preventDefault();
        e.stopPropagation();
        const upperToRemove = itemToRemove.trim().toLocaleUpperCase('tr-TR');
        const updated = [...hiddenList.filter(x => x.trim().toLocaleUpperCase('tr-TR') !== upperToRemove), itemToRemove];
        setHiddenList(updated);
        try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (err) {
            console.error('Failed to save hidden suggestion:', err);
        }
    };

    // Filter suggestions based on typed query (only if at least 1 character typed)
    const filtered = useMemo(() => {
        const query = value.trim().toLocaleUpperCase('tr-TR');
        if (!query) return [];
        const hiddenUpper = new Set(hiddenList.map(h => h.trim().toLocaleUpperCase('tr-TR')));
        return suggestions
            .filter(item => {
                const upper = item.trim().toLocaleUpperCase('tr-TR');
                if (hiddenUpper.has(upper)) return false;
                return upper.includes(query);
            })
            .slice(0, 8);
    }, [value, suggestions, hiddenList]);

    return (
        <div style={{ position: 'relative', ...style }}>
            <label className="form-label" style={{ marginBottom: 'var(--spacing-xs)', fontSize: '0.75rem', fontWeight: 700 }}>
                {label}
            </label>
            <input
                type="text"
                id={id}
                name={id}
                className="form-input"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (value.trim().length >= 1) setIsOpen(true);
                }}
                onBlur={() => {
                    setTimeout(() => setIsOpen(false), 200);
                }}
                placeholder={placeholder}
                style={{ padding: '0.6rem', width: '100%' }}
                required={required}
                autoComplete="off"
            />
            {isOpen && filtered.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 1100,
                    padding: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto'
                }}>
                    {filtered.map((item, idx) => (
                        <div
                            key={idx}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onChange(item);
                                setIsOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '7px 10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#1e293b',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{
                                flex: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                paddingRight: '8px'
                            }}>
                                {item}
                            </span>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={(e) => handleRemoveSuggestion(e, item)}
                                title={`"${item}" önerisini sil`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    padding: 0,
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#fee2e2';
                                    e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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

    // Suggestions from past expenses and common presets
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
        // Strip non-digits and strip leading zeros (e.g. "05" -> "5", "00" -> "0")
        const digitsOnly = rawVal.replace(/\D/g, '');
        const cleaned = digitsOnly.replace(/^0+(?=\d)/, '');
        const finalVal = cleaned === '0' ? '' : cleaned;

        const updated = {
            ...partnerShares,
            [partnerId]: finalVal
        };
        setPartnerShares(updated);

        // Auto-sum all partners and set as total amount
        let sum = 0;
        project.partners?.forEach(p => {
            const val = p.id === partnerId ? finalVal : (updated[p.id] || '');
            sum += Number(val.replace(/\D/g, '')) || 0;
        });
        setAmount(sum > 0 ? sum.toString() : '');
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
                    <form onSubmit={onSave} autoComplete="off">
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

                        {/* Ödeme Şekli & Verilen Kişi (Custom Dropdowns) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                            <SuggestionInput
                                id="expense_payment_method"
                                label="ÖDEME ŞEKLİ"
                                value={paymentMethod}
                                onChange={setPaymentMethod}
                                placeholder="EFT, Nakit, vb."
                                suggestions={paymentMethodSuggestions}
                            />
                            <SuggestionInput
                                id="expense_recipient"
                                label="VERİLEN KİŞİ / FİRMA"
                                value={recipient}
                                onChange={setRecipient}
                                placeholder="Firma veya Kişi adı"
                                suggestions={recipientSuggestions}
                            />
                        </div>

                        {/* İş Adı / Kategori */}
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <SuggestionInput
                                id="expense_category"
                                label="İŞ ADI / KATEGORİ"
                                value={category}
                                onChange={setCategory}
                                placeholder="Beton, Demir, Hafriyat, İşçilik, vb."
                                suggestions={categorySuggestions}
                                required
                            />
                        </div>

                        {/* Açıklama */}
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <SuggestionInput
                                id="expense_description"
                                label="AÇIKLAMA (OPSİYONEL)"
                                value={description}
                                onChange={setDescription}
                                placeholder="Gider ile ilgili detaylı notlar..."
                                suggestions={descriptionSuggestions}
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
                                        className="form-input"
                                        value={amount && amount !== '0' ? formatNumberWithDots(amount) : ''}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '');
                                            const cleaned = digits.replace(/^0+(?=\d)/, '');
                                            setAmount(cleaned === '0' ? '' : cleaned);
                                        }}
                                        onFocus={(e) => e.target.select()}
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
                                padding: '12px',
                                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                                marginBottom: 0
                            }}>
                                {/* List of Partners */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '2px' }}>
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
                                                    border: isPaying ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    padding: '12px 16px',
                                                    boxShadow: isPaying ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {/* Left: Avatar & Info */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '50%',
                                                        background: avatarGradient,
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '13px',
                                                        fontWeight: 800,
                                                        flexShrink: 0,
                                                        letterSpacing: '0.5px',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                                    }}>
                                                        {initials}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '14.5px',
                                                            fontWeight: 800,
                                                            color: '#0f172a',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {partner.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                background: '#f1f5f9',
                                                                color: '#475569',
                                                                padding: '2px 6px',
                                                                borderRadius: '5px'
                                                            }}>
                                                                Hisse: %{partner.share_percentage}
                                                            </span>
                                                            {isPaying ? (
                                                                <span style={{
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 800,
                                                                    color: '#059669',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px'
                                                                }}>
                                                                    ✓ Ödüyor
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                    Ödemedi (0 TL)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Extra Large Manual Input */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            value={numVal > 0 ? formatNumberWithDots(pVal) : ''}
                                                            onChange={(e) => handlePartnerShareChange(partner.id, e.target.value)}
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="0"
                                                            style={{
                                                                width: '180px',
                                                                height: '48px',
                                                                padding: '8px 46px 8px 14px',
                                                                fontSize: '22px',
                                                                fontWeight: 900,
                                                                letterSpacing: '-0.3px',
                                                                textAlign: 'right',
                                                                borderRadius: '10px',
                                                                border: isPaying ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                                                                background: isPaying ? '#ffffff' : '#f8fafc',
                                                                color: isPaying ? '#0f172a' : '#64748b',
                                                                boxShadow: isPaying ? '0 2px 8px rgba(37,99,235,0.1)' : 'none',
                                                                outline: 'none',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        />
                                                        <span style={{
                                                            position: 'absolute',
                                                            right: '14px',
                                                            fontSize: '13px',
                                                            fontWeight: 900,
                                                            color: isPaying ? '#2563eb' : '#94a3b8',
                                                            pointerEvents: 'none'
                                                        }}>TL</span>
                                                    </div>

                                                    {numVal > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePartnerShareChange(partner.id, '')}
                                                            style={{
                                                                width: '44px',
                                                                height: '48px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '16px',
                                                                fontWeight: 900,
                                                                background: '#fef2f2',
                                                                border: '1.5px solid #fecaca',
                                                                borderRadius: '10px',
                                                                cursor: 'pointer',
                                                                color: '#b91c1c',
                                                                transition: 'all 0.15s ease'
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
