import { supabase } from '../config/supabase';
import { Expense } from '../types';

const toTurkishUpperCase = (str: string) => {
    return str
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .toUpperCase();
};

export const expenseService = {
    subscribeToExpenses: (onUpdate: (expenses: Expense[]) => void) => {
        // Initial fetch
        expenseService.getExpenses().then(onUpdate);

        // Subscribe to changes
        const subscription = supabase
            .channel('public:expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, async () => {
                const expenses = await expenseService.getExpenses();
                onUpdate(expenses);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    },

    getExpenses: async (projectId?: string): Promise<Expense[]> => {
        let query = supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as Expense[];
    },

    addExpense: async (expense: Omit<Expense, 'id'>): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();

        const data: any = {
            date: expense.date,
            amount: expense.amount || 0,
            category: toTurkishUpperCase(expense.category || ''),
            description: toTurkishUpperCase(expense.description || ''),
            user_id: user?.id
        };

        if (expense.project_id) data.project_id = expense.project_id;

        // Only add these if they have values to avoid schema issues on older tables
        if (expense.partner_id && expense.partner_id.trim() !== '') {
            data.partner_id = expense.partner_id;
        }
        if (expense.payment_method && expense.payment_method.trim() !== '') {
            data.payment_method = toTurkishUpperCase(expense.payment_method);
        }
        if (expense.recipient && expense.recipient.trim() !== '') {
            data.recipient = toTurkishUpperCase(expense.recipient);
        }

        const { error } = await supabase
            .from('expenses')
            .insert([data]);

        if (error) throw error;
    },

    updateExpense: async (id: string, expense: Partial<Expense>): Promise<void> => {
        const data: any = {};

        if (expense.date) data.date = expense.date;
        if (expense.amount !== undefined) data.amount = expense.amount;
        if (expense.category) data.category = toTurkishUpperCase(expense.category);
        if (expense.description !== undefined) data.description = toTurkishUpperCase(expense.description || '');

        if (expense.payment_method !== undefined) {
            data.payment_method = expense.payment_method && expense.payment_method.trim() !== ''
                ? toTurkishUpperCase(expense.payment_method)
                : null;
        }
        if (expense.recipient !== undefined) {
            data.recipient = expense.recipient && expense.recipient.trim() !== ''
                ? toTurkishUpperCase(expense.recipient)
                : null;
        }
        if (expense.partner_id !== undefined) {
            data.partner_id = expense.partner_id && expense.partner_id.trim() !== ''
                ? expense.partner_id
                : null;
        }
        if (expense.project_id) data.project_id = expense.project_id;

        const { error } = await supabase
            .from('expenses')
            .update(data)
            .eq('id', id);

        if (error) throw error;
    },

    deleteExpense: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
