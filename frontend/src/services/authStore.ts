import { API_BASE } from './config';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  is_demo: boolean;
  created_at: string;
}

export interface AuthSession {
  token: string;
  admin: AdminProfile;
}

const STORAGE_KEY = 'recoverai_auth_session';

export const authStore = {
  getSession(): AuthSession | null {
    try {
      // Use sessionStorage so every fresh browser session starts on the Login Page
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setSession(session: AuthSession) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    localStorage.removeItem(STORAGE_KEY);
  },

  clearSession() {
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
    return !!this.getSession()?.token;
  },

  async login(email: string, password: string): Promise<AdminProfile> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data: AuthSession = await res.json();
    this.setSession(data);
    return data.admin;
  },

  async loginDemo(): Promise<AdminProfile> {
    const res = await fetch(`${API_BASE}/auth/demo`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Demo login failed');
    }
    const data: AuthSession = await res.json();
    this.setSession(data);
    return data.admin;
  },

  async signup(name: string, email: string, password: string): Promise<AdminProfile> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Signup failed');
    }
    const data: AuthSession = await res.json();
    this.setSession(data);
    return data.admin;
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    this.clearSession();
  }
};
