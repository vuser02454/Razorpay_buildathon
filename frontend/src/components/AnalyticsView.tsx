import React, { useEffect, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { api } from '../services/api';

const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" /> Recovery Analytics & Intelligence
        </h2>
        <p className="text-xs text-slate-400">Comprehensive cohort analysis across failure types, channels, and geography</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recovery Rate Over Time */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Recovery Rate Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.timeline}>
              <defs>
                <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[50, 70]} unit="%" axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="recovery_rate" name="Recovery Rate" stroke="#6366f1" fill="url(#rateGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Distribution */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Failure Type Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.failure_distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" nameKey="name"
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.failure_distribution.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery by Type */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Recovery Rate by Failure Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.recovery_by_type} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" axisLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="recovery_rate" name="Recovery %" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Performance */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Recovery Channel Performance</h3>
          <div className="space-y-3">
            {data.channel_performance.map((ch: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{ch.channel}</span>
                  <span className="text-xs font-mono text-emerald-400">{ch.success_rate}%</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>{ch.attempts} attempts</span>
                  <span>•</span>
                  <span>₹{(ch.recovered_revenue / 1000).toFixed(0)}K recovered</span>
                </div>
                <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full" style={{ width: `${ch.success_rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Recovered by Type */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Revenue Recovered by Failure Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.recovery_by_type}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="recovered_revenue" name="Recovered (₹)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
              <Bar dataKey="total_revenue" name="Total at Risk (₹)" fill="#334155" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
