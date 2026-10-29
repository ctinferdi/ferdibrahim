import { supabase } from '../config/supabase';

export type DeleteActionType = 'expense' | 'check' | 'apartment_reset' | 'expense_category' | 'project' | 'user';

interface RequestDeleteConfirmationInput {
    actionType: DeleteActionType;
    targetId: string;
    targetName: string;
    projectId?: string;
}

const getFunctionErrorMessage = async (error: unknown): Promise<string> => {
    const details = error && typeof error === 'object'
        ? error as { message?: unknown; context?: unknown }
        : {};
    const fallback = typeof details.message === 'string' && details.message
        ? details.message
        : 'Güvenlik işlemi tamamlanamadı.';

    if (details.context instanceof Response) {
        const response = details.context;
        try {
            const payload: unknown = await response.clone().json();
            if (payload && typeof payload === 'object') {
                const body = payload as { error?: unknown; message?: unknown };
                if (typeof body.error === 'string' && body.error) return body.error;
                if (typeof body.message === 'string' && body.message) return body.message;
            }
        } catch {
            // Keep the SDK message when the gateway did not return JSON.
        }

        return `${fallback} (HTTP ${response.status})`;
    }

    return fallback;
};

export const deleteConfirmationService = {
    async request(input: RequestDeleteConfirmationInput): Promise<string> {
        const { data, error } = await supabase.functions.invoke('send-delete-code', {
            body: { ...input, phase: 'request' },
        });
        if (error) throw new Error(await getFunctionErrorMessage(error));
        if (typeof data?.challengeId !== 'string' || !data.challengeId) {
            throw new Error(data?.error || 'Güvenlik kodu talebi başlatılamadı.');
        }
        return data.challengeId;
    },

    async verify(challengeId: string, code: string): Promise<void> {
        const { data, error } = await supabase.functions.invoke('send-delete-code', {
            body: { phase: 'verify', challengeId, code },
        });
        if (error) throw new Error(await getFunctionErrorMessage(error));
        if (data?.verified !== true) throw new Error(data?.error || 'Güvenlik kodu geçersiz veya süresi dolmuş.');
    },
};
