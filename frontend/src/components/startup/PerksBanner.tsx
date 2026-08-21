import React from 'react';
import { Zap, Sparkles } from 'lucide-react';

export const PerksBanner: React.FC = () => {
  return (
    <section className="px-4 py-8 max-w-6xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden min-h-[300px] flex items-center p-8 sm:p-12 text-white">
        {/* Panoramic Imagery Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2000&q=80"
            alt="Founders building in workspace"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-900/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg space-y-4">
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Early Adopter <br />
            Perks
          </h3>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-mono font-bold text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime-400 fill-lime-400" />
              <span>2x</span>
            </div>
            <span className="text-xs text-slate-200 font-medium">
              Register during our initial phase to receive double AI compute credits for your first 3 months.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
