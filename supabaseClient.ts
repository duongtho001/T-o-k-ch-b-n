import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL as FALLBACK_URL, SUPABASE_ANON_KEY as FALLBACK_KEY } from './config';

// Function to get Supabase credentials, prioritizing localStorage for admin overrides.
const getSupabaseCredentials = () => {
    try {
        const url = localStorage.getItem('supabase-url') || FALLBACK_URL;
        const anonKey = localStorage.getItem('supabase-anon-key') || FALLBACK_KEY;
        return { url, anonKey };
    } catch (e) {
        // If localStorage is not available (e.g., in SSR or private browsing), use fallbacks.
        return { url: FALLBACK_URL, anonKey: FALLBACK_KEY };
    }
};

const { url, anonKey } = getSupabaseCredentials();

// Initialize the client with dynamic or fallback credentials.
export const supabase = createClient(url, anonKey);
