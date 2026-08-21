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
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 transition-all duration-300">
      <nav
        className={`w-full max-w-7xl flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 ${
          isScrolled
            ? 'nav-pill-light shadow-2xl shadow-slate-900/10 bg-white/95 border border-slate-200/90 text-slate-900'
            : 'nav-pill bg-slate-950/70 border border-white/20 text-white'
        }`}
      >
        {/* RecoverAI Brand Logo - High Contrast (No Green Text) */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 text-left cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-105 transition shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-base sm:text-lg font-black tracking-tight font-display ${isScrolled && !isDarkMode ? 'text-slate-950' : 'text-white'}`}>
              RecoverAI
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold border ${
              admin?.is_demo
                ? (isScrolled && !isDarkMode ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-white/10 text-slate-200 border-white/20')
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
            }`}>
              {admin?.is_demo ? 'Demo Admin' : 'Admin'}
            </span>
          </div>
        </button>

        {/* Center Pill Navigation Menu */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium ${
            isScrolled && !isDarkMode
              ? 'bg-slate-100/90 text-slate-800'
              : 'bg-white/10 text-white/90 backdrop-blur-md'
          }`}
        >
          <button
            onClick={() => onNavigate('landing')}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer font-semibold ${
              activeSection === 'landing' ? (isScrolled && !isDarkMode ? 'bg-white text-slate-950 shadow-md font-bold' : 'bg-white/25 text-white font-bold') : 'hover:opacity-80'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('queue')}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer flex items-center gap-1.5 font-semibold ${
              activeSection === 'queue' ? (isScrolled && !isDarkMode ? 'bg-white text-slate-950 shadow-md font-bold' : 'bg-white/25 text-white font-bold') : 'hover:opacity-80'
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
            isScrolled && !isDarkMode ? 'bg-slate-100 text-slate-800' : 'bg-white/10 text-white'
          }`}>
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[120px] truncate">{admin?.name || 'Admin'}</span>
          </div>

          {/* Theme Toggle (Sun/Moon) */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full transition cursor-pointer ${
              isScrolled && !isDarkMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onLaunchEngine}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-slate-950 bg-lime-300 hover:bg-lime-200 rounded-full shadow-md hover:scale-102 transition cursor-pointer"
          >
            <span>Control Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`p-2 rounded-full transition cursor-pointer ${
              isScrolled && !isDarkMode ? 'bg-slate-100 text-rose-600 hover:bg-rose-50' : 'bg-white/10 text-rose-300 hover:bg-white/20'
            }`}
            title="Sign out of admin session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-20 left-4 right-4 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-3 animate-fade-up">
          <div className="pb-2 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Signed in as: <strong className="text-white">{admin?.name}</strong></span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{admin?.email}</span>
          </div>
          <button
            onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Overview
          </button>
          <button
            onClick={() => { onNavigate('queue'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Live Recovery Queue
          </button>
          <button
            onClick={() => { onNavigate('story'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Every Failed Payment Is a Decision
          </button>
          <button
            onClick={() => { onNavigate('threelayer'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            3-Layer Recovery Model
          </button>
          <button
            onClick={() => { onNavigate('policy'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Policy Gate Guardrails
          </button>
          <button
            onClick={() => { onNavigate('analytics'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Analytics &amp; Closed-Loop Learning
          </button>
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => { (onToggleDarkMode || (() => {}))(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold bg-slate-800 text-white rounded-full flex items-center justify-center gap-2"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
              <span>Toggle {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={() => { onLaunchEngine(); setMobileMenuOpen(false); }}
              className="w-full py-3 text-xs font-bold bg-lime-300 text-slate-950 rounded-full text-center shadow-lg"
            >
              Control Center
            </button>
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold bg-rose-950/60 border border-rose-600/40 text-rose-300 rounded-full text-center flex items-center justify-center gap-1.5"
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
