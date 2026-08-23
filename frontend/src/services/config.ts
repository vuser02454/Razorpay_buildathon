/**
 * Global Frontend Configuration for RecoverAI.
 * Dynamically resolves API_BASE for local development and cloud production (Vercel + Render).
 */
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

// If VITE_API_URL already contains '/api', use it as-is; otherwise append '/api'
export const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';
