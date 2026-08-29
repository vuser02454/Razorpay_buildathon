import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowLeft, Loader2, CheckCircle2, RefreshCw, Sun, Moon } from 'lucide-react';
import { authStore } from '../../services/authStore';

interface CheckEmailPageProps {
  email: string;
  onGoToLogin: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const CheckEmailPage: React.FC<CheckEmailPageProps> = ({
  email,
  onGoToLogin,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) {
      setError('Email address not found. Please return to registration.');
      return;
    }
    setResending(true);
    setError(null);
    setResendSuccess(false);
    try {
      await authStore.resendVerificationEmail(email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification email right now.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-hidden font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950 text-white selection:bg-lime-300 selection:text-slate-950' : 'bg-slate-50 text-slate-900 selection:bg-lime-200 selection:text-slate-950'
    }`}>
      {/* Cinematic Background */}
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
              Verification
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

      {/* Main Content Card */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-6 sm:py-8 animate-fade-up">
        <div className={`backdrop-blur-xl border rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 space-y-6 text-center ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800 shadow-black/50 text-white'
            : 'bg-white/95 border-slate-200/90 shadow-slate-900/10 text-slate-900'
        }`}>
          {/* Animated Email Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-600 dark:text-lime-400 shadow-lg animate-pulse">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold ${
              isDarkMode ? 'bg-white/10 border-white/15 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <span>Email Verification Required</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight font-display uppercase ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}>
              Check Your Email
            </h1>
            <p className={`text-xs leading-relaxed max-w-sm mx-auto ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              We have sent a secure confirmation link to <span className="font-bold text-lime-600 dark:text-lime-400">{email || 'your email'}</span>.
            </p>
          </div>

          {/* Callout Notice */}
          <div className={`p-3.5 rounded-2xl border text-xs text-left space-y-1.5 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-lime-500" />
              <span>Strict Security &amp; Tenant Isolation</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              For security, the RecoverAI Control Center and merchant payment data are protected until your email address is verified via Supabase Auth.
            </p>
          </div>

          {/* Feedback messages */}
          {resendSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>A new verification email has been sent!</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold animate-fade-in">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleResend}
              disabled={resending}
              className={`w-full py-3 rounded-xl font-bold text-xs border shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
              }`}
            >
              {resending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Resend Verification Link</span>
            </button>

            <button
              onClick={onGoToLogin}
              className="w-full py-3 rounded-xl font-black text-xs bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-slate-950 shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 w-full text-center py-4 px-4 text-[11px] font-mono ${
        isDarkMode ? 'text-slate-500' : 'text-slate-600'
      }`}>
        RecoverAI &bull; Secure Session Authentication
      </footer>
    </div>
  );
};
