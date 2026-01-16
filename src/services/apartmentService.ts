import { supabase } from '../config/supabase';
import { Apartment } from '../types';

export const apartmentService = {
    subscribeToApartments: (onUpdate: (apartments: Apartment[]) => void) => {
        apartmentService.getApartments().then(onUpdate);

        const subscription = supabase
            .channel('public:apartments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, async () => {
                const apartments = await apartmentService.getApartments();
                onUpdate(apartments);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    },

    getApartments: async (): Promise<Apartment[]> => {
        const { data, error } = await supabase
            .from('apartments')
            .select('*')
            .order('building_name', { ascending: true });

        if (error) throw error;
        return data as Apartment[];
    },

    addApartment: async (apartment: Omit<Apartment, 'id'>): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('apartments')
            .insert([{ ...apartment, user_id: user?.id }]);

        if (error) throw error;
    },

    updateApartment: async (id: string, apartment: Partial<Apartment>): Promise<void> => {
        const { error } = await supabase
            .from('apartments')
            .update(apartment)
            .eq('id', id);

        if (error) throw error;
    },

    deleteApartment: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('apartments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
