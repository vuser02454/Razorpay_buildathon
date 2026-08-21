import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StartupState, DEFAULT_DEMO_STARTUP } from '../../services/startupStore';

interface AIArchitectProps {
  initialTopic?: string;
  startupData?: StartupState;
}

export const AIArchitectView: React.FC<AIArchitectProps> = ({
  initialTopic,
  startupData = DEFAULT_DEMO_STARTUP
}) => {
  const [selectedAction, setSelectedAction] = useState<string>(
    initialTopic || 'Validate my idea'
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stepIndex, setStepIndex] = useState(3);

  const startupName = startupData.startup_name || 'SupplyFlow AI';

  const actions = [
    'Validate my idea',
    'Research my market',
    'Analyze competitors',
    'Define my business model',
    'Estimate revenue',
    'Identify risks',
    'Create launch strategy'
  ];

  const agentSteps = [
    { name: 'Market Research Agent', detail: `Scraping ${startupData.target_market} TAM/SAM benchmarks for ${startupData.startup_category}...`, status: 'done' },
    { name: 'Competitor Analysis Agent', detail: `Evaluating moats against current alternative: ${startupData.current_solution || 'manual tools'}...`, status: 'done' },
    { name: 'Customer Discovery Agent', detail: `Extracting willingness-to-pay signals for ${startupData.target_customer} (${startupData.customer_segment})...`, status: 'active' },
    { name: 'Strategy & GTM Agent', detail: `Synthesizing launch playbook for ${startupData.startup_stage} stage...`, status: 'pending' },
  ];

  const handleRunAgent = () => {
    setIsExecuting(true);
    setStepIndex(0);

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= 3) {
          clearInterval(interval);
          setIsExecuting(false);
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
          return 3;
        }
        return prev + 1;
      });
    }, 750);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* Top Banner: Context-Aware AI Strategist */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-950 text-white space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-lime-400 font-mono text-xs font-bold">
          <BrainCircuit className="w-4 h-4" />
          <span>Multi-Agent LangGraph Reasoning Engine</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Startup Architect AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Welcome back. I've been thinking about <strong className="text-white">{startupName}</strong>. You've defined the problem and target customer (<strong className="text-lime-300">{startupData.customer_segment || startupData.target_customer}</strong>). The next question is whether the market is large enough and whether your current positioning is differentiated.
          </p>
        </div>

        {/* Action Selection Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {actions.map((act) => (
            <button
              key={act}
              onClick={() => { setSelectedAction(act); handleRunAgent(); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedAction === act
                  ? 'bg-lime-300 text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              <Sparkles className="w-3 h-3 text-lime-400" />
              <span>{act}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Agent Reasoning Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Multi-Agent Reasoning Trace */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Agent Reasoning Stream
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                LangGraph Active
              </span>
            </div>

            <div className="space-y-3">
              {agentSteps.map((agent, idx) => {
                const isCompleted = stepIndex > idx || (!isExecuting && stepIndex === 3);
                const isCurrent = isExecuting && stepIndex === idx;

                return (
                  <div
                    key={agent.name}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{agent.name}</span>
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-slate-500">
                        {isCompleted ? '✓ Done' : isCurrent ? '⟳ Running' : '○ Queued'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug pl-5">
                      {agent.detail}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRunAgent}
              disabled={isExecuting}
              className="w-full py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-lime-300" />}
              <span>{isExecuting ? 'Synthesizing with Agents...' : 'Re-Run Strategic Synthesis'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Generated Strategic Deliverable */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Synthesized Deliverable</span>
                <h2 className="text-base font-extrabold text-slate-950">
                  {selectedAction} — Strategic Synthesis
                </h2>
              </div>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Structured Content Preview tailored to user data */}
            <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
              {/* Executive Assessment Box */}
              <div className="p-4 rounded-2xl bg-[#d9f99d]/30 border border-lime-300 text-slate-950 space-y-1">
                <div className="font-bold text-xs uppercase tracking-wide text-slate-900">
                  Executive Assessment &bull; 92% Conviction
                </div>
                <p className="text-[11px] text-slate-800">
                  {startupName} directly addresses high-friction pain for <strong>{startupData.customer_segment || startupData.target_customer}</strong> in <strong>{startupData.target_market}</strong>. Current alternative ({startupData.current_solution || 'manual spreadsheets'}) leaves an estimated 12% revenue margin leakage.
                </p>
              </div>

              {/* Grid of Key Pillars */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-[11px] text-slate-900">Addressable Market TAM</div>
                  <div className="text-lg font-extrabold text-slate-950 font-mono">$4.2 Billion</div>
                  <div className="text-[10px] text-slate-500">14,200 mid-market enterprises in {startupData.target_market}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-[11px] text-slate-900">Target Payback Period</div>
                  <div className="text-lg font-extrabold text-emerald-600 font-mono">4.8 Months</div>
                  <div className="text-[10px] text-slate-500">Projected ACV: $18,000 / year</div>
                </div>
              </div>

              {/* Strategic Moats */}
              <div className="space-y-2">
                <div className="font-bold text-xs text-slate-900">Defensibility & Moat Recommendations</div>
                <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside">
                  <li><strong>Data Network Effect:</strong> Ingest proprietary supplier telemetry to predict delivery lead times.</li>
                  <li><strong>Workflow Stickiness:</strong> Integrate directly into automated recurring invoice capture & billing reconciliations.</li>
                  <li><strong>Revenue Protection:</strong> Pair with RecoverAI autonomous recovery engine once subscription revenue starts flowing.</li>
                </ul>
              </div>

              {/* Recommended Immediate Sprint */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="text-xs font-bold text-lime-400">Recommended 7-Day Sprint</div>
                <p className="text-[11px] text-slate-300">
                  Conduct 10 structured customer discovery interviews with operations leads matching your ICP. Validate willingness-to-pay before writing code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
