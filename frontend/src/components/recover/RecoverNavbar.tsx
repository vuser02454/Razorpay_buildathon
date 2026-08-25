import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Sparkles, Activity, Menu, X, ArrowRight, Sun, Moon, Lock, LogOut, User } from 'lucide-react';
import { authStore, AdminProfile } from '../../services/authStore';

interface RecoverNavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onLaunchEngine: () => void;
  onLogout: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const RecoverNavbar: React.FC<RecoverNavbarProps> = ({
  activeSection,
  onNavigate,
  onLaunchEngine,
  onLogout,
  isDarkMode = false,
  onToggleDarkMode
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const admin = authStore.getAdmin();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 sm:px-4 pt-3 sm:pt-4 transition-all duration-300">
      <nav
        className={`w-full max-w-7xl flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 ${
          isScrolled
            ? (isDarkMode
                ? 'bg-slate-950/90 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/40 text-white'
                : 'bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-900/5 text-slate-900')
            : (isDarkMode
                ? 'bg-slate-950/70 backdrop-blur-md border border-white/15 text-white'
                : 'bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-900 shadow-sm')
        }`}
      >
        {/* RecoverAI Brand Logo */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left cursor-pointer group select-none active:scale-95 transition-transform duration-150"
        >
          <div className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center border transition-all duration-200 ${
            isDarkMode
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-slate-100 border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <ShieldCheck className="w-4 sm:w-5 h-4 sm:h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-base sm:text-lg font-black tracking-tight font-display transition-colors ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}>
              RecoverAI
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold border transition-colors ${
              admin?.is_demo
                ? (isDarkMode ? 'bg-white/10 text-slate-200 border-white/20' : 'bg-slate-100 text-slate-800 border-slate-300')
                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-400/30'
            }`}>
              {admin?.is_demo ? 'Demo Admin' : 'Admin'}
            </span>
          </div>
        </button>

        {/* Center Pill Navigation Menu */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium ${
            isDarkMode
              ? 'bg-white/10 text-white/90 backdrop-blur-md'
              : 'bg-slate-100/90 text-slate-800'
          }`}
        >
          <button
            onClick={() => onNavigate('landing')}
            className={`px-3.5 py-1 rounded-full transition-all duration-150 cursor-pointer font-semibold ${
              activeSection === 'landing' ? (isDarkMode ? 'bg-white/25 text-white font-bold' : 'bg-white text-slate-950 shadow-sm font-bold') : 'hover:opacity-80'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('queue')}
            className={`px-3.5 py-1 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1.5 font-semibold ${
              activeSection === 'queue' ? (isDarkMode ? 'bg-white/25 text-white font-bold' : 'bg-white text-slate-950 shadow-sm font-bold') : 'hover:opacity-80'
            }`}
          >
            <span>Recovery Queue</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            onClick={() => onNavigate('story')}
            className="px-3.5 py-1 rounded-full hover:opacity-80 transition cursor-pointer"
          >
            Decision Loop
          </button>
          <button
            onClick={() => onNavigate('threelayer')}
            className="px-3.5 py-1 rounded-full hover:opacity-80 transition cursor-pointer"
          >
            3-Layer Model
          </button>
          <button
            onClick={() => onNavigate('policy')}
            className="px-3.5 py-1 rounded-full hover:opacity-80 transition cursor-pointer"
          >
            Policy Gate
          </button>
          <button
            onClick={() => onNavigate('dunning')}
            className="px-3.5 py-1 rounded-full hover:opacity-80 transition cursor-pointer"
          >
            Dunning
          </button>
          <button
            onClick={() => onNavigate('analytics')}
            className="px-3.5 py-1 rounded-full hover:opacity-80 transition cursor-pointer"
          >
            Analytics &amp; Learning
          </button>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* User Profile Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'
          }`}>
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[120px] truncate">{admin?.name || 'Admin'}</span>
          </div>

          {/* Theme Toggle (Sun/Moon) */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full transition-all duration-150 active:scale-95 cursor-pointer ${
              isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onLaunchEngine}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-slate-950 bg-lime-400 hover:bg-lime-300 active:scale-95 rounded-full shadow-md transition-all duration-150 cursor-pointer"
          >
            <span>Control Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`p-2 rounded-full transition-all duration-150 active:scale-95 cursor-pointer ${
              isDarkMode ? 'bg-white/10 text-rose-300 hover:bg-white/20' : 'bg-slate-100 text-rose-600 hover:bg-rose-50'
            }`}
            title="Sign out of admin session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Menu Button & Quick Theme Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full border transition-all duration-150 active:scale-95 ${
              isDarkMode ? 'bg-white/10 border-white/15 text-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Toggle theme"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-xl transition-colors ${
              isDarkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden fixed top-18 left-3 right-3 backdrop-blur-xl border rounded-3xl p-5 shadow-2xl space-y-2 animate-fade-up z-50 transition-all duration-200 ${
          isDarkMode
            ? 'bg-slate-900/95 border-slate-800 text-white shadow-black/60'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-900/15'
        }`}>
          <div className={`pb-3 border-b text-xs flex items-center justify-between ${
            isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Signed in: <strong className={isDarkMode ? 'text-white' : 'text-slate-950'}>{admin?.name}</strong></span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
              isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}>{admin?.email}</span>
          </div>

          <button
            onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => { onNavigate('queue'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition flex items-center justify-between ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span>Live Recovery Queue</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            onClick={() => { onNavigate('story'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            Decision Loop
          </button>
          <button
            onClick={() => { onNavigate('threelayer'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            3-Layer Recovery Model
          </button>
          <button
            onClick={() => { onNavigate('policy'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            Policy Gate Guardrails
          </button>
          <button
            onClick={() => { onNavigate('dunning'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            Dunning Center
          </button>
          <button
            onClick={() => { onNavigate('analytics'); setMobileMenuOpen(false); }}
            className={`block w-full text-left py-2 px-3 rounded-xl text-sm font-semibold transition ${
              isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            Analytics &amp; Closed-Loop
          </button>

          <div className={`pt-3 border-t flex flex-col gap-2 ${
            isDarkMode ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <button
              onClick={() => { (onToggleDarkMode || (() => {}))(); }}
              className={`w-full py-2.5 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition active:scale-95 ${
                isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
              <span>Switch to {isDarkMode ? 'Light' : 'Dark'} Mode</span>
            </button>
            <button
              onClick={() => { onLaunchEngine(); setMobileMenuOpen(false); }}
              className="w-full py-3 text-xs font-black bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-full text-center shadow-md active:scale-95 transition"
            >
              Open Control Center
            </button>
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className={`w-full py-2.5 text-xs font-bold rounded-full text-center flex items-center justify-center gap-1.5 transition active:scale-95 ${
                isDarkMode
                  ? 'bg-rose-950/60 border border-rose-600/40 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
