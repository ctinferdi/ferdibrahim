import React from 'react';
import { Check } from '../../types';

interface CheckTableProps {
    checks: Check[];
    onEdit: (check: Check) => void;
    onDelete: (id: string, name: string) => void;
    formatCurrency: (value: number) => string;
}

const CheckTable: React.FC<CheckTableProps> = ({ checks, onEdit, onDelete, formatCurrency }) => {
    if (checks.length === 0) {
        return (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                Bu projeye ait henüz çek kaydı bulunmuyor.
            </p>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>VADE TARİHİ</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>TUTAR</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>FİRMA</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>KULLANILACAK YER</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>KDV</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>ÇEKİ VEREN KİŞİ</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>DURUM</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>İŞLEMLER</th>
                    </tr>
                </thead>
                <tbody>
                    {checks.map((check) => (
                        <tr key={check.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                {new Date(check.due_date).toLocaleDateString('tr-TR')}
                            </td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                {formatCurrency(check.amount)}
                            </td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>{check.company}</td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>{check.category}</td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)' }}>{check.vat_status || ''}</td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)' }}>{check.issuer}</td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    background: check.status === 'paid' ? '#dcfce7' : '#fef9c3',
                                    color: check.status === 'paid' ? '#15803d' : '#854d0e',
                                    fontWeight: 700
                                }}>
                                    {check.status === 'paid' ? 'ÖDENDİ' : 'BEKLEMEDE'}
                                </span>
                            </td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => onEdit(check)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                        title="Düzenle"
                                    >
                                        📝
                                    </button>
                                    <button
                                        onClick={() => onDelete(check.id, check.company)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                        title="Sil"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CheckTable;
