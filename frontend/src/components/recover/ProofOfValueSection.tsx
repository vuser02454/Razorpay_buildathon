import React from 'react';
import { SplitSquareVertical, CheckCircle2, TrendingUp, Sparkles, BarChart2 } from 'lucide-react';

export const ProofOfValueSection: React.FC = () => {
  return (
    <section id="proof-of-value" className="py-24 px-4 bg-[#f8fafc] text-slate-900 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <SplitSquareVertical className="w-3.5 h-3.5 text-lime-400" />
            <span>Rigorous Randomized Evaluation</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
            Prove Recovery Lift. <br />
            Don't Assume It.
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            RecoverAI runs an autonomous 50/50 A/B testing harness comparing naive blind retries against our policy-controlled AI agent.
          </p>
        </div>

        {/* Uplift Hero Split Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Control Group */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">Control Group</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">Naive Retry</span>
            </div>
            <div className="text-4xl font-extrabold text-slate-900 font-mono">38.2%</div>
            <div className="text-xs text-slate-600">Recovery Rate &bull; 160 payments</div>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div>Recovered: <strong className="text-slate-800">₹3.20 Lakh</strong></div>
              <div>Strategy: Blind fixed 24h retry &times; 3</div>
            </div>
          </div>

          {/* Treatment Group */}
          <div className="p-7 rounded-3xl bg-slate-950 text-white shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-lime-400 uppercase">Treatment Group</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">RecoverAI Engine</span>
            </div>
            <div className="text-4xl font-extrabold text-lime-300 font-mono">70.2%</div>
            <div className="text-xs text-slate-300">Recovery Rate &bull; 160 payments</div>
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
              <div>Recovered: <strong className="text-white">₹5.89 Lakh</strong></div>
              <div>Strategy: ML triage + safety gate + 09:30 AM window</div>
            </div>
          </div>

          {/* Incremental Uplift */}
          <div className="p-7 rounded-3xl bg-[#d9f99d] text-slate-950 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-800 uppercase">Net Incremental Lift</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-lime-300 font-bold">Statistically Significant</span>
              </div>
              <div className="text-4xl font-extrabold text-slate-950 font-mono mt-1">+24.9%</div>
              <div className="text-xs text-slate-800 font-semibold mt-1">Incremental Revenue: +₹2.69 Lakh</div>
            </div>

            <div className="pt-3 border-t border-slate-900/10 text-xs text-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                <span>p &lt; 0.01 &bull; 95% Confidence</span>
              </div>
              <div className="text-[11px] text-slate-700">Two-proportion Z-test verification</div>
            </div>
          </div>
        </div>

        {/* Demo Simulation Label Notice (Requested in prompt) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span><strong>Live Sandbox Experiment:</strong> Sample size: 320 transactions across 105 seeded subscription businesses.</span>
          </div>
          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            Demo Simulation &amp; Experiment Suite
          </span>
        </div>
      </div>
    </section>
  );
};
