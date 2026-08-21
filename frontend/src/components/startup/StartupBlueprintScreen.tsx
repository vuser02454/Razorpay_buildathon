import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, Compass } from 'lucide-react';
import { StartupState } from '../../services/startupStore';

interface StartupBlueprintScreenProps {
  startupData: StartupState;
  onEnterWorkspace: () => void;
}

export const StartupBlueprintScreen: React.FC<StartupBlueprintScreenProps> = ({
  startupData,
  onEnterWorkspace
}) => {
  const breakdown = startupData.health_breakdown || {
    problem_clarity: 88,
    market_potential: 82,
    customer_definition: 75,
    differentiation: 72,
    business_readiness: 73
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-6 sm:p-12 font-sans">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm text-slate-950">Startup Architect</span>
        </div>

        <button
          onClick={onEnterWorkspace}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Blueprint Modal Container */}
      <div className="max-w-3xl w-full mx-auto my-8 bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-200/80 space-y-8 animate-fade-up">
        {/* Top Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-100 text-slate-900 font-mono text-[11px] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-lime-600" />
              <span>AI Initial Assessment</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              {startupData.startup_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {startupData.startup_idea}
            </p>
          </div>

          {/* Health Score Gauge (78/100) */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 self-start sm:self-auto shrink-0">
            <div className="text-center font-mono">
              <div className="text-3xl font-black text-slate-950">{startupData.health_score || 78}</div>
              <div className="text-[9px] font-bold text-slate-400">/ 100</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-950">Health Score</div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> High Conviction
              </div>
            </div>
          </div>
        </div>

        {/* Startup Dimensions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Target Customer</span>
            <div className="font-extrabold text-slate-950">{startupData.target_customer}</div>
            <div className="text-[11px] text-slate-600">{startupData.customer_segment}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Market Corridor</span>
            <div className="font-extrabold text-slate-950">{startupData.target_market}</div>
            <div className="text-[11px] text-slate-600">{startupData.startup_category}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Current Stage</span>
            <div className="font-extrabold text-slate-950">{startupData.startup_stage}</div>
            <div className="text-[11px] text-slate-600">{startupData.goals?.length || 6} Goals Configured</div>
          </div>
        </div>

        {/* Health Score Breakdown Progress Bars */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
              Dimension Conviction Breakdown
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">AI Synthesized Assessment</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Problem Clarity</span>
                <span className="font-mono text-slate-950 font-bold">{breakdown.problem_clarity}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${breakdown.problem_clarity}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Market Potential</span>
                <span className="font-mono text-slate-950 font-bold">{breakdown.market_potential}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${breakdown.market_potential}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Customer Definition</span>
                <span className="font-mono text-slate-950 font-bold">{breakdown.customer_definition}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${breakdown.customer_definition}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Differentiation & Moats</span>
                <span className="font-mono text-slate-950 font-bold">{breakdown.differentiation}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${breakdown.differentiation}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Business Readiness</span>
                <span className="font-mono text-slate-950 font-bold">{breakdown.business_readiness}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-lime-500 h-full rounded-full" style={{ width: `${breakdown.business_readiness}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button to Enter Workspace */}
        <button
          onClick={onEnterWorkspace}
          className="w-full py-3.5 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-extrabold text-xs shadow-xl transition hover:scale-101 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Enter Startup Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center text-[11px] text-slate-400">
        &copy; 2026 Startup Architect &bull; Initial Strategic Assessment
      </div>
    </div>
  );
};
