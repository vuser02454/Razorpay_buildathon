import React from 'react';
import { ArrowRight, ShieldCheck, Play, Sparkles, CheckCircle2, AlertTriangle, Clock, RefreshCw, Zap } from 'lucide-react';

interface RecoverHeroProps {
  onLaunchEngine: () => void;
  onExploreHowItWorks: () => void;
  onTryDemo: () => void;
}

export const RecoverHero: React.FC<RecoverHeroProps> = ({
  onLaunchEngine,
  onExploreHowItWorks,
  onTryDemo
}) => {
  return (
    <section className="relative min-h-[96vh] flex items-end justify-center px-4 pb-16 pt-36 overflow-hidden rounded-b-[3rem] bg-slate-950">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2400&q=85"
          alt="Financial operations intelligence"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto text-center text-white space-y-8 animate-fade-up">
        {/* Editorial Pill Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-xs sm:text-sm font-semibold tracking-wide text-white shadow-xl">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span>Razorpay AI Builder Internship 2026 &bull; Track 3: AI Revenue Recovery</span>
        </div>

        {/* Large Editorial Headline with "RecoverAI" at Middle then Quote (Requested by User) */}
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white uppercase font-display leading-[0.95]">
            RecoverAI
          </h1>
          
          <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight font-display">
            “Recover revenue intelligently. Not blindly.”
          </div>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed pt-1">
            Turn failed subscription payments into intelligent recovery decisions with AI-powered payment triage, policy-controlled retries, and closed-loop learning.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-1">
          <button
            onClick={onLaunchEngine}
            className="w-full sm:w-auto px-9 py-4 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm sm:text-base transition-all duration-200 shadow-2xl hover:scale-105 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>LAUNCH RECOVERY ENGINE</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onTryDemo}
            className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>TRY DEMO</span>
          </button>

          <button
            onClick={onExploreHowItWorks}
            className="w-full sm:w-auto px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl text-white font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>SEE HOW IT WORKS</span>
          </button>
        </div>

        {/* Live Payment-Recovery Lifecycle Visualization Bar */}
        <div className="pt-6 max-w-4xl mx-auto">
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/90 shadow-2xl text-left">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">
              <span className="flex items-center gap-2 font-extrabold text-white text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-lime-400" />
                Live Payment Recovery Stream
              </span>
              <span className="text-white font-extrabold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Active Sandbox
              </span>
            </div>

            {/* Stepper Flow Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
              <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-700/50 shadow-inner">
                <div className="text-[10px] text-rose-400 font-mono font-bold">01 FAILED</div>
                <div className="text-base font-black text-white font-mono mt-1">₹2,000</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">Insufficient Funds</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-700/50 shadow-inner">
                <div className="text-[10px] text-indigo-400 font-mono font-bold">02 AI TRIAGE</div>
                <div className="text-xs sm:text-sm font-extrabold text-white mt-1">LangGraph</div>
                <div className="text-[10px] text-slate-400 mt-0.5">7 Node Audit</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/50 border border-blue-700/50 shadow-inner">
                <div className="text-[10px] text-blue-400 font-mono font-bold">03 CLASSIFY</div>
                <div className="text-xs sm:text-sm font-extrabold text-blue-200 mt-1">SOFT DECLINE</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Non-stolen card</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-700/50 shadow-inner">
                <div className="text-[10px] text-purple-400 font-mono font-bold">04 PREDICT</div>
                <div className="text-base font-black text-purple-200 font-mono mt-1">74%</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Recovery Prob.</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-700/50 shadow-inner">
                <div className="text-[10px] text-amber-400 font-mono font-bold">05 WINDOW</div>
                <div className="text-xs sm:text-sm font-extrabold text-amber-200 mt-1">09:30 AM</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Optimal Retry</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 shadow-xl shadow-emerald-500/10">
                <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  RECOVERED
                </div>
                <div className="text-base font-black text-emerald-300 font-mono mt-1">+₹2,000</div>
                <div className="text-[10px] text-emerald-400/90 mt-0.5">Closed Loop OK</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
