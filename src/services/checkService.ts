import { supabase } from '../config/supabase';
import { Check } from '../types';

export const checkService = {
    subscribeToChecks: (onUpdate: (checks: Check[]) => void) => {
        checkService.getChecks().then(onUpdate);

        const subscription = supabase
            .channel('public:checks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checks' }, async () => {
                const checks = await checkService.getChecks();
                onUpdate(checks);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    },

    getChecks: async (): Promise<Check[]> => {
        const { data, error } = await supabase
            .from('checks')
            .select('*')
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data as Check[];
    },

    addCheck: async (check: Omit<Check, 'id'>): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('checks')
            .insert([{ ...check, user_id: user?.id }]);

        if (error) throw error;
    },

    updateCheck: async (id: string, check: Partial<Check>): Promise<void> => {
        const { error } = await supabase
            .from('checks')
            .update(check)
            .eq('id', id);

        if (error) throw error;
    },

    deleteCheck: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('checks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
