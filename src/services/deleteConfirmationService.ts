import { supabase } from '../config/supabase';

export type DeleteActionType = 'expense' | 'check' | 'apartment_reset' | 'expense_category' | 'project' | 'user';

interface RequestDeleteConfirmationInput {
    actionType: DeleteActionType;
    targetId: string;
    targetName: string;
    projectId?: string;
}

export const deleteConfirmationService = {
    async request(input: RequestDeleteConfirmationInput): Promise<string> {
        const { data, error } = await supabase.functions.invoke('send-delete-code', {
            body: { ...input, phase: 'request' },
        });
        if (error) throw error;
        if (typeof data?.challengeId !== 'string' || !data.challengeId) {
            throw new Error(data?.error || 'Güvenlik kodu talebi başlatılamadı.');
        }
        return data.challengeId;
    },

    async verify(challengeId: string, code: string): Promise<void> {
        const { data, error } = await supabase.functions.invoke('send-delete-code', {
            body: { phase: 'verify', challengeId, code },
        });
        if (error) throw error;
        if (data?.verified !== true) throw new Error(data?.error || 'Güvenlik kodu geçersiz veya süresi dolmuş.');
    },
};
