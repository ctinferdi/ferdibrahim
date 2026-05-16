import React from 'react';
import { Apartment } from '../../types';

interface ApartmentTableProps {
    apartments: Apartment[];
    onEdit: (apt: Apartment) => void;
    onReset: (apt: Apartment) => void;
    formatCurrency: (value: number) => string;
    sendingCode?: boolean;
    loading?: boolean;
}

const ApartmentTable: React.FC<ApartmentTableProps> = ({ apartments, onEdit, onReset, formatCurrency, sendingCode, loading }) => {
    const [visibleAptIds, setVisibleAptIds] = React.useState<Set<string>>(new Set());

    const toggleFinancials = (id: string) => {
        const next = new Set(visibleAptIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleAptIds(next);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sold':   return { text: 'SATILDI',  bg: '#dcfce7', color: '#15803d' };
            case 'owner':  return { text: 'M.SAHİBİ', bg: '#fef3c7', color: '#92400e' };
            case 'common': return { text: 'ORTAK',    bg: '#f1f5f9', color: '#475569' };
            default:       return { text: 'BOŞ',      bg: '#e0f2fe', color: '#0369a1' };
        }
    };

    const sorted = [...apartments].sort((a, b) => {
        if (b.floor !== a.floor) return b.floor - a.floor;
        const numA = parseInt(a.apartment_number);
        const numB = parseInt(b.apartment_number);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.apartment_number.localeCompare(b.apartment_number);
    });

    if (loading) {
        return (
            <div style={{ padding: '20px' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ height: '60px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
                ))}
            </div>
        );
    }

    return (
        <>
            {/* ─── DESKTOP TABLE ─── */}
            <style>{`
                @media (max-width: 768px) {
                    .apt-desktop-table { display: none !important; }
                    .apt-mobile-cards  { display: flex !important; }
                }
                @media (min-width: 769px) {
                    .apt-desktop-table { display: block !important; }
                    .apt-mobile-cards  { display: none !important; }
                }
            `}</style>

            <div className="apt-desktop-table" style={{ flex: 1, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                            <th style={thStyle('80px')}>DAİRE NO</th>
                            <th style={thStyle('12%')}>LİSTE FİYATI</th>
                            <th style={thStyle('12%')}>SATIŞ FİYATI</th>
                            <th style={thStyle('12%')}>ALINAN ÖDEME</th>
                            <th style={thStyle('12%')}>KALAN ALACAK</th>
                            <th style={thStyle('15%')}>TAKSİT PLANI</th>
                            <th style={thStyle('100px')}>DURUM</th>
                            <th style={thStyle()}>MÜŞTERİ BİLGİSİ</th>
                            <th style={thStyle('100px')}>İŞLEM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((apartment) => {
                            const soldPrice = apartment.sold_price || 0;
                            const paidAmount = apartment.paid_amount || 0;
                            const remaining = soldPrice - paidAmount;
                            const pendingInstallments = apartment.installments?.filter(ins => ins.status === 'pending') || [];
                            const nextInstallment = pendingInstallments.length > 0
                                ? pendingInstallments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
                                : null;
                            const badge = getStatusBadge(apartment.status);
                            const isVisible = visibleAptIds.has(apartment.id);

                            return (
                                <tr key={apartment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={tdCenter('700')}>{apartment.apartment_number}</td>
                                    <td style={tdCenter()}>{isVisible ? formatCurrency(apartment.price) : '* * *'}</td>
                                    <td style={{ ...tdCenter(), color: '#1e40af' }}>{apartment.status === 'sold' ? (isVisible ? formatCurrency(soldPrice) : '* * *') : '-'}</td>
                                    <td style={{ ...tdCenter(), color: '#10b981' }}>{apartment.status === 'sold' ? (isVisible ? formatCurrency(paidAmount) : '* * *') : '-'}</td>
                                    <td style={{ ...tdCenter(), color: '#ef4444' }}>{apartment.status === 'sold' ? (isVisible ? formatCurrency(remaining) : '* * *') : '-'}</td>
                                    <td style={{ ...tdCenter(), color: '#6366f1' }}>
                                        {apartment.status === 'sold' && apartment.installments && apartment.installments.length > 0 ? (
                                            isVisible ? (
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{apartment.installments.filter(i => i.status === 'paid').length} / {apartment.installments.length} Ödendi</div>
                                                    {nextInstallment && <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>Sıradaki: {new Date(nextInstallment.due_date).toLocaleDateString('tr-TR')}</div>}
                                                </div>
                                            ) : '* * *'
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: badge.bg, color: badge.color }}>{badge.text}</span>
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 600 }}>{apartment.customer_name || '-'}</div>
                                        {apartment.customer_phone && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{apartment.customer_phone}</div>}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <ActionButtons apt={apartment} isVisible={isVisible} toggleFinancials={toggleFinancials} onEdit={onEdit} onReset={onReset} sendingCode={sendingCode} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ─── MOBİL KARTLAR ─── */}
            <div className="apt-mobile-cards" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                {sorted.map((apartment) => {
                    const soldPrice = apartment.sold_price || 0;
                    const paidAmount = apartment.paid_amount || 0;
                    const remaining = soldPrice - paidAmount;
                    const pendingInstallments = apartment.installments?.filter(ins => ins.status === 'pending') || [];
                    const nextInstallment = pendingInstallments.length > 0
                        ? pendingInstallments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
                        : null;
                    const badge = getStatusBadge(apartment.status);
                    const isVisible = visibleAptIds.has(apartment.id);

                    return (
                        <div key={apartment.id} style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                            {/* Kart başlığı */}
                            <div style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                padding: '10px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>
                                    Daire {apartment.apartment_number}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 800, background: badge.bg, color: badge.color }}>{badge.text}</span>
                                    <ActionButtons apt={apartment} isVisible={isVisible} toggleFinancials={toggleFinancials} onEdit={onEdit} onReset={onReset} sendingCode={sendingCode} />
                                </div>
                            </div>

                            {/* Kart gövdesi */}
                            <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <MobileRow label="Liste Fiyatı" value={isVisible ? formatCurrency(apartment.price) : '* * *'} />
                                <MobileRow label="Müşteri" value={apartment.customer_name || '-'} />
                                {apartment.customer_phone && <MobileRow label="Telefon" value={apartment.customer_phone} />}
                                {apartment.status === 'sold' && (
                                    <>
                                        <MobileRow label="Satış Fiyatı"   value={isVisible ? formatCurrency(soldPrice)  : '* * *'} color="#1e40af" />
                                        <MobileRow label="Alınan Ödeme"   value={isVisible ? formatCurrency(paidAmount) : '* * *'} color="#10b981" />
                                        <MobileRow label="Kalan Alacak"   value={isVisible ? formatCurrency(remaining)  : '* * *'} color="#ef4444" />
                                        {apartment.installments && apartment.installments.length > 0 && (
                                            <MobileRow
                                                label="Taksit"
                                                value={isVisible
                                                    ? `${apartment.installments.filter(i => i.status === 'paid').length}/${apartment.installments.length} Ödendi${nextInstallment ? ' • ' + new Date(nextInstallment.due_date).toLocaleDateString('tr-TR') : ''}`
                                                    : '* * *'}
                                                color="#6366f1"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

// ─── Yardımcı bileşenler ───
const MobileRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '7px 10px' }}>
        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: color || '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
);

interface ActionButtonsProps {
    apt: Apartment;
    isVisible: boolean;
    toggleFinancials: (id: string) => void;
    onEdit: (apt: Apartment) => void;
    onReset: (apt: Apartment) => void;
    sendingCode?: boolean;
}
const ActionButtons: React.FC<ActionButtonsProps> = ({ apt, isVisible, toggleFinancials, onEdit, onReset, sendingCode }) => (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
        <button
            onClick={() => toggleFinancials(apt.id)}
            style={{ padding: '4px 8px', fontSize: '12px', background: isVisible ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
            title={isVisible ? 'Finansal Bilgileri Gizle' : 'Finansal Bilgileri Göster'}
        >
            {isVisible ? '👁️' : '👁️‍🗨️'}
        </button>
        <button
            onClick={() => onEdit(apt)}
            style={{ padding: '4px 8px', fontSize: '12px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #e0f2fe', borderRadius: '4px', cursor: 'pointer' }}
            title="Düzenle"
        >
            ✏️
        </button>
        {apt.status === 'sold' && (
            <button
                onClick={() => onReset(apt)}
                disabled={sendingCode}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', borderRadius: '4px', cursor: sendingCode ? 'wait' : 'pointer', opacity: sendingCode ? 0.5 : 1 }}
                title="Satışı İptal Et"
            >
                {sendingCode ? '...' : '🔄'}
            </button>
        )}
    </div>
);

// ─── Style yardımcıları ───
const thStyle = (width?: string): React.CSSProperties => ({
    padding: '8px 10px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-light)',
    whiteSpace: 'nowrap',
    ...(width ? { width } : {}),
});

const tdCenter = (fontWeight?: string): React.CSSProperties => ({
    padding: '6px 10px',
    fontSize: '11px',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text-light)',
    ...(fontWeight ? { fontWeight: fontWeight as React.CSSProperties['fontWeight'], color: 'var(--color-text)' } : {}),
});

export default ApartmentTable;
