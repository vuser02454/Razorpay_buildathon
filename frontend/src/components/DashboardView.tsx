import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { KPIBanner } from './KPIBanner';
import { api } from '../services/api';
import { DashboardKPIs } from '../types';
import { TrendingUp, Loader2 } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [k, a] = await Promise.all([api.getKPIs(), api.getAnalytics()]);
      setKpis(k);
      setAnalytics(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const PIE_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPIBanner kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue at Risk vs Recovered Timeline */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Revenue at Risk vs Recovered (7-Day Trend)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics?.timeline || []}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Area type="monotone" dataKey="revenue_at_risk" name="Revenue at Risk" stroke="#f43f5e" fill="url(#riskGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="recovered" name="Recovered" stroke="#10b981" fill="url(#recGrad)" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Distribution Pie */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Failure Reason Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={analytics?.failure_distribution || []}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {(analytics?.failure_distribution || []).map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery by Failure Type Bar Chart */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Recovery Rate by Failure Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics?.recovery_by_type || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" axisLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="recovery_rate" name="Recovery Rate %" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery Channel Performance */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Channel Performance</h3>
          <div className="space-y-3">
            {(analytics?.channel_performance || []).map((ch: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{ch.channel}</span>
                  <span className="text-xs font-mono text-emerald-400">{ch.success_rate}% success</span>
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
      </div>
    </div>
  );
};
