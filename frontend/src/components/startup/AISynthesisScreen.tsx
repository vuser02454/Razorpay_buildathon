import React, { useState, useEffect } from 'react';
import { BrainCircuit, CheckCircle2, Loader2, Circle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StartupState } from '../../services/startupStore';

interface AISynthesisScreenProps {
  startupData: StartupState;
  onFinished: () => void;
}

export const AISynthesisScreen: React.FC<AISynthesisScreenProps> = ({
  startupData,
  onFinished
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Understanding your idea', detail: `Parsing ${startupData.startup_category} core hypothesis...` },
    { label: 'Identifying your target customer', detail: `Mapping ICP: ${startupData.target_customer} (${startupData.customer_segment})...` },
    { label: 'Structuring the problem', detail: 'Decomposing pain points & current alternative costs...' },
    { label: 'Analyzing your market', detail: `Evaluating TAM & growth vectors in ${startupData.target_market}...` },
    { label: 'Mapping competitors', detail: 'Extracting defensibility moats against direct & indirect alternatives...' },
    { label: 'Building your initial strategy', detail: 'Assembling unit economics, pricing model & GTM outreach...' },
    { label: 'Calculating startup health', detail: 'Synthesizing multi-factor conviction score (78/100)...' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(timer);
          confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
          setTimeout(() => {
            onFinished();
          }, 800);
          return steps.length - 1;
        }
        return prev + 1;
      });
    }, 700);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center p-6 sm:p-12 font-sans">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-200/80 space-y-8 animate-fade-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 text-white font-mono text-[11px] font-bold">
            <BrainCircuit className="w-3.5 h-3.5 text-lime-400" />
            <span>Multi-Agent LangGraph Workflow</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            Building your startup workspace...
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Startup Architect is turning your answers into a strategic starting point for <strong className="text-slate-900">{startupData.startup_name}</strong>.
          </p>
        </div>

        {/* Animated LangGraph Execution Timeline */}
        <div className="space-y-3 pt-2 font-sans">
          {steps.map((s, idx) => {
            const isDone = activeStep > idx;
            const isCurrent = activeStep === idx;
            const isQueued = activeStep < idx;

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                  isCurrent
                    ? 'bg-lime-50/80 border-lime-400 shadow-sm scale-[1.01]'
                    : isDone
                    ? 'bg-slate-50/80 border-slate-200'
                    : 'bg-white border-slate-100 opacity-40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{s.label}</div>
                    {isCurrent && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 animate-pulse">
                        {s.detail}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono font-bold">
                  {isDone ? (
                    <span className="text-emerald-700 font-extrabold">✓ Complete</span>
                  ) : isCurrent ? (
                    <span className="text-lime-700 font-extrabold">⟳ Processing</span>
                  ) : (
                    <span className="text-slate-300">○ Queued</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom progress footer */}
        <div className="text-center pt-2">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-slate-950 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round(((activeStep + 1) / steps.length) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2 block">
            Synthesizing intelligence telemetry &bull; {Math.round(((activeStep + 1) / steps.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
