/**
 * Global Frontend Configuration for RecoverAI.
 * Dynamically resolves API_BASE for local development and cloud production (Vercel + Render).
 */
const envUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  ''
).trim().replace(/\/+$/, '');

function resolveApiBase(): string {
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  // Production fallback for Vercel deployment if env variables are not explicitly configured
  if (typeof window !== 'undefined' && window.location.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'https://razorpay-buildathon-rvgj.onrender.com/api';
  }
  return '/api';
}

export const API_BASE = resolveApiBase();
