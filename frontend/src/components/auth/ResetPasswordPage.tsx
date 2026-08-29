import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Sun, Moon, KeyRound } from 'lucide-react';
import { authStore } from '../../services/authStore';

interface ResetPasswordPageProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSuccess,
  onGoToLogin,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = new URLSearchParams(window.location.search).get('token') || undefined;
      await authStore.updateUserPassword(password, token);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || 'Unable to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

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
              RecoverAI
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold border transition-colors ${
              isDarkMode
                ? 'bg-white/10 text-slate-300 border-white/20'
                : 'bg-slate-200/70 text-slate-700 border-slate-300'
            }`}>
              Reset
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
        <div className={`backdrop-blur-xl border rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 space-y-6 ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800 shadow-black/50 text-white'
            : 'bg-white/95 border-slate-200/90 shadow-slate-900/10 text-slate-900'
        }`}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-lime-600 dark:text-lime-400 shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight font-display uppercase ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}>
              Set New Password
            </h1>
            <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Choose a strong password for your RecoverAI admin account.
            </p>
          </div>

          {success ? (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold">Password Updated Successfully</span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal">
                  Redirecting you to sign in...
                </p>
              </div>

              <button
                onClick={onGoToLogin}
                className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-slate-950 font-black text-xs shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold text-center animate-fade-in">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className={`block text-xs font-bold font-sans ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>New Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs transition-all duration-200 focus:outline-none ${
                      isDarkMode
                        ? 'bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:border-white focus:ring-1 focus:ring-white/30'
                        : 'bg-slate-50 border border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-xs font-bold font-sans ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>Confirm New Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs transition-all duration-200 focus:outline-none ${
                      isDarkMode
                        ? 'bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:border-white focus:ring-1 focus:ring-white/30'
                        : 'bg-slate-50 border border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-slate-950 font-black text-xs shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className={`text-xs transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
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
