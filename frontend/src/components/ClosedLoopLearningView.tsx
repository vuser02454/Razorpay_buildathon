import React, { useEffect, useState } from 'react';
import { GraduationCap, TrendingUp, ArrowUpRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../services/api';
import { ClosedLoopMetric } from '../types';

export const ClosedLoopLearningView: React.FC = () => {
  const [metrics, setMetrics] = useState<ClosedLoopMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLearning().then(setMetrics).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  const chartData = metrics.map((m) => ({
    name: m.failure_category.split('(')[0].trim(),
    baseline: m.baseline_success_rate,
    current: m.current_success_rate,
    improvement: m.improvement_delta,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-400" /> Closed-Loop Agent Learning
        </h2>
        <p className="text-xs text-slate-400">
          Recovery outcomes feed back into the decision engine, improving future probability estimates
        </p>
      </div>

      {/* Architecture Explainer */}
      <div className="p-4 glass-panel rounded-2xl border border-indigo-800/30 bg-indigo-950/15 text-xs text-indigo-200 space-y-2">
        <div className="font-bold text-white text-sm">How Closed-Loop Learning Works</div>
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="px-2.5 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30">Payment Failure</span>
          <span className="text-indigo-500">→</span>
          <span className="px-2.5 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30">AI Decision</span>
          <span className="text-indigo-500">→</span>
          <span className="px-2.5 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30">Recovery Action</span>
          <span className="text-indigo-500">→</span>
          <span className="px-2.5 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">Observe Outcome</span>
          <span className="text-emerald-500">→</span>
          <span className="px-2.5 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">Store & Learn</span>
          <span className="text-emerald-500">→</span>
          <span className="px-2.5 py-1 bg-purple-500/20 rounded-lg border border-purple-500/30">Better Future Decisions</span>
        </div>
      </div>

      {/* Improvement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="p-4 glass-panel rounded-2xl border border-slate-800 glass-panel-hover space-y-3">
            <div className="text-xs font-bold text-white">{m.failure_category}</div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Baseline</div>
                <div className="text-lg font-bold text-slate-400 font-mono">{m.baseline_success_rate}%</div>
              </div>
              <div className="text-emerald-400 pb-1">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-emerald-400 uppercase font-semibold">AI Agent</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{m.current_success_rate}%</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">
                +{m.improvement_delta}% uplift
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{m.total_samples} samples</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all" style={{ width: `${m.current_success_rate}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Before vs After Chart */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-white mb-4">Baseline vs AI Recovery Rate by Failure Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" axisLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="baseline" name="Baseline (Before)" fill="#475569" radius={[6, 6, 0, 0]} barSize={28} />
            <Bar dataKey="current" name="AI Agent (After)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
