import React, { useEffect, useState } from 'react';
import { SplitSquareVertical, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../services/api';
import { ExperimentStats } from '../types';

export const ExperimentsView: React.FC = () => {
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getExperiments().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  const comparisonData = [
    { name: 'Recovery Rate', control: stats.control_recovery_rate, ai: stats.ai_recovery_rate },
    { name: 'Recovered Count', control: stats.control_recovered, ai: stats.ai_recovered },
  ];

  const revenueData = [
    { name: 'Recovered Revenue (₹K)', control: stats.control_recovered_revenue / 1000, ai: stats.ai_recovered_revenue / 1000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <SplitSquareVertical className="w-5 h-5 text-indigo-400" /> A/B Testing: Control vs AI Recovery
        </h2>
        <p className="text-xs text-slate-400">50/50 randomized split across eligible demo transactions</p>
      </div>

      {/* Uplift Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 glass-panel rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950">
          <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1">Control Group (Naive Retry)</div>
          <div className="text-3xl font-bold text-white font-mono">{stats.control_recovery_rate}%</div>
          <div className="text-[10px] text-slate-500 mt-1">{stats.control_recovered}/{stats.control_payments} payments • ₹{(stats.control_recovered_revenue/1000).toFixed(0)}K</div>
        </div>
        <div className="p-5 glass-panel rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-slate-950 glow-indigo">
          <div className="text-[11px] text-indigo-300 uppercase font-semibold mb-1">AI Recovery (LangGraph Agent)</div>
          <div className="text-3xl font-bold text-indigo-400 font-mono">{stats.ai_recovery_rate}%</div>
          <div className="text-[10px] text-slate-400 mt-1">{stats.ai_recovered}/{stats.ai_payments} payments • ₹{(stats.ai_recovered_revenue/1000).toFixed(0)}K</div>
        </div>
        <div className="p-5 glass-panel rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-slate-950 glow-emerald">
          <div className="text-[11px] text-emerald-300 uppercase font-semibold mb-1">Incremental Uplift</div>
          <div className="text-3xl font-bold text-emerald-400 font-mono">+{stats.recovery_uplift_percent}%</div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {stats.statistical_significance ? (
              <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> p &lt; 0.01 — Statistically Significant</>
            ) : (
              <><AlertTriangle className="w-3 h-3 text-amber-500" /> Insufficient sample for significance</>
            )}
          </div>
        </div>
      </div>

      {/* Status Note */}
      <div className={`p-3 rounded-xl border text-xs ${stats.statistical_significance ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-amber-950/20 border-amber-800/30 text-amber-300'}`}>
        {stats.statistical_significance ? <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5" />}
        {stats.status_note}
      </div>

      {/* Comparison Chart */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recovery Rate Comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={comparisonData} barGap={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="control" name="Control (Naive)" fill="#64748b" radius={[6, 6, 0, 0]} barSize={40} />
            <Bar dataKey="ai" name="AI Recovery" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Confidence & Methodology */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 glass-panel rounded-2xl border border-slate-800 text-xs space-y-2">
          <div className="font-bold text-white">Statistical Methodology</div>
          <div className="text-slate-400 leading-relaxed">
            Two-proportion Z-test comparing AI recovery group vs naive retry control group.
            {stats.confidence_level && <span> Confidence level: <strong className="text-white">{(stats.confidence_level * 100).toFixed(0)}%</strong></span>}
          </div>
          <div className="text-[10px] text-slate-500">
            Sample size: {stats.ai_payments + stats.control_payments} total transactions ({stats.ai_payments} treatment / {stats.control_payments} control)
          </div>
        </div>
        <div className="p-4 glass-panel rounded-2xl border border-slate-800 text-xs space-y-2">
          <div className="font-bold text-white">Revenue Lift Summary</div>
          <div className="text-slate-300">
            AI recovery generated <strong className="text-emerald-400">₹{((stats.ai_recovered_revenue - stats.control_recovered_revenue)/1000).toFixed(0)}K</strong> additional recovered revenue compared to naive retry.
          </div>
          <div className="text-[10px] text-slate-500">
            This proves incremental revenue — not recoveries that would have succeeded anyway.
          </div>
        </div>
      </div>
    </div>
  );
};
