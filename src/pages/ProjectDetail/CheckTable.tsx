import React from 'react';
import { Check } from '../../types';

interface CheckTableProps {
    checks: Check[];
    onEdit: (check: Check) => void;
    onDelete: (id: string, name: string) => void;
    formatCurrency: (value: number) => string;
    sendingCode?: boolean;
}

const CheckTable: React.FC<CheckTableProps> = ({ checks, onEdit, onDelete, formatCurrency, sendingCode }) => {
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
                    <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>VADE TARİHİ</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>ÇEKLER</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>ŞİRKET</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>KULLANILACAK YER</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>KDV DURUMU</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>ÇEKİ VEREN KİŞİ</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>DURUM</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>İŞLEMLER</th>
                    </tr>
                </thead>
                <tbody>
                    {checks.map((check) => (
                        <tr key={check.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{
                                padding: 'var(--spacing-xs)',
                                textAlign: 'center',
                                fontSize: 'var(--font-size-sm)',
                                color: (() => {
                                    const dueDate = new Date(check.due_date);
                                    const today = new Date('2026-01-22');
                                    const diffTime = dueDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return (diffDays <= 10 && check.status === 'pending') ? '#dc2626' : 'inherit';
                                })(),
                                background: (() => {
                                    const dueDate = new Date(check.due_date);
                                    const today = new Date('2026-01-22');
                                    const diffTime = dueDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return (diffDays <= 10 && check.status === 'pending') ? '#fee2e2' : 'transparent';
                                })()
                            }}>
                                {new Date(check.due_date).toLocaleDateString('tr-TR')}
                            </td>
                            <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
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
                                        disabled={sendingCode}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: sendingCode ? 'wait' : 'pointer',
                                            fontSize: '1.2rem',
                                            opacity: sendingCode ? 0.5 : 1
                                        }}
                                        title="Sil"
                                    >
                                        {sendingCode ? '...' : '🗑️'}
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
