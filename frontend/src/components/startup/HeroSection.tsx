import React from 'react';
import { ArrowRight, Play, Sparkles, Compass, Lightbulb, CheckCircle2, TrendingUp, Rocket, Layers, Search, DollarSign } from 'lucide-react';

interface HeroSectionProps {
  onStartBuilding: () => void;
  onExploreHowItWorks: () => void;
  onTryDemo?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartBuilding,
  onExploreHowItWorks,
  onTryDemo
}) => {
  const journeyStages = [
    { label: 'IDEA', icon: Lightbulb, color: 'text-amber-400', step: '01' },
    { label: 'VALIDATE', icon: CheckCircle2, color: 'text-emerald-400', step: '02' },
    { label: 'RESEARCH', icon: Search, color: 'text-sky-400', step: '03' },
    { label: 'STRATEGIZE', icon: Layers, color: 'text-purple-400', step: '04' },
    { label: 'BUILD', icon: DollarSign, color: 'text-lime-400', step: '05' },
    { label: 'LAUNCH', icon: Rocket, color: 'text-rose-400', step: '06' },
  ];

  return (
    <section className="relative min-h-[96vh] flex items-end justify-center px-4 pb-16 pt-36 overflow-hidden rounded-b-[3rem] bg-slate-950">
      {/* Background Cinematic Visual */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2400&q=85"
          alt="Ambitious venture founders"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out opacity-35"
        />
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-900/40" />
      </div>

      {/* Main Hero Container */}
      <div className="relative z-10 max-w-5xl mx-auto text-center text-white space-y-8 animate-fade-up">
        {/* Editorial Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-xs sm:text-sm font-semibold tracking-wide text-white shadow-xl">
          <Compass className="w-4 h-4 text-lime-400" />
          <span>Your AI Co-Founder &bull; Idea to Institutional Growth</span>
        </div>

        {/* Main Headline (Oswald Bold - Upper Case Impact) */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.03] text-white">
            BUILD YOUR STARTUP <br />
            <span className="text-lime-300 font-black">WITH INTELLIGENCE.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            From your first idea to your first customer, Startup Architect acts as your AI co-founder — helping you validate, research, strategize and execute.
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-1">
          <button
            onClick={onStartBuilding}
            className="w-full sm:w-auto px-9 py-4 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm sm:text-base transition-all duration-200 shadow-2xl hover:scale-105 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>START BUILDING</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreHowItWorks}
            className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-xl text-white font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>SEE HOW IT WORKS</span>
          </button>

          {/* Smaller Try Demo for Judges */}
          <button
            onClick={onTryDemo || onStartBuilding}
            className="w-full sm:w-auto px-5 py-4 rounded-full bg-white/5 hover:bg-white/15 border border-lime-400/40 text-lime-300 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRY DEMO</span>
          </button>
        </div>

        {/* Hero Visual Journey Track: IDEA → VALIDATE → RESEARCH → STRATEGIZE → BUILD → LAUNCH */}
        <div className="pt-6 max-w-4xl mx-auto">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/90 shadow-2xl text-left">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
              <span className="flex items-center gap-2 font-extrabold text-white">
                <Sparkles className="w-4 h-4 text-lime-400" />
                Autonomous Venture Architecture Pipeline
              </span>
              <span className="text-lime-300 font-bold text-[11px]">6 Specialized Agents</span>
            </div>

            {/* Stepper Flow Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
              {journeyStages.map((stg, idx) => {
                const Icon = stg.icon;
                return (
                  <div
                    key={stg.label}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-between min-h-[90px] group hover:border-slate-600 transition"
                  >
                    <div className="text-[10px] font-mono text-slate-500 font-bold">
                      {stg.step}
                    </div>
                    <Icon className={`w-5 h-5 ${stg.color} my-1 group-hover:scale-110 transition-transform`} />
                    <div className="text-xs font-black tracking-wide text-white">
                      {stg.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
