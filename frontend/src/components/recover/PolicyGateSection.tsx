import React from 'react';
import { ShieldAlert, ShieldCheck, XCircle, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

export const PolicyGateSection: React.FC = () => {
  const policies = [
    {
      scenario: 'INSUFFICIENT FUNDS',
      declineCode: 'insufficient_funds',
      status: 'allowed',
      title: '✓ RETRY ELIGIBLE',
      reason: 'Transient soft decline. Customer history exhibits 95% recovery rate during morning salary clearing window.',
      action: 'Scheduled for Tomorrow 09:30 AM Slot',
      color: 'bg-emerald-50 border-emerald-300 text-emerald-950',
      badge: 'bg-emerald-600 text-white'
    },
    {
      scenario: 'EXPIRED CARD CREDENTIAL',
      declineCode: 'card_expired',
      status: 'blocked',
      title: '✕ RETRY BLOCKED',
      reason: 'Saved card credential date passed. Retrying same token is guaranteed to fail. Customer action required.',
      action: 'Automated Dunning Dispatched with Update Link',
      color: 'bg-amber-50 border-amber-300 text-amber-950',
      badge: 'bg-amber-600 text-white'
    },
    {
      scenario: 'STOLEN / LOST CARD',
      declineCode: 'card_stolen_or_lost',
      status: 'blocked',
      title: '✕ RETRY BLOCKED',
      reason: 'Hard decline signal. Further automated retries violate Visa/Mastercard rules and incur penalty decline fees.',
      action: 'Account Locked & Direct Fraud Escalation',
      color: 'bg-rose-50 border-rose-300 text-rose-950',
      badge: 'bg-rose-600 text-white'
    },
    {
      scenario: 'HIGH-VALUE INVOICE > ₹10,000',
      declineCode: 'high_amount_threshold',
      status: 'review',
      title: '⚠ HUMAN REVIEW',
      reason: 'Invoice amount exceeds configured merchant autonomous recovery ceiling (₹10,000). Operator approval required.',
      action: 'Queued in Merchant Operator Review Center',
      color: 'bg-purple-50 border-purple-300 text-purple-950',
      badge: 'bg-purple-600 text-white'
    }
  ];

  return (
    <section id="policy" className="py-24 px-4 bg-white text-slate-900 border-t border-slate-200/80 transition-colors">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <Lock className="w-3.5 h-3.5 text-lime-400" />
            <span>Deterministic Guardrails</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 uppercase">
            AI Autonomy. Human Control.
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            AI recommends decisions, but deterministic policy gates guarantee financial safety. Hard stops prevent illegal retries, runaway merchant fees, and customer friction.
          </p>
        </div>

        {/* 4 Guardrail Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((p, idx) => (
            <div
              key={idx}
              className={`p-7 rounded-3xl border shadow-sm space-y-4 ${p.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900/10 text-slate-800">
                  {p.scenario}
                </span>
                <span className={`text-xs font-mono font-black px-3 py-1 rounded-full shadow-sm ${p.badge}`}>
                  {p.title}
                </span>
              </div>

              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">Code: {p.declineCode}</div>
                <p className="text-xs leading-relaxed font-medium">
                  {p.reason}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-900/10 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Deterministic Enforcement:</span>
                <span className="text-slate-950 font-mono">{p.action}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Compliance Box */}
        <div className="p-6 rounded-3xl bg-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Card Scheme &amp; RBI Recurring Mandate Compliant</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Full compliance with Visa/Mastercard retry limits, eNACH/UPI Autopay cooling periods, and tokenization requirements.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono px-4 py-2 rounded-full bg-white/10 text-lime-300 font-bold whitespace-nowrap">
            Zero Unsafe Retries
          </div>
        </div>
      </div>
    </section>
  );
};
