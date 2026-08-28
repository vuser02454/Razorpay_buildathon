import { API_BASE } from './config';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  is_demo: boolean;
  created_at: string;
  email_verified?: boolean;
  email_confirmed_at?: string | null;
}

export interface AuthSession {
  token: string;
  admin: AdminProfile;
}

const STORAGE_KEY = 'recoverai_auth_session';

/**
 * Production-safe Auth error snapshot.
 */
export function serializeAuthError(err: any): Record<string, unknown> {
  if (!err) return { present: false };
  const rawMsg = typeof err === 'string' ? err : err.message || err.error_description || err.msg || '';
  return {
    present: true,
    name: err.name || null,
    status: err.status ?? err.statusCode ?? null,
    code: err.code || err.error_code || null,
    message: rawMsg || null,
  };
}

/**
 * Format error into a user-facing message.
 */
export function formatAuthError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const rawMsg = typeof err === 'string' ? err : err.message || err.error_description || err.msg || '';
  const msg = rawMsg.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('incorrect') || msg.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }
  if (msg.includes('verify your email') || msg.includes('unverified') || msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('expired')) {
    return 'This link has expired. Please request a new one.';
  }
  if (msg.includes('at least 6 characters') || msg.includes('weak_password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed')) {
    return 'Unable to connect to authentication server. Please check your internet connection.';
  }
  if (rawMsg) {
    return rawMsg;
  }
  return 'Unable to authenticate right now. Please try again.';
}

export const authStore = {
  _currentSession: null as AuthSession | null,
  _listeners: [] as Array<(admin: AdminProfile | null) => void>,

  /**
   * Returns current active cached session.
   */
  getSession(): AuthSession | null {
    if (this._currentSession) {
      return this._currentSession;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this._currentSession = JSON.parse(stored);
        return this._currentSession;
      }
    } catch {
      // Ignore localStorage parse errors
    }
    return null;
  },

  /**
   * Persists active session to local storage.
   */
  setSession(session: AuthSession): void {
    this._currentSession = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore localStorage quota errors
    }
    this._notifyListeners(session.admin);
  },

  /**
   * Clears session on logout.
   */
  clearSession(): void {
    this._currentSession = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this._notifyListeners(null);
  },

  /**
   * Returns authenticated admin profile or null.
   */
  getAdmin(): AdminProfile | null {
    const session = this.getSession();
    return session ? session.admin : null;
  },

  /**
   * Returns Bearer auth token if present.
   */
  getToken(): string | null {
    const session = this.getSession();
    return session ? session.token : null;
  },

  /**
   * True if authenticated.
   */
  isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session?.token;
  },

  /**
   * Subscribe to auth state changes.
   */
  onAuthStateChange(callback: (event: string, session: AuthSession | null, admin: AdminProfile | null) => void) {
    const listener = (admin: AdminProfile | null) => {
      const session = this.getSession();
      callback(admin ? 'SIGNED_IN' : 'SIGNED_OUT', session, admin);
    };
    this._listeners.push(listener);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this._listeners = this._listeners.filter(l => l !== listener);
          }
        }
      }
    };
  },

  _notifyListeners(admin: AdminProfile | null) {
    this._listeners.forEach(l => l(admin));
  },

  /**
   * Initializes the session on startup by validating with GET /api/auth/me.
   */
  async initSession(): Promise<AdminProfile | null> {
    const cached = this.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cached?.token) {
      headers['Authorization'] = `Bearer ${cached.token}`;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const admin: AdminProfile = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'ADMIN',
            is_demo: data.user.is_demo || false,
            created_at: data.user.created_at || new Date().toISOString(),
            email_verified: data.user.email_verified
          };
          this.setSession({
            token: cached?.token || 'session_cookie_auth',
            admin
          });
          return admin;
        }
      }
    } catch (e) {
      console.warn('[RecoverAI] Session validation error:', e);
    }

    // If server returned 401 and was not demo mode
    if (cached && !cached.admin?.is_demo) {
      this.clearSession();
    }
    return this.getAdmin();
  },

  /**
   * Register a new admin account via backend.
   */
  async signup(name: string, email: string, password: string): Promise<{
    user: any;
    needsEmailVerification: boolean;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        password
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Registration failed. Please check your credentials.');
    }

    return {
      user: data.user,
      needsEmailVerification: Boolean(data.needs_email_verification)
    };
  },

  /**
   * Sign in using backend session authentication.
   */
  async login(email: string, password: string): Promise<AdminProfile> {
    const cleanEmail = email.trim().toLowerCase();

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: cleanEmail,
        password
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 403 || (data.detail && data.detail.includes('verify your email'))) {
        const err = new Error(data.detail || 'Please verify your email before logging in.');
        (err as any).unverified = true;
        (err as any).email = cleanEmail;
        throw err;
      }
      throw new Error(data.detail || 'Email or password is incorrect.');
    }

    const admin: AdminProfile = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role || 'ADMIN',
      is_demo: data.user.is_demo || false,
      created_at: data.user.created_at || new Date().toISOString(),
      email_verified: data.user.email_verified
    };

    this.setSession({
      token: data.token,
      admin
    });

    return admin;
  },

  /**
   * 1-Click Demo login.
   */
  async loginDemo(): Promise<AdminProfile> {
    const res = await fetch(`${API_BASE}/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Unable to launch demo workspace.');
    }

    this.setSession({
      token: data.token,
      admin: data.admin
    });

    return data.admin;
  },

  /**
   * Verify email with token.
   */
  async verifyEmail(token: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Invalid or expired email verification link.');
    }
    return true;
  },

  /**
   * Resend verification email to unverified address.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: cleanEmail })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Unable to resend verification email.');
    }
  },

  /**
   * Request password reset link.
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: cleanEmail })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Unable to process password reset request.');
    }
  },

  /**
   * Reset password with token.
   */
  async updateUserPassword(password: string, token?: string): Promise<void> {
    const resetToken = token || new URLSearchParams(window.location.search).get('token') || '';
    if (!resetToken) {
      throw new Error('Password reset token is missing from the link.');
    }

    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        token: resetToken,
        new_password: password
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Unable to reset password. Link may be expired.');
    }
  },

  /**
   * Sign out and destroy session.
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
    } catch {
      // Ignore network errors on logout
    }

    this.clearSession();
  }
};
