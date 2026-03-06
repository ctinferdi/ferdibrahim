import { supabase } from '../config/supabase';
import { Apartment, ApartmentInput, PlanFile } from '../types';
import { storageService } from './storageService';
import { toTurkishUpperCase } from '../utils/stringUtils';

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

export const getApartments = async (projectId?: string): Promise<Apartment[]> => {
    let query = supabase
        .from('apartments')
        .select('*')
        .order('floor', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (projectId) {
        query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Apartment[];
};

export const addApartment = async (apartment: ApartmentInput, userId: string): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .insert([{
            ...apartment,
            building_name: toTurkishUpperCase(apartment.building_name),
            apartment_number: toTurkishUpperCase(apartment.apartment_number),
            customer_name: apartment.customer_name ? toTurkishUpperCase(apartment.customer_name) : '',
            user_id: userId
        }]);

    if (error) throw error;
};

export const updateApartment = async (id: string, apartment: Partial<Apartment>): Promise<void> => {
    const normalizedApartment = { ...apartment };
    if (normalizedApartment.building_name) normalizedApartment.building_name = toTurkishUpperCase(normalizedApartment.building_name);
    if (normalizedApartment.apartment_number) normalizedApartment.apartment_number = toTurkishUpperCase(normalizedApartment.apartment_number);
    if (normalizedApartment.customer_name) normalizedApartment.customer_name = toTurkishUpperCase(normalizedApartment.customer_name);

    const { error } = await supabase
        .from('apartments')
        .update(normalizedApartment)
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
        .insert(apartments.map(apt => ({
            ...apt,
            building_name: toTurkishUpperCase(apt.building_name),
            apartment_number: toTurkishUpperCase(apt.apartment_number),
            customer_name: apt.customer_name ? toTurkishUpperCase(apt.customer_name) : '',
            user_id: userId
        })));

    if (error) throw error;
};

export const bulkDeleteApartments = async (ids: string[]): Promise<void> => {
    const { error } = await supabase
        .from('apartments')
        .delete()
        .in('id', ids);

    if (error) throw error;
};

// Add plan file to apartment
export const addPlanFile = async (apartmentId: string, file: File): Promise<void> => {
    // Upload file to storage
    const planFile = await storageService.uploadFile(file, apartmentId);

    // Get current apartment
    const { data: apartment, error: fetchError } = await supabase
        .from('apartments')
        .select('plan_files')
        .eq('id', apartmentId)
        .single();

    if (fetchError) throw fetchError;

    // Add new file to array
    const currentFiles = (apartment?.plan_files as PlanFile[]) || [];
    const updatedFiles = [...currentFiles, planFile];

    // Update apartment
    const { error: updateError } = await supabase
        .from('apartments')
        .update({ plan_files: updatedFiles })
        .eq('id', apartmentId);

    if (updateError) throw updateError;
};

// Remove plan file from apartment
export const removePlanFile = async (apartmentId: string, fileId: string): Promise<void> => {
    // Get current apartment
    const { data: apartment, error: fetchError } = await supabase
        .from('apartments')
        .select('plan_files')
        .eq('id', apartmentId)
        .single();

    if (fetchError) throw fetchError;

    const currentFiles = (apartment?.plan_files as PlanFile[]) || [];
    const fileToRemove = currentFiles.find(f => f.id === fileId);
    const updatedFiles = currentFiles.filter(f => f.id !== fileId);

    // Update apartment record first
    const { error: updateError } = await supabase
        .from('apartments')
        .update({ plan_files: updatedFiles })
        .eq('id', apartmentId);

    if (updateError) throw updateError;

    // Delete actual file from storage
    if (fileToRemove?.url) {
        const marker = '/apartment-plans/';
        const idx = fileToRemove.url.indexOf(marker);
        if (idx !== -1) {
            const storagePath = fileToRemove.url.substring(idx + marker.length);
            try {
                await storageService.deleteFile(storagePath);
            } catch (e) {
                console.warn('Storage file deletion failed, orphaned object:', storagePath, e);
            }
        }
    }
};

// Get apartments by project public code (for public viewing)
export const getApartmentsByPublicCode = async (publicCode: string): Promise<Apartment[]> => {
    // First get project by public code
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('public_code', publicCode)
        .single();

    if (projectError) throw projectError;

    // Then get ALL apartments for that project (available + sold)
    const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('project_id', project.id)
        .order('floor', { ascending: false })
        .order('apartment_number', { ascending: true });

    if (error) throw error;
    return data as Apartment[];
};

export const apartmentService = {
    subscribeToApartments,
    getApartments,
    addApartment,
    updateApartment,
    deleteApartment,
    bulkAddApartments,
    bulkDeleteApartments,
    addPlanFile,
    removePlanFile,
    getApartmentsByPublicCode
};
