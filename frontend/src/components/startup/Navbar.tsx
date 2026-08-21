import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, ArrowRight, Compass, Sun, Moon, Layers, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onStartBuilding: () => void;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
  onOpenDashboard: () => void;
  onOpenAIArchitect: () => void;
  onOpenRecoverAI?: () => void;
  onTryDemo?: () => void;
  activeView: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onStartBuilding,
  onOpenAuth,
  onNavigateHome,
  onOpenDashboard,
  onOpenAIArchitect,
  onOpenRecoverAI,
  onTryDemo,
  activeView,
  isDarkMode = false,
  onToggleDarkMode
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        {/* Brand Logo */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-full bg-lime-300 flex items-center justify-center group-hover:scale-105 transition shadow-sm">
            <Compass className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className={`text-base sm:text-lg font-black tracking-tight ${isScrolled && !isDarkMode ? 'text-slate-900' : 'text-white'}`}>
              Startup<span className="text-lime-400 font-black">Architect</span>
            </span>
          </div>
        </button>

        {/* Center Pill Menu */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium ${
            isScrolled && !isDarkMode
              ? 'bg-slate-100/90 text-slate-800'
              : 'bg-white/10 text-white/90 backdrop-blur-md'
          }`}
        >
          <button
            onClick={onNavigateHome}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer font-semibold ${
              activeView === 'landing' ? (isScrolled && !isDarkMode ? 'bg-white text-slate-950 shadow-md font-bold' : 'bg-white/25 text-white font-bold') : 'hover:opacity-80'
            }`}
          >
            Product
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('how-it-works');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else onNavigateHome();
            }}
            className="px-3.5 py-1 rounded-full hover:opacity-80 transition cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={onOpenDashboard}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer font-semibold ${
              activeView === 'dashboard' ? (isScrolled && !isDarkMode ? 'bg-white text-slate-950 shadow-md font-bold' : 'bg-white/25 text-white font-bold') : 'hover:opacity-80'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={onOpenAIArchitect}
            className={`px-3.5 py-1 rounded-full transition cursor-pointer flex items-center gap-1.5 font-semibold ${
              activeView === 'ai_architect' ? (isScrolled && !isDarkMode ? 'bg-white text-slate-950 shadow-md font-bold' : 'bg-white/25 text-white font-bold') : 'hover:opacity-80'
            }`}
          >
            <Sparkles className="w-3 h-3 text-lime-400" />
            <span>AI Architect</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Visible Light / Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full transition cursor-pointer ${
              isScrolled && !isDarkMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Secondary Workspace Switcher: RecoverAI (Track 3) */}
          {onOpenRecoverAI && (
            <button
              onClick={onOpenRecoverAI}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                isScrolled && !isDarkMode ? 'text-slate-700 hover:text-slate-950 bg-slate-100' : 'text-slate-300 hover:text-white bg-white/10 hover:bg-white/20'
              }`}
              title="Switch to RecoverAI (Track 3)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">RecoverAI (Track 3)</span>
            </button>
          )}

          {/* Try Demo Button for Hackathon Judges */}
          <button
            onClick={onTryDemo || onStartBuilding}
            className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 shadow-md hover:scale-102 transition cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Demo</span>
          </button>

          <button
            onClick={onOpenAuth}
            className={`text-xs font-semibold px-3 py-1.5 transition cursor-pointer ${
              isScrolled && !isDarkMode ? 'text-slate-700 hover:text-slate-900' : 'text-white/90 hover:text-white'
            }`}
          >
            Login
          </button>

          <button
            onClick={onStartBuilding}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-slate-950 bg-white hover:bg-slate-100 rounded-full shadow-md hover:scale-102 transition cursor-pointer"
          >
            <span>Start Building</span>
            <ArrowRight className="w-3 h-3" />
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
          <button
            onClick={() => { onNavigateHome(); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Product Overview
          </button>
          <button
            onClick={() => { onOpenDashboard(); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            Founder Workspace
          </button>
          <button
            onClick={() => { onOpenAIArchitect(); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            AI Strategy Agents
          </button>
          {onOpenRecoverAI && (
            <button
              onClick={() => { onOpenRecoverAI(); setMobileMenuOpen(false); }}
              className="block w-full text-left py-2.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              RecoverAI (Track 3 Engine) →
            </button>
          )}
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => { (onToggleDarkMode || (() => {}))(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold bg-slate-800 text-white rounded-full flex items-center justify-center gap-2"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
              <span>Toggle {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={() => { (onTryDemo || onStartBuilding)(); setMobileMenuOpen(false); }}
              className="w-full py-3 text-xs font-bold bg-lime-300 text-slate-950 rounded-full text-center shadow-lg"
            >
              Try Judge Demo
            </button>
            <button
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold bg-slate-800 text-white rounded-full text-center"
            >
              Login
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
