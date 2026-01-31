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

export const getChecks = async (projectId?: string): Promise<Check[]> => {
    let query = supabase
        .from('checks')
        .select('*')
        .order('due_date', { ascending: true });

    if (projectId) {
        query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Check[];
};

export const addCheck = async (check: CheckInput, userId: string): Promise<void> => {
    try {
        // Define data to insert explicitly to avoid issues with missing columns
        const checkData: any = {
            check_number: check.check_number,
            amount: check.amount,
            company: check.company,
            recipient: check.company, // Add this to satisfy the NOT NULL constraint in DB
            category: check.category,
            issuer: check.issuer,
            given_date: check.given_date,
            due_date: check.due_date,
            status: check.status,
            description: check.description || '',
            project_id: (check.project_id && check.project_id.trim() !== '') ? check.project_id : null,
            user_id: (userId && userId.trim() !== '') ? userId : null
        };

        // Add optional fields only if they exist in the input
        if (check.vat_status) checkData.vat_status = check.vat_status;
        if (check.notification_email) checkData.notification_email = check.notification_email;
        if (check.notification_email_2) checkData.notification_email_2 = check.notification_email_2;
        if (check.notification_email_3) checkData.notification_email_3 = check.notification_email_3;

        const { error } = await supabase
            .from('checks')
            .insert([checkData]);

        if (error) {
            console.error('Supabase Insert Error:', error);
            throw error;
        }
    } catch (err) {
        console.error('addCheck Service Error:', err);
        throw err;
    }
};

export const updateCheck = async (id: string, check: Partial<Check>): Promise<void> => {
    const updateData: any = { ...check };
    if (check.company) {
        updateData.recipient = check.company;
    }

    const { error } = await supabase
        .from('checks')
        .update(updateData)
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
