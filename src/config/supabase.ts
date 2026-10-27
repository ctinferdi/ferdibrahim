import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL veya Anon Key eksik. .env dosyasını kontrol edin.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Public listing routes deliberately use an anonymous client even when the browser
// also has a signed-in session. This keeps public RLS/column grants in effect.
export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});
