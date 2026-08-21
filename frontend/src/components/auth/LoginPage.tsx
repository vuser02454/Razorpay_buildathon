import React, { useState } from 'react';
import { ShieldCheck, Sparkles, ArrowRight, Lock, Mail, Loader2, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { authStore, AdminProfile } from '../../services/authStore';

interface LoginPageProps {
  onSuccess: (admin: AdminProfile) => void;
  onGoToSignup: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onGoToSignup,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const admin = await authStore.login(email, password);
      onSuccess(admin);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const admin = await authStore.loginDemo();
      onSuccess(admin);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white relative overflow-hidden selection:bg-lime-300 selection:text-slate-950 font-sans">
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2400&q=85"
          alt="Atmospheric finance operations"
          className="w-full h-full object-cover object-center scale-105 opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/60" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight font-display text-white">
              RecoverAI
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-extrabold border border-white/20">
              Track 3
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </header>

      {/* Main Login Card Center */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8 animate-fade-up">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Header Typography */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono font-bold text-slate-300">
              <span>Admin Authentication Gate</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display uppercase">
              Recover Revenue. Intelligently.
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              AI-powered payment recovery, built for safer decisions.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {/* 1-Click Judge Demo Login */}
          <div className="space-y-2">
            <button
              onClick={handleDemoSignIn}
              disabled={demoLoading || loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm transition shadow-lg hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
            >
              {demoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Sparkles className="w-4 h-4 fill-slate-950" />
              )}
              <span>Continue with Demo Account</span>
            </button>
            <div className="text-[10px] text-center text-slate-500 font-mono">
              Pre-populated with realistic recovery queue, LangGraph traces, &amp; metrics
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">Or sign in with email</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 font-sans">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 font-sans">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="pt-2 text-center">
            <button
              onClick={onGoToSignup}
              className="text-xs text-slate-400 hover:text-white font-medium transition cursor-pointer"
            >
              Don't have an account? <span className="text-white font-bold underline">Create Admin Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-[11px] font-mono text-slate-500">
        RecoverAI &bull; Razorpay AI Builder Internship 2026 &bull; Strict Tenant Data Isolation
      </footer>
    </div>
  );
};
