import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw, Sun, Moon } from 'lucide-react';
import { authStore, AdminProfile } from '../../services/authStore';

interface AuthCallbackProps {
  onAuthSuccess: (admin: AdminProfile) => void;
  onPasswordRecovery: () => void;
  onGoToLogin: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({
  onAuthSuccess,
  onPasswordRecovery,
  onGoToLogin,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [status, setStatus] = useState<'processing' | 'verified' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const token = searchParams.get('token') || hashParams.get('token');
      const type = searchParams.get('type') || hashParams.get('type');
      const error = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

      if (error) {
        const desc = (errorDescription || '').toLowerCase();
        let userMessage = 'Unable to verify link. Please request a new one.';
        if (desc.includes('expired')) {
          userMessage = 'This link has expired. Please request a new one.';
        } else if (desc.includes('invalid') || desc.includes('already')) {
          userMessage = 'This verification link is invalid or has already been used.';
        }
        if (isMounted) {
          setStatus('error');
          setErrorMessage(userMessage);
        }
        return;
      }

      // 1. Password Recovery Flow
      if (type === 'recovery' || window.location.pathname.includes('reset-password')) {
        if (isMounted) {
          onPasswordRecovery();
        }
        return;
      }

      // 2. Email Verification Token Flow
      if (token) {
        try {
          await authStore.verifyEmail(token);
          if (isMounted) {
            setStatus('verified');
          }
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        } catch (err: any) {
          if (isMounted) {
            setStatus('error');
            setErrorMessage(err.message || 'Invalid or expired email verification link.');
          }
          return;
        }
      }

      // 3. Fallback check active session
      const currentAdmin = authStore.getAdmin();
      if (currentAdmin) {
        if (isMounted) {
          setStatus('verified');
          setTimeout(() => {
            if (isMounted) onAuthSuccess(currentAdmin);
          }, 1000);
        }
      } else {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('No valid verification token found. Please sign in or check your email.');
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [onAuthSuccess, onPasswordRecovery]);

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-hidden font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950 text-white selection:bg-lime-300 selection:text-slate-950' : 'bg-slate-50 text-slate-900 selection:bg-lime-200 selection:text-slate-950'
    }`}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2400&q=85"
          alt="Atmospheric finance operations"
          className={`w-full h-full object-cover object-center scale-105 transition-opacity duration-500 ${
            isDarkMode ? 'opacity-20' : 'opacity-[0.07]'
          }`}
        />
        <div className={`absolute inset-0 transition-colors duration-500 ${
          isDarkMode
            ? 'bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/60'
            : 'bg-gradient-to-t from-slate-50 via-slate-50/90 to-white/70'
        }`} />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-sm transition-colors ${
            isDarkMode
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black tracking-tight font-display transition-colors ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}>
              Recover<span className="text-lime-500">AI</span>
            </span>
          </div>
        </div>

        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full border transition-all duration-200 ${
              isDarkMode
                ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
            }`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className={`w-full max-w-md p-8 sm:p-10 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all ${
          isDarkMode
            ? 'bg-slate-900/80 border-slate-800 shadow-black/40'
            : 'bg-white/90 border-slate-200/80 shadow-slate-200/50'
        }`}>

          {status === 'processing' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">Verifying Link</h2>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Validating your secure confirmation token with the RecoverAI server...
              </p>
            </div>
          )}

          {status === 'verified' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">Email Verified!</h2>
              <p className={`text-sm mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Your email address has been verified. You may now log in to access your RecoverAI workspace.
              </p>
              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-lime-400 dark:hover:bg-lime-300 dark:text-slate-950 transition-all shadow-lg hover:shadow-xl active:scale-[0.99]"
              >
                Proceed to Sign In <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">Verification Notice</h2>
              <p className={`text-sm mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {errorMessage || 'Unable to verify this link. It may have expired or already been used.'}
              </p>
              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 transition-all shadow-md"
              >
                Back to Sign In
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center">
        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          RecoverAI &bull; Autonomous AI Revenue Recovery Platform &bull; Razorpay AI Builder Track 3
        </p>
      </footer>
    </div>
  );
};
