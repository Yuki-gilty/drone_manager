/**
 * Supabase Client initialization
 * This module initializes and exports the Supabase client
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || window.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials are not set. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Export helper functions
export async function getCurrentUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

export async function isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

