/**
 * Supabase Client initialization
 * This module initializes and exports the Supabase client
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/**
 * Get Supabase credentials from environment variables
 * Priority: window.VITE_SUPABASE_* > meta tags > default
 */
function getSupabaseConfig() {
    // 1. Try window object (set by Netlify or manual script)
    if (typeof window !== 'undefined') {
        const url = window.VITE_SUPABASE_URL || window.SUPABASE_URL;
        const key = window.VITE_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
        
        if (url && key) {
            return { url, key };
        }
    }
    
    // 2. Try meta tags (for static hosting)
    if (typeof document !== 'undefined') {
        const urlMeta = document.querySelector('meta[name="supabase-url"]');
        const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
        
        if (urlMeta && keyMeta) {
            return {
                url: urlMeta.getAttribute('content'),
                key: keyMeta.getAttribute('content')
            };
        }
    }
    
    // 3. Fallback: return empty (will show error)
    return { url: null, key: null };
}

const config = getSupabaseConfig();

if (!config.url || !config.key) {
    console.error('Supabase credentials are not set.');
    console.error('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    console.error('Options:');
    console.error('1. Set window.VITE_SUPABASE_URL and window.VITE_SUPABASE_ANON_KEY');
    console.error('2. Add meta tags: <meta name="supabase-url" content="...">');
    console.error('3. Use Netlify environment variables (automatically available)');
}

// Create Supabase client
export const supabase = createClient(
    config.url || 'https://placeholder.supabase.co',
    config.key || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

// Export helper functions
export async function getCurrentUserId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch (error) {
        console.error('Error getting current user ID:', error);
        return null;
    }
}

export async function isAuthenticated() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
}
