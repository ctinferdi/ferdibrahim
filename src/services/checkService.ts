import { supabase } from '../config/supabase';
import { Check, CheckInput } from '../types';

export const subscribeToChecks = (onUpdate: (checks: Check[]) => void) => {
    getChecks().then(onUpdate);

    const subscription = supabase
        .channel('public:checks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checks' }, async () => {
            const checks = await getChecks();
            onUpdate(checks);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

export const getChecks = async (): Promise<Check[]> => {
    const { data, error } = await supabase
        .from('checks')
        .select('*')
        .order('due_date', { ascending: true });

    if (error) throw error;
    return data as Check[];
};

export const addCheck = async (check: CheckInput, userId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('checks')
        .insert([{
            ...check,
            user_id: userId,
            created_by_email: user?.email
        }]);

    if (error) throw error;
};

export const updateCheck = async (id: string, check: Partial<Check>): Promise<void> => {
    const { error } = await supabase
        .from('checks')
        .update(check)
        .eq('id', id);

    if (error) throw error;
};

export const deleteCheck = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('checks')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const checkService = {
    subscribeToChecks,
    getChecks,
    addCheck,
    updateCheck,
    deleteCheck
};
