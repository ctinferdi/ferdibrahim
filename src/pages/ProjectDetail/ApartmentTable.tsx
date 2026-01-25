import React from 'react';
import { Apartment } from '../../types';

interface ApartmentTableProps {
    apartments: Apartment[];
    onEdit: (apt: Apartment) => void;
    onReset: (apt: Apartment) => void;
    formatCurrency: (value: number) => string;
    sendingCode?: boolean;
}

const ApartmentTable: React.FC<ApartmentTableProps> = ({ apartments, onEdit, onReset, formatCurrency, sendingCode }) => {
    return (
        <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '80px' }}>DAİRE NO</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '15%' }}>LİSTE FİYATI</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '15%' }}>SATIŞ FİYATI</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '15%' }}>ALINAN ÖDEME</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '15%' }}>KALAN ALACAK</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', whiteSpace: 'nowrap', width: '100px' }}>DURUM</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)' }}>MÜŞTERİ BİLGİSİ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', width: '100px' }}>İŞLEM</th>
                    </tr>
                </thead>
                <tbody>
                    {apartments
                        .filter(a => a.status === 'sold')
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
                            return (
                                <tr key={apartment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                        {apartment.apartment_number}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(apartment.price)}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(soldPrice)}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(paidAmount)}
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center', color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(remaining)}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            background: '#dcfce7',
                                            color: '#15803d'
                                        }}>
                                            SATILDI
                                        </span>
                                    </td>
                                    <td style={{ padding: '6px 10px', fontSize: '11px', textAlign: 'center' }}>
                                        <div>{apartment.customer_name || '-'}</div>
                                        {apartment.customer_phone && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{apartment.customer_phone}</div>}
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => onEdit(apartment)}
                                                style={{ padding: '4px 8px', fontSize: '12px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #e0f2fe', borderRadius: '4px', cursor: 'pointer' }}
                                                title="Düzenle"
                                            >
                                                ✏️
                                            </button>
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
                                                title="Satışı İptal Et (Daireyi Boşa Çıkar)"
                                            >
                                                {sendingCode ? '...' : '🔄'}
                                            </button>
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
