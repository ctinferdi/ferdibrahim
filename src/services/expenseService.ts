import { supabase } from '../config/supabase';
import { Expense } from '../types';

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

    getExpenses: async (): Promise<Expense[]> => {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return data as Expense[];
    },

    addExpense: async (expense: Omit<Expense, 'id'>): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('expenses')
            .insert([{ ...expense, user_id: user?.id }]);

        if (error) throw error;
    },

    updateExpense: async (id: string, expense: Partial<Expense>): Promise<void> => {
        const { error } = await supabase
            .from('expenses')
            .update(expense)
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
