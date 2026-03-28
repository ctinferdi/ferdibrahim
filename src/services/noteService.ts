import { supabase } from '../config/supabase';
import { toTurkishUpperCase } from '../utils/stringUtils';

export interface Note {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
}

export const noteService = {
    getNotes: async (): Promise<Note[]> => {
        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            console.error('Note fetch error:', error);
            return [];
        }
    },

    addNote: async (content: string, userId: string): Promise<Note> => {
        const { data, error } = await supabase
            .from('notes')
            .insert([{
                content: toTurkishUpperCase(content),
                user_id: userId
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteNote: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    subscribeToNotes: (onUpdate: (notes: Note[]) => void) => {
        noteService.getNotes().then(onUpdate).catch(() => onUpdate([]));

        const subscription = supabase
            .channel('notes-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, async () => {
                const notes = await noteService.getNotes();
                onUpdate(notes);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }
};
