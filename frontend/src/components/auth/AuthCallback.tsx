import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw, Sun, Moon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
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
      // 1. Check for error parameters in URL hash or query
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const error = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const type = searchParams.get('type') || hashParams.get('type');

      if (error) {
        const desc = (errorDescription || '').toLowerCase();
        let userMessage = 'Unable to verify link. Please request a new one.';
        if (desc.includes('expired') || desc.includes('otp_expired')) {
          userMessage = 'This link has expired. Request a new one.';
        } else if (desc.includes('invalid') || desc.includes('already')) {
          userMessage = 'This verification link is invalid or has already been used.';
        }
        if (isMounted) {
          setStatus('error');
          setErrorMessage(userMessage);
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // 2. Check for Password Recovery Flow
      if (type === 'recovery' || hash.includes('type=recovery')) {
        // Clean sensitive hash from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        if (isMounted) {
          onPasswordRecovery();
        }
        return;
      }

      // 3. Process Session via Supabase Auth
      if (isSupabaseConfigured) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (session?.user) {
            const isEmailConfirmed = Boolean(
              session.user.email_confirmed_at || (session.user as any).confirmed_at
            );

            if (isEmailConfirmed) {
              const admin = authStore.mapUserToAdmin(session.user, false);
              authStore.setSession({
                token: session.access_token,
                admin,
              });

              if (isMounted) {
                setStatus('verified');
              }

              // Clean URL
              window.history.replaceState({}, document.title, window.location.pathname);

              // Short delay to display the success state nicely
              setTimeout(() => {
                if (isMounted) {
                  onAuthSuccess(admin);
                }
              }, 1200);
              return;
            }
          }
        } catch (err: any) {
          console.warn('[RecoverAI] Auth Callback processing error:', err);
        }
      }

      // Fallback: listen for auth event if Supabase client is processing asynchronously
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          window.history.replaceState({}, document.title, window.location.pathname);
          onPasswordRecovery();
        } else if (session?.user) {
          const isConfirmed = Boolean(
            session.user.email_confirmed_at || (session.user as any).confirmed_at
          );
          if (isConfirmed) {
            const admin = authStore.mapUserToAdmin(session.user, false);
            authStore.setSession({
              token: session.access_token,
              admin,
            });
            setStatus('verified');
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
              if (isMounted) onAuthSuccess(admin);
            }, 1000);
          }
        }
      });

      // Timeout fallback if no session is established within 6 seconds
      const timer = setTimeout(() => {
        if (isMounted && status === 'processing') {
          setStatus('error');
          setErrorMessage('Verification session timed out. Please try signing in.');
        }
      }, 6000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-hidden font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950 text-white selection:bg-lime-300 selection:text-slate-950' : 'bg-slate-50 text-slate-900 selection:bg-lime-200 selection:text-slate-950'
    }`}>
      {/* Atmosphere */}
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

      {/* Header */}
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
              RecoverAI
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold border transition-colors ${
              isDarkMode
                ? 'bg-white/10 text-slate-300 border-white/20'
                : 'bg-slate-200/70 text-slate-700 border-slate-300'
            }`}>
              Auth Gateway
            </span>
          </div>
        </div>

        <button
          onClick={onToggleDarkMode}
          className={`p-2.5 rounded-full border transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center ${
            isDarkMode
              ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
          }`}
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </header>

      {/* Main Status Display */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-6 sm:py-8 animate-fade-up">
        <div className={`backdrop-blur-xl border rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 space-y-6 text-center ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800 shadow-black/50 text-white'
            : 'bg-white/95 border-slate-200/90 shadow-slate-900/10 text-slate-900'
        }`}>
          {status === 'processing' && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h1 className={`text-xl font-black font-display uppercase tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  Verifying Identity...
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Connecting with Supabase Auth to establish your secure admin session.
                </p>
              </div>
            </div>
          )}

          {status === 'verified' && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className={`text-xl font-black font-display uppercase tracking-tight text-emerald-500`}>
                  Email Verified Successfully
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Access confirmed. Launching RecoverAI Control Center...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-5 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-sm">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className={`text-xl font-black font-display uppercase tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-950'
                }`}>
                  Verification Issue
                </h1>
                <p className="text-xs text-rose-500 font-medium">
                  {errorMessage || 'Unable to authenticate right now. Please try again.'}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={onGoToLogin}
                  className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-slate-950 font-black text-xs shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 w-full text-center py-4 px-4 text-[11px] font-mono ${
        isDarkMode ? 'text-slate-500' : 'text-slate-600'
      }`}>
        RecoverAI &bull; Protected by Supabase Authentication
      </footer>
    </div>
  );
};
