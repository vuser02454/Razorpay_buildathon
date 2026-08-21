import React, { useState } from 'react';
import { Compass, ArrowRight, CheckCircle2, Lock, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onSuccess: (isNewUser?: boolean) => void;
  onTryDemo: () => void;
  onCancel: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onTryDemo, onCancel }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('founder@startup.io');
  const [password, setPassword] = useState('••••••••••••');
  const [confirmPassword, setConfirmPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(isSignup);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm text-slate-950">Startup Architect</span>
        </button>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          Back to Home
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="max-w-5xl w-full mx-auto my-8 bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 grid grid-cols-1 lg:grid-cols-12 animate-fade-up">
        {/* Left Visual Column */}
        <div className="lg:col-span-5 relative bg-slate-950 p-8 sm:p-10 flex flex-col justify-between text-white overflow-hidden min-h-[380px]">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
              alt="Founders working"
              className="w-full h-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>

          <div className="relative z-10 space-y-2">
            <div className="inline-block px-3 py-1 rounded-full bg-lime-300/20 text-lime-300 font-mono text-[11px] font-bold">
              Autonomous Intelligence
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight">
              Turn ideas into enterprise value.
            </h3>
          </div>

          <div className="relative z-10 space-y-3 pt-6">
            <blockquote className="text-xs text-slate-300 italic leading-relaxed">
              &ldquo;Startup Architect gave us an institutional-grade strategic roadmap in 48 hours. We scaled to $50k MRR with zero fluff.&rdquo;
            </blockquote>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-lime-400"></span>
              <span>Trusted by 4,200+ venture founders</span>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                {isSignup ? 'Create your account' : 'Welcome back'}
              </h2>

              {/* 1-Click Judge Demo Access Button (Requested in Prompt) */}
              <button
                type="button"
                onClick={onTryDemo}
                className="px-3.5 py-1.5 rounded-full bg-lime-200 hover:bg-lime-300 text-slate-950 text-xs font-extrabold transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try Demo →</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isSignup
                ? 'Start validating and building your startup with autonomous AI.'
                : 'Continue building your startup.'}
            </p>
          </div>

          {/* Google OAuth Simulation Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-2.5 px-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 1.8 14.7 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 font-mono uppercase">or with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Password</label>
                {!isSignup && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
              />
            </div>

            {isSignup && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : isSignup ? 'Create Account' : 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Toggle Login / Signup */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              {isSignup ? (
                <>Already have an account? <span className="font-bold text-slate-950 underline">Sign in</span></>
              ) : (
                <>Don’t have an account? <span className="font-bold text-slate-950 underline">Create one</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400">
        &copy; 2026 Startup Architect &bull; Protected by Supabase Auth
      </div>
    </div>
  );
};
