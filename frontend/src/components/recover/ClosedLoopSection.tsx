import React from 'react';
import { GraduationCap, ArrowRight, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';

export const ClosedLoopSection: React.FC = () => {
  const steps = [
    { title: 'DECISION', desc: 'AI predicts 74% probability for 09:30 AM retry', color: 'bg-indigo-50 border-indigo-200 text-indigo-950' },
    { title: 'ACTION', desc: 'Gateway retries payment at designated clearing window', color: 'bg-blue-50 border-blue-200 text-blue-950' },
    { title: 'OUTCOME', desc: 'Bank issuer returns HTTP 200 / Payment Success', color: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
    { title: 'OBSERVATION', desc: 'Captured in Supabase audit table with latency & bank ID', color: 'bg-purple-50 border-purple-200 text-purple-950' },
    { title: 'CALIBRATION', desc: 'Gradient weights updated for HDFC soft declines', color: 'bg-lime-50 border-lime-300 text-lime-950' },
    { title: 'NEXT DECISION', desc: 'Future prediction confidence increases by +3.2%', color: 'bg-slate-900 border-slate-800 text-white' },
  ];

  return (
    <section className="py-24 px-4 bg-white text-slate-900 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <GraduationCap className="w-3.5 h-3.5 text-lime-400" />
            <span>Closed-Loop Telemetry</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
            Every Outcome Makes the <br />
            Next Decision Better.
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            RecoverAI is a continuous learning system, not a static rule tree. Every observed payment outcome refines issuer recovery probabilities.
          </p>
        </div>

        {/* Closed Loop Visual Stream */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between min-h-[160px] ${s.color}`}
            >
              <div>
                <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider mb-2">
                  0{idx + 1} {s.title}
                </div>
                <p className="text-xs leading-snug font-medium">
                  {s.desc}
                </p>
              </div>
              <div className="pt-2 text-[10px] font-bold opacity-70 flex items-center justify-between">
                <span>Phase 0{idx + 1}</span>
                {idx < 5 && <span>→</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Live Calibration Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Predicted vs Actual Recovery</div>
            <div className="text-2xl font-black text-slate-950 font-mono mt-1">74% → 76.2%</div>
            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">High Model Calibration</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Prediction Error</div>
            <div className="text-2xl font-black text-slate-950 font-mono mt-1">0.038</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Brier Score (Near Optimal)</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Baseline Recovery Lift</div>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">+18.4%</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Over Naive Scheduled Retries</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Unnecessary Retries Prevented</div>
            <div className="text-2xl font-black text-slate-950 font-mono mt-1">842</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Saved Merchant Penalty Fees</div>
          </div>
        </div>
      </div>
    </section>
  );
};
