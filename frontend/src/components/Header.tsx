import React from 'react';
import { ShieldCheck, Zap, RefreshCw, Layers, Sparkles, Activity } from 'lucide-react';

interface HeaderProps {
  onOpenSimulation: () => void;
  onResetDemo: () => void;
  onOpenOnboarding: () => void;
  isDemoMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSimulation,
  onResetDemo,
  onOpenOnboarding,
  isDemoMode
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 glass-panel border-b border-slate-800/80">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              Recover<span className="text-indigo-400">AI</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/30">
              Track 3 • AI Revenue Recovery
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Autonomous Policy-Controlled Payment Recovery Engine
          </p>
        </div>
      </div>

      {/* Global Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Environment Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-slate-200">
            {isDemoMode ? 'Demo Sandbox' : 'Razorpay Production'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">| LangGraph v1.2</span>
        </div>

        {/* Re-calibrate Wizard */}
        <button
          onClick={onOpenOnboarding}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
          title="Open Onboarding & AI Calibration Wizard"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Calibration Wizard
        </button>

        {/* Simulate Failure Button */}
        <button
          onClick={onOpenSimulation}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-md shadow-indigo-600/25 transition cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5" />
          Simulate Failure
        </button>

        {/* Reset Demo Data */}
        <button
          onClick={onResetDemo}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition cursor-pointer"
          title="Reset dataset to baseline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Demo
        </button>
      </div>
    </header>
  );
};
