import { Expense } from '../types';
import { normalizeExpenseCategory } from '../services/expenseCategoryService';

export interface ExpenseTransaction {
    expenses: Expense[];
    total: number;
    shared: boolean;
}

/**
 * Category views combine same-day payments for the same work only when they
 * come from distinct partners. The source rows remain untouched for the full
 * Gider Kayıtları view.
 */
export const groupExpenseTransactions = (expenses: Expense[]): ExpenseTransaction[] => {
    const groups = new Map<string, Expense[]>();
    const standalone: ExpenseTransaction[] = [];

    expenses.forEach(expense => {
        if (!expense.partner_id) {
            standalone.push({ expenses: [expense], total: Number(expense.amount) || 0, shared: false });
            return;
        }

        const key = JSON.stringify([
            expense.date,
            expense.project_id || '',
            normalizeExpenseCategory(expense.category)
        ]);
        groups.set(key, [...(groups.get(key) || []), expense]);
    });

    const grouped: ExpenseTransaction[] = [];
    Array.from(groups.values()).forEach(rows => {
        const partners = new Set(rows.map(row => row.partner_id));
        const isShared = rows.length > 1 && partners.size === rows.length;
        if (isShared) {
            grouped.push({
                expenses: rows,
                total: rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
                shared: true
            });
        } else {
            rows.forEach(row => grouped.push({ expenses: [row], total: Number(row.amount) || 0, shared: false }));
        }
    });

    return [...standalone, ...grouped].sort((a, b) => {
        const aDate = a.expenses[0]?.created_at || a.expenses[0]?.date || '';
        const bDate = b.expenses[0]?.created_at || b.expenses[0]?.date || '';
        return bDate.localeCompare(aDate);
    });
};
