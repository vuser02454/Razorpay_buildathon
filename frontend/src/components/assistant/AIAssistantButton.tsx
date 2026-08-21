import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface AIAssistantButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ isOpen, onClick }) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-fade-up">
      <button
        onClick={onClick}
        className="group relative flex items-center gap-2.5 px-5 py-3 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-2xl border border-slate-700 dark:border-slate-300 hover:scale-105 transition-all duration-300 cursor-pointer"
        title="Open RecoverAI Assistant"
      >
        {/* Subtle Ambient Pulse Glow */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 opacity-40 blur-sm group-hover:opacity-75 transition duration-300" />
        
        <div className="relative flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-lime-300 dark:bg-slate-950 flex items-center justify-center text-slate-950 dark:text-lime-400 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-3 h-3 fill-current" />
          </div>
          <span className="font-extrabold tracking-wide font-display text-sm">
            AI Assistant
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </button>
    </div>
  );
};
