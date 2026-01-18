import { supabase } from '../config/supabase';
import { Apartment, ApartmentInput } from '../types';

export const subscribeToApartments = (onUpdate: (apartments: Apartment[]) => void) => {
    getApartments().then(onUpdate);

    const subscription = supabase
        .channel('public:apartments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, async () => {
            const apartments = await getApartments();
            onUpdate(apartments);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

export const getApartments = async (): Promise<Apartment[]> => {
    const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .order('building_name', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Apartment[];
};

export const addApartment = async (apartment: ApartmentInput, userId: string): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .insert([{ ...apartment, user_id: userId }]);

    if (error) throw error;
};

export const updateApartment = async (id: string, apartment: Partial<Apartment>): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .update(apartment)
        .eq('id', id);

    if (error) throw error;
};

export const deleteApartment = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const bulkAddApartments = async (apartments: ApartmentInput[], userId: string): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .insert(apartments.map(apt => ({ ...apt, user_id: userId })));

    if (error) throw error;
};

export const bulkDeleteApartments = async (ids: string[]): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .delete()
        .in('id', ids);

    if (error) throw error;
};

export const apartmentService = {
    subscribeToApartments,
    getApartments,
    addApartment,
    updateApartment,
    deleteApartment,
    bulkAddApartments,
    bulkDeleteApartments
};
