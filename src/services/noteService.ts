import { supabase } from '../config/supabase';

export interface Note {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
}

const toTurkishUpperCase = (str: string) => {
    return str
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .toUpperCase();
};

export const noteService = {
    getNotes: async (): Promise<Note[]> => {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    addNote: async (content: string): Promise<Note> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('notes')
            .insert([{
                content: toTurkishUpperCase(content),
                user_id: user.id
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
        noteService.getNotes().then(onUpdate);

        const subscription = supabase
            .channel('public:notes')
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
