import React from 'react';
import {
  AlertCircle,
  Eye,
  Layers,
  TrendingUp,
  SlidersHorizontal,
  Zap,
  GraduationCap,
  ArrowRight
} from 'lucide-react';

export const CoreStorySection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'UNDERSTAND',
      subtitle: 'Context Ingestion',
      icon: Eye,
      color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      tag: 'Raw Telemetry',
      items: [
        'Bank decline code & raw gateway error message',
        'Customer subscription tenure & past success rate',
        'Saved payment method type (Card, UPI Autopay, eNACH)',
        'Historical liquidity timing & previous retry counts'
      ]
    },
    {
      step: '02',
      title: 'CLASSIFY',
      subtitle: 'Deterministic Categorization',
      icon: Layers,
      color: 'bg-blue-50 text-blue-900 border-blue-200',
      tag: '5 Decline Tiers',
      items: [
        'SOFT_DECLINE (Insufficient funds, transient load)',
        'HARD_DECLINE (Stolen card, closed account)',
        'CREDENTIAL_ISSUE (Expired card, invalid CVV)',
        'AUTHENTICATION_REQUIRED (3DS challenge timeout)',
        'RISK_LIMIT (Issuer velocity or transaction ceiling)'
      ]
    },
    {
      step: '03',
      title: 'PREDICT',
      subtitle: 'ML Probabilistic Scoring',
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-900 border-purple-200',
      tag: '0–100% Probability',
      items: [
        'Feature-weighted gradient probability calculation',
        'Customer billing reliability factor (+15% for >12mo)',
        'Bank issuer network health score (HDFC, SBI, ICICI)',
        'Confidence estimation (routes low confidence to review)'
      ]
    },
    {
      step: '04',
      title: 'DECIDE',
      subtitle: 'Policy Gate & Action',
      icon: SlidersHorizontal,
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      tag: 'Safety Guardrails',
      items: [
        'RETRY (Immediate retry for transient gateway glitch)',
        'WAIT_AND_RETRY (Optimal morning bank clearing window)',
        'CUSTOMER_ACTION_DUNNING (Expired card update)',
        'DO_NOT_RETRY (Hard decline, halt fees immediately)',
        'HUMAN_REVIEW (High-value threshold >₹10,000)'
      ]
    },
    {
      step: '05',
      title: 'ACT',
      subtitle: 'Autonomous Execution',
      icon: Zap,
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      tag: 'Razorpay Sandbox',
      items: [
        'Schedule intelligent retry at optimal minute',
        'Dispatch failure-tailored Email, SMS & WhatsApp',
        'Generate authenticated Razorpay update link',
        'Log immutable audit record to Supabase'
      ]
    },
    {
      step: '06',
      title: 'LEARN',
      subtitle: 'Closed-Loop Calibration',
      icon: GraduationCap,
      color: 'bg-lime-50 text-lime-900 border-lime-300',
      tag: 'Continuous Model',
      items: [
        'Capture payment outcome (Success vs Terminal Failure)',
        'Calibrate issuer clearing curve for time-of-month',
        'Track A/B testing uplift over naive retry control',
        'Enhance probability accuracy for the next payment'
      ]
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 bg-[#f8fafc] text-slate-900 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <span>Autonomous Intelligence Loop</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
            Every Failed Payment <br />
            Is a Decision.
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Traditional dunning treats all failures identically with blind retries. RecoverAI passes every failure through a multi-node LangGraph state machine.
          </p>
        </div>

        {/* 6 Stage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon + Step Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${s.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {s.tag}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-slate-400">
                        ({s.step})
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-950 tracking-tight">
                      {s.title}
                    </h3>
                    <div className="text-xs font-semibold text-slate-500 mb-3">
                      {s.subtitle}
                    </div>

                    <ul className="space-y-2 text-xs text-slate-600 leading-snug">
                      {s.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-slate-950 transition">
                  <span>Stage {s.step} Execution</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
