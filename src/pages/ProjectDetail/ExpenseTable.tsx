import React, { useState, useEffect } from 'react';
import { Expense, Project } from '../../types';

interface ExpenseTableProps {
    expenses: Expense[];
    project: Project;
    onEdit: (expense: Expense) => void;
    onDelete: (id: string, name: string) => void;
    formatCurrency: (value: number) => string;
    sendingCode?: boolean;
    loading?: boolean;
}

const PAGE_SIZES = [20, 40, 80, 100];

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, project, onEdit, onDelete, formatCurrency, sendingCode, loading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => {
        setCurrentPage(1);
    }, [expenses.length, pageSize]);

    if (loading) {
        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#ebf1ff', borderBottom: '2px solid #c7d2fe' }}>
                            {['TARİH', 'KİM İÇİN', 'ÖDEME ŞEKLİ', 'VERİLEN KİŞİ', 'İŞ ADI', 'AÇIKLAMA', 'TUTAR', 'İŞLEMLER'].map(h => (
                                <th key={h} style={{ padding: 'var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-light)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map(i => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
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

    if (expenses.length === 0) {
        return (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                Henüz gider eklenmemiş. "+ Gider Ekle" butonuna tıklayarak başlayın.
            </p>
        );
    }

    const totalPages = Math.ceil(expenses.length / pageSize);
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIdx = (safeCurrentPage - 1) * pageSize;
    const pagedExpenses = expenses.slice(startIdx, startIdx + pageSize);

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safeCurrentPage > 3) pages.push('...');
            for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
                pages.push(i);
            }
            if (safeCurrentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div>
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
                        {pagedExpenses.map((expense) => {
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

            {/* Pagination Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 4px',
                borderTop: '1px solid var(--color-border)',
                marginTop: '2px'
            }}>
                {/* Info + Page Size */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                        {startIdx + 1}–{Math.min(startIdx + pageSize, expenses.length)} / <strong>{expenses.length}</strong> gider
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {PAGE_SIZES.map(size => (
                            <button
                                key={size}
                                onClick={() => setPageSize(size)}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    border: '1px solid',
                                    borderColor: pageSize === size ? 'var(--color-primary)' : 'var(--color-border)',
                                    borderRadius: '4px',
                                    background: pageSize === size ? 'var(--color-primary)' : 'transparent',
                                    color: pageSize === size ? '#fff' : 'var(--color-text-light)',
                                    cursor: 'pointer'
                                }}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Page Numbers */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={safeCurrentPage === 1}
                            style={{
                                padding: '2px 8px',
                                fontSize: '13px',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: safeCurrentPage === 1 ? 'var(--color-border)' : 'var(--color-text)',
                                cursor: safeCurrentPage === 1 ? 'default' : 'pointer'
                            }}
                        >‹</button>

                        {getPageNumbers().map((page, idx) =>
                            page === '...' ? (
                                <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', fontSize: '12px', color: 'var(--color-text-light)' }}>…</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page as number)}
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: '12px',
                                        fontWeight: safeCurrentPage === page ? 700 : 400,
                                        border: '1px solid',
                                        borderColor: safeCurrentPage === page ? 'var(--color-primary)' : 'var(--color-border)',
                                        borderRadius: '4px',
                                        background: safeCurrentPage === page ? 'var(--color-primary)' : 'transparent',
                                        color: safeCurrentPage === page ? '#fff' : 'var(--color-text)',
                                        cursor: 'pointer',
                                        minWidth: '28px'
                                    }}
                                >
                                    {page}
                                </button>
                            )
                        )}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={safeCurrentPage === totalPages}
                            style={{
                                padding: '2px 8px',
                                fontSize: '13px',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: safeCurrentPage === totalPages ? 'var(--color-border)' : 'var(--color-text)',
                                cursor: safeCurrentPage === totalPages ? 'default' : 'pointer'
                            }}
                        >›</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseTable;
