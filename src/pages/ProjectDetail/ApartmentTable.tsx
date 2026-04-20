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

    const tableStyle: React.CSSProperties = { 
        width: '100%', 
        borderCollapse: 'collapse', 
        tableLayout: 'fixed' 
    };

    if (loading) {
        return (
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <table style={tableStyle}>
                    <thead>
                        <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                            {['DAİRE NO', 'LİSTE FİYATI', 'SATIŞ FİYATI', 'ALINAN ÖDEME', 'KALAN ALACAK', 'TAKSİT PLANI', 'DURUM', 'MÜŞTERİ BİLGİSİ', 'İŞLEM'].map(h => (
                                <th key={h} style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: h === 'DAİRE NO' ? '80px' : (h === 'İŞLEM' || h === 'DURUM' ? '100px' : 'auto') }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map(i => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(j => (
                                    <td key={j} style={{ padding: 'var(--spacing-md)' }}>
                                        <div style={{ height: '20px', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
    return (
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <table style={tableStyle}>
                <thead>
                    <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '80px' }}>
                            DAİRE NO
                        </th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '12%' }}>LİSTE FİYATI</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '12%' }}>SATIŞ FİYATI</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '12%' }}>ALINAN ÖDEME</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '12%' }}>KALAN ALACAK</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '15%' }}>TAKSİT PLANI</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '100px' }}>DURUM</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)' }}>MÜŞTERİ BİLGİSİ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', width: '100px' }}>İŞLEM</th>
                    </tr>
                </thead>
                <tbody>
                    {apartments
                        .sort((a, b) => {
                            if (b.floor !== a.floor) return b.floor - a.floor;
                            const numA = parseInt(a.apartment_number);
                            const numB = parseInt(b.apartment_number);
                            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                            return a.apartment_number.localeCompare(b.apartment_number);
                        })
                        .map((apartment) => {
                            const soldPrice = apartment.sold_price || 0;
                            const paidAmount = apartment.paid_amount || 0;
                            const remaining = soldPrice - paidAmount;
                            
                            const pendingInstallments = apartment.installments?.filter(ins => ins.status === 'pending') || [];
                            const nextInstallment = pendingInstallments.length > 0 
                                ? pendingInstallments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
                                : null;
                            
                            const getStatusBadge = (status: string) => {
                                switch (status) {
                                    case 'sold': return { text: 'SATILDI', bg: '#dcfce7', color: '#15803d' };
                                    case 'owner': return { text: 'M.SAHİBİ', bg: '#fef3c7', color: '#92400e' };
                                    case 'common': return { text: 'ORTAK', bg: '#f1f5f9', color: '#475569' };
                                    default: return { text: 'BOŞ', bg: '#e0f2fe', color: '#0369a1' };
                                }
                            };
                            const badge = getStatusBadge(apartment.status);
                            const isVisible = visibleAptIds.has(apartment.id);

                            return (
                                <tr key={apartment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', fontWeight: 700 }}>
                                        {apartment.apartment_number}
                                    </td>
                                    
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {isVisible ? formatCurrency(apartment.price) : '***'}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {apartment.status === 'sold' ? (isVisible ? formatCurrency(soldPrice) : '***') : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {apartment.status === 'sold' ? (isVisible ? formatCurrency(paidAmount) : '***') : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {apartment.status === 'sold' ? (isVisible ? formatCurrency(remaining) : '***') : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {apartment.status === 'sold' && apartment.installments && apartment.installments.length > 0 ? (
                                            isVisible ? (
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>
                                                        {apartment.installments.filter(i => i.status === 'paid').length} / {apartment.installments.length} Ödendi
                                                    </div>
                                                    {nextInstallment && (
                                                        <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>
                                                            Sıradaki: {new Date(nextInstallment.due_date).toLocaleDateString('tr-TR')}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : '***'
                                        ) : '-'}
                                    </td>

                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '9px',
                                            fontWeight: 800,
                                            background: badge.bg,
                                            color: badge.color
                                        }}>
                                            {badge.text}
                                        </span>
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 600 }}>{apartment.customer_name || '-'}</div>
                                        {apartment.customer_phone && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{apartment.customer_phone}</div>}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => toggleFinancials(apartment.id)}
                                                style={{ padding: '4px 8px', fontSize: '12px', background: isVisible ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                title={isVisible ? "Finansal Bilgileri Gizle" : "Finansal Bilgileri Göster"}
                                            >
                                                {isVisible ? '👁️' : '👁️‍🗨️'}
                                            </button>
                                            <button
                                                onClick={() => onEdit(apartment)}
                                                style={{ padding: '4px 8px', fontSize: '12px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #e0f2fe', borderRadius: '4px', cursor: 'pointer' }}
                                                title="Düzenle"
                                            >
                                                ✏️
                                            </button>
                                            {apartment.status === 'sold' && (
                                                <button
                                                    onClick={() => onReset(apartment)}
                                                    disabled={sendingCode}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        background: '#fff7ed',
                                                        color: '#c2410c',
                                                        border: '1px solid #ffedd5',
                                                        borderRadius: '4px',
                                                        cursor: sendingCode ? 'wait' : 'pointer',
                                                        opacity: sendingCode ? 0.5 : 1
                                                    }}
                                                    title="Satışı İptal Et"
                                                >
                                                    {sendingCode ? '...' : '🔄'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                </tbody>
            </table>
        </div>
    );
};

export default ApartmentTable;
