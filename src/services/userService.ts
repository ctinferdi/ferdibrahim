import { supabase } from '../config/supabase';

class UserService {
    // Get user profile with company info
    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('company_name, company_address, company_location, whatsapp_number, notification_emails')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    // Update user profile (company info)
    async updateUserProfile(userId: string, updates: {
        company_name?: string;
        company_address?: string;
        company_location?: string;
        whatsapp_number?: string;
        notification_emails?: string[];
    }) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export const userService = new UserService();
