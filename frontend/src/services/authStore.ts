import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { API_BASE } from './config';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  is_demo: boolean;
  created_at: string;
  email_confirmed_at?: string | null;
}

export interface AuthSession {
  token: string;
  admin: AdminProfile;
}

const STORAGE_KEY = 'recoverai_auth_session';

/**
 * Format any Supabase or network authentication error into a user-friendly message.
 * Strict zero exposure of internal Supabase details, tokens, or JWTs.
 */
export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const msg = (typeof err === 'string' ? err : err.message || err.error_description || '').toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant') || msg.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (msg.includes('email not confirmed') || msg.includes('unconfirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (msg.includes('already registered') || msg.includes('user_already_exists') || msg.includes('already exists')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('expired') || msg.includes('token expired') || msg.includes('otp_expired')) {
    return 'This recovery link has expired. Request a new one.';
  }
  if (msg.includes('at least 6 characters') || msg.includes('weak_password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Unable to connect to authentication server. Please check your internet connection.';
  }
  return 'Unable to authenticate right now. Please try again.';
}

export const authStore = {
  _currentSession: null as AuthSession | null,

  mapUserToAdmin(user: User, isDemo: boolean = false): AdminProfile {
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Admin',
      role: 'ADMIN',
      is_demo: isDemo,
      created_at: user.created_at || new Date().toISOString(),
      email_confirmed_at: user.email_confirmed_at || (user as any).confirmed_at || null,
    };
  },

  getSession(): AuthSession | null {
    if (this._currentSession) return this._currentSession;
    try {
      const data = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (data) {
        this._currentSession = JSON.parse(data);
        return this._currentSession;
      }
    } catch {
      // Ignore JSON parse errors
    }
    return null;
  },

  setSession(session: AuthSession, persistLocal: boolean = false) {
    this._currentSession = session;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (persistLocal) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  },

  clearSession() {
    this._currentSession = null;
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  },

  getToken(): string | null {
    return this.getSession()?.token || null;
  },

  getAdmin(): AdminProfile | null {
    return this.getSession()?.admin || null;
  },

  isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session?.token;
  },

  /**
   * Initializes the session on application startup from Supabase Auth.
   */
  async initSession(): Promise<AdminProfile | null> {
    try {
      // Check existing cached session first (especially for demo admin)
      const cached = this.getSession();
      if (cached?.admin?.is_demo) {
        return cached.admin;
      }

      if (isSupabaseConfigured) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session || !session.user) {
          if (!cached?.admin?.is_demo) {
            this.clearSession();
          }
          return cached?.admin?.is_demo ? cached.admin : null;
        }

        // Email verification check
        const isEmailConfirmed = Boolean(
          session.user.email_confirmed_at || (session.user as any).confirmed_at
        );

        if (!isEmailConfirmed) {
          // Unverified email: do not expose authenticated session
          this.clearSession();
          return null;
        }

        const admin = this.mapUserToAdmin(session.user, false);
        this.setSession({
          token: session.access_token,
          admin,
        });
        return admin;
      }
    } catch (e) {
      console.warn('[RecoverAI] Failed to retrieve Supabase session on startup:', e);
    }
    return this.getAdmin();
  },

  /**
   * Listen for Supabase Auth state changes.
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null, admin: AdminProfile | null) => void
  ) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const isConfirmed = Boolean(
          session.user.email_confirmed_at || (session.user as any).confirmed_at
        );
        if (isConfirmed) {
          const admin = this.mapUserToAdmin(session.user, false);
          this.setSession({
            token: session.access_token,
            admin,
          });
          callback(event, session, admin);
          return;
        }
      }

      if (event === 'SIGNED_OUT') {
        this.clearSession();
        callback(event, null, null);
      } else {
        callback(event, session, null);
      }
    });
  },

  /**
   * Register a new admin via Supabase Auth.
   * Sends a Supabase verification email with redirect to /auth/callback.
   */
  async signup(name: string, email: string, password: string): Promise<{
    user: User | null;
    needsEmailVerification: boolean;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }

    const isConfirmed = Boolean(
      data.user?.email_confirmed_at || (data.user as any)?.confirmed_at
    );

    // If confirmation is required (default standard behavior), user must check their email
    return {
      user: data.user,
      needsEmailVerification: !isConfirmed,
    };
  },

  /**
   * Sign in with Supabase Auth using email and password.
   */
  async login(email: string, password: string): Promise<AdminProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }

    if (!data.user || !data.session) {
      throw new Error('Unable to authenticate right now. Please try again.');
    }

    // 2. Strict Email Verification Verification
    const isEmailConfirmed = Boolean(
      data.user.email_confirmed_at || (data.user as any).confirmed_at
    );

    if (!isEmailConfirmed) {
      // Sign out unconfirmed session immediately
      await supabase.auth.signOut().catch(() => {});
      this.clearSession();
      const err = new Error('Please verify your email before signing in.');
      (err as any).unverified = true;
      (err as any).email = cleanEmail;
      throw err;
    }

    const admin = this.mapUserToAdmin(data.user, false);
    this.setSession({
      token: data.session.access_token,
      admin,
    });

    return admin;
  },

  /**
   * 1-Click Controlled Demo Login for Hackathon Judges.
   * Obtains a secure demo session from the backend without exposing credentials in frontend.
   */
  async loginDemo(): Promise<AdminProfile> {
    const res = await fetch(`${API_BASE}/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error('Unable to launch demo workspace right now. Please try again.');
    }

    const data: AuthSession = await res.json();
    this.setSession(data);
    return data.admin;
  },

  /**
   * Request password reset email via Supabase Auth.
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = `${window.location.origin}/auth/callback?type=recovery`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }
  },

  /**
   * Update password for the currently active recovery session via Supabase Auth.
   */
  async updateUserPassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }
  },

  /**
   * Resend signup verification email via Supabase Auth.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }
  },

  /**
   * Sign out and clear all authenticated and cached state.
   */
  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on sign out
    }
    this.clearSession();
  },
};
