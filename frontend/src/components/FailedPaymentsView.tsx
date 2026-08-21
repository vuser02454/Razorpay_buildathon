import React, { useEffect, useState } from 'react';
import { Search, Filter, ChevronRight, Loader2, BrainCircuit, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Payment } from '../types';

interface FailedPaymentsViewProps {
  onSelectPayment: (payment: Payment) => void;
}

const STATUS_BADGE: Record<string, string> = {
  failed: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_review: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  recovered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  churned: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const TYPE_BADGE: Record<string, string> = {
  soft_decline: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  hard_decline: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  credential_issue: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  network_timeout: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  risk_limit: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  authentication_required: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
};

export const FailedPaymentsView: React.FC<FailedPaymentsViewProps> = ({ onSelectPayment }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.getPayments({ filter_type: filterType, status: filterStatus, search, limit: 50 });
      setPayments(res.items);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); }, [filterType, filterStatus, search]);

  const sym = (p: Payment) => p.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Failed Payments</h2>
          <p className="text-xs text-slate-400">{total} total records • Searchable, filterable, AI-triaged</p>
        </div>
        <button onClick={fetchPayments} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search customer, email, payment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
          <option value="all">All Failure Types</option>
          <option value="soft_decline">Soft Decline</option>
          <option value="hard_decline">Hard Decline</option>
          <option value="credential_issue">Credential Issue</option>
          <option value="network_timeout">Network Timeout</option>
          <option value="risk_limit">Risk / Velocity Limit</option>
          <option value="authentication_required">Auth Required</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="failed">Failed</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_review">In Review</option>
          <option value="recovered">Recovered</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Customer</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold">Failure Reason</th>
                  <th className="text-center px-4 py-3 font-semibold">Type</th>
                  <th className="text-center px-4 py-3 font-semibold">AI Action</th>
                  <th className="text-center px-4 py-3 font-semibold">Prob.</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPayment(p)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{p.customer?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-500">{p.customer?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      {sym(p)}{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">
                      {p.failure?.error_code?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_BADGE[p.failure?.failure_type || ''] || 'bg-slate-800 text-slate-400'}`}>
                        {p.failure?.failure_type?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.latest_decision ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300">
                          <BrainCircuit className="w-3 h-3" />
                          {p.latest_decision.recommended_action.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[11px]">
                      {p.latest_decision ? (
                        <span className={p.latest_decision.recovery_probability >= 0.6 ? 'text-emerald-400' : p.latest_decision.recovery_probability >= 0.3 ? 'text-amber-400' : 'text-rose-400'}>
                          {Math.round(p.latest_decision.recovery_probability * 100)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">No payments match your filters.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
