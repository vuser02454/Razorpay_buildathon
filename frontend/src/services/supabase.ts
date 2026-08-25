import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Fallback to a placeholder URL/key if environment variables are not set yet,
// preventing runtime initialization crashes while logging a helpful notice.
const fallbackUrl = 'https://placeholder-recoverai.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== fallbackUrl &&
  !supabaseUrl.includes('placeholder')
);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.info(
    '[RecoverAI] Supabase Auth: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Using safe fallback client.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
