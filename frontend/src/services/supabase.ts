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

function publicKeyKind(key: string): 'publishable' | 'legacy_jwt_anon' | 'missing' | 'unknown' {
  if (!key) return 'missing';
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (key.startsWith('eyJ')) return 'legacy_jwt_anon';
  return 'unknown';
}

function publicHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * Production-safe Auth diagnostics. Never includes key material, JWTs, or passwords.
 */
export function getPublicSupabaseAuthDiagnostics() {
  return {
    configured: isSupabaseConfigured,
    host: publicHost(supabaseUrl || fallbackUrl),
    keyKind: publicKeyKind(supabaseAnonKey),
    origin: typeof window !== 'undefined' ? window.location.origin : 'server',
    hasLocalhostUrl: (supabaseUrl || '').includes('localhost') || (supabaseUrl || '').includes('127.0.0.1'),
  };
}

if (typeof window !== 'undefined') {
  if (!isSupabaseConfigured) {
    console.info(
      '[RecoverAI][AuthDiagnostics] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. Using safe fallback client.',
      getPublicSupabaseAuthDiagnostics()
    );
  } else {
    console.info('[RecoverAI][AuthDiagnostics] Supabase client initialized', getPublicSupabaseAuthDiagnostics());
  }
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
