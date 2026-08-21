import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  Activity,
  Layers
} from 'lucide-react';
import { DashboardKPIs } from '../types';

interface KPIBannerProps {
  kpis: DashboardKPIs | null;
}

export const KPIBanner: React.FC<KPIBannerProps> = ({ kpis }) => {
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 bg-slate-900 rounded-2xl border border-slate-800" />
        ))}
      </div>
    );
  }

  const sym = kpis.currency_symbol || '₹';

  const cards = [
    {
      title: 'Revenue at Risk',
      value: `${sym}${(kpis.revenue_at_risk / 100000).toFixed(2)}L`,
      subtitle: `${kpis.failed_payments_count} Active Failed Invoices`,
      icon: AlertTriangle,
      glow: 'glow-amber',
      accentColor: 'text-amber-400',
      bgColor: 'from-amber-950/30 to-slate-900/60',
      borderColor: 'border-amber-500/20'
    },
    {
      title: 'Recovered Revenue',
      value: `${sym}${(kpis.recovered_revenue / 100000).toFixed(2)}L`,
      subtitle: '+₹52.4K in last 24 hours',
      icon: CheckCircle2,
      glow: 'glow-emerald',
      accentColor: 'text-emerald-400',
      bgColor: 'from-emerald-950/30 to-slate-900/60',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Recovery Rate',
      value: `${kpis.recovery_rate}%`,
      subtitle: '+24.9% vs Naive Baseline',
      icon: TrendingUp,
      glow: 'glow-indigo',
      accentColor: 'text-indigo-400',
      bgColor: 'from-indigo-950/30 to-slate-900/60',
      borderColor: 'border-indigo-500/20'
    },
    {
      title: 'Failed Invoices',
      value: kpis.failed_payments_count.toString(),
      subtitle: 'Soft & Hard Triage Active',
      icon: Activity,
      glow: '',
      accentColor: 'text-rose-400',
      bgColor: 'from-rose-950/30 to-slate-900/60',
      borderColor: 'border-rose-500/20'
    },
    {
      title: 'Active Workflows',
      value: kpis.active_workflows_count.toString(),
      subtitle: 'Scheduled Retries & Dunning',
      icon: Layers,
      glow: '',
      accentColor: 'text-purple-400',
      bgColor: 'from-purple-950/30 to-slate-900/60',
      borderColor: 'border-purple-500/20'
    },
    {
      title: 'AI Decision Actions',
      value: kpis.ai_recommended_recoveries.toString(),
      subtitle: '100% Policy Compliant',
      icon: BrainCircuit,
      glow: 'glow-indigo',
      accentColor: 'text-cyan-400',
      bgColor: 'from-cyan-950/30 to-slate-900/60',
      borderColor: 'border-cyan-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl glass-panel bg-gradient-to-b ${c.bgColor} border ${c.borderColor} ${c.glow} flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg bg-slate-950/60 ${c.accentColor}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3">
              <div className={`text-2xl font-bold tracking-tight text-white font-mono`}>
                {c.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                <span>{c.subtitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
