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

let tableExists = true;

export const noteService = {
    getNotes: async (): Promise<Note[]> => {
        if (!tableExists) return [];

        try {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === 'PGRST205' || error.message?.includes('notes')) {
                    tableExists = false;
                    return [];
                }
                throw error;
            }
            return data || [];
        } catch (error: any) {
            if (error?.status === 404 || error?.code === 'PGRST205') {
                tableExists = false;
            }
            console.error('Note fetch error:', error);
            return [];
        }
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
        if (!tableExists) {
            onUpdate([]);
            return () => { };
        }

        noteService.getNotes().then(onUpdate).catch(() => onUpdate([]));

        const subscription = supabase
            .channel('public:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, async () => {
                if (tableExists) {
                    const notes = await noteService.getNotes();
                    onUpdate(notes);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }
};
