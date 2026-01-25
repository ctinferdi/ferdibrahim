import React from 'react';
import { Expense, Project } from '../../types';

interface ExpenseTableProps {
    expenses: Expense[];
    project: Project;
    onEdit: (expense: Expense) => void;
    onDelete: (id: string, name: string) => void;
    formatCurrency: (value: number) => string;
    sendingCode?: boolean;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, project, onEdit, onDelete, formatCurrency, sendingCode }) => {
    if (expenses.length === 0) {
        return (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                Henüz gider eklenmemiş. "+ Gider Ekle" butonuna tıklayarak başlayın.
            </p>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>TARİH</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>KİM İÇİN</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>ÖDEME ŞEKLİ</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>VERİLEN KİŞİ</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>İŞ ADI</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>AÇIKLAMA</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>TUTAR</th>
                        <th style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>İŞLEMLER</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map((expense) => {
                        const partner = project.partners?.find(p => p.id === expense.partner_id);
                        return (
                            <tr key={expense.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                    {new Date(expense.date).toLocaleDateString('tr-TR')}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                    {partner ? partner.name : '-'}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                    {expense.payment_method || '-'}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                    {expense.recipient || '-'}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                    {expense.category}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                    {expense.description}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                    {formatCurrency(expense.amount)}
                                </td>
                                <td style={{ padding: 'var(--spacing-xs)', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => onEdit(expense)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                            title="Düzenle"
                                        >
                                            📝
                                        </button>
                                        <button
                                            onClick={() => onDelete(expense.id, expense.category)}
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
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ExpenseTable;
