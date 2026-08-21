import React, { useState } from 'react';
import { X, BrainCircuit, CheckCircle2, AlertTriangle, Clock, Shield, Play, ThumbsUp, ThumbsDown, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Payment, WorkflowStep } from '../types';

interface PaymentDetailDrawerProps {
  payment: Payment | null;
  onClose: () => void;
  onPaymentUpdate: (p: Payment) => void;
}

const STEP_ICONS: Record<string, string> = {
  completed: '✅',
  in_progress: '🔄',
  pending: '⏳',
  failed: '❌',
};

const ACTION_COLOR: Record<string, string> = {
  retry: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  wait_and_retry: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  customer_action: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  do_not_retry: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  human_review: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export const PaymentDetailDrawer: React.FC<PaymentDetailDrawerProps> = ({ payment, onClose, onPaymentUpdate }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [approving, setApproving] = useState(false);

  if (!payment) return null;

  const sym = payment.currency === 'INR' ? '₹' : '$';
  const dec = payment.latest_decision;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.analyzePayment(payment.id);
      if (res.success) onPaymentUpdate(res.payment);
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  const handleRetry = async (outcome: 'success' | 'failed') => {
    setRetrying(true);
    try {
      const res = await api.simulateRetry(payment.id, outcome);
      if (res.success) {
        onPaymentUpdate(res.payment);
        if (outcome === 'success') {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        }
      }
    } catch (e) { console.error(e); }
    finally { setRetrying(false); }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await api.approveReview(payment.id);
      if (res.success) onPaymentUpdate(res.payment);
    } catch (e) { console.error(e); }
    finally { setApproving(false); }
  };

  const handleReject = async () => {
    try {
      const res = await api.rejectReview(payment.id);
      if (res.success) onPaymentUpdate(res.payment);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full overflow-y-auto glass-panel border-l border-slate-700/80 shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-mono">{payment.id}</div>
            <h2 className="text-lg font-bold text-white">{payment.customer?.name || 'Customer'}</h2>
            <p className="text-xs text-slate-500">{payment.customer?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Status */}
        <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div>
            <div className="text-2xl font-bold text-white font-mono">{sym}{payment.amount.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400">{payment.currency} • {payment.subscription_cycle}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${payment.status === 'recovered' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : payment.status === 'failed' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
            {payment.status.toUpperCase()}
          </span>
        </div>

        {/* Failure Info */}
        {payment.failure && (
          <div className="p-4 bg-rose-950/20 rounded-xl border border-rose-800/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4" /> Decline Signal
            </div>
            <div className="text-xs text-slate-300">{payment.failure.decline_reason}</div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="font-mono bg-slate-900 px-2 py-0.5 rounded">{payment.failure.error_code}</span>
              <span>{payment.failure.bank_name}</span>
              <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${payment.failure.failure_type === 'soft_decline' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'}`}>
                {payment.failure.failure_type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        )}

        {/* AI Decision Section */}
        {dec ? (
          <div className="p-4 bg-indigo-950/20 rounded-xl border border-indigo-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                <BrainCircuit className="w-4 h-4" /> AI Decision (LangGraph Agent)
              </div>
              <span className="text-[10px] font-mono text-slate-500">{dec.agent_version}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-slate-900/80 rounded-lg">
                <div className="text-lg font-bold text-white">{Math.round(dec.recovery_probability * 100)}%</div>
                <div className="text-[10px] text-slate-400">Recovery Prob.</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg">
                <div className="text-lg font-bold text-white">{Math.round(dec.confidence * 100)}%</div>
                <div className="text-[10px] text-slate-400">Confidence</div>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg">
                <div className={`text-sm font-bold px-2 py-0.5 rounded-full border ${ACTION_COLOR[dec.recommended_action] || ''}`}>
                  {dec.recommended_action.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Action</div>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase">AI Reasoning</div>
              <p className="text-xs text-slate-200 leading-relaxed">{dec.explanation}</p>
            </div>

            {/* Decision Factors */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {dec.decision_factors && Object.entries(dec.decision_factors).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-medium truncate">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Running LangGraph Agent...' : 'Run AI Recovery Analysis'}
          </button>
        )}

        {/* Workflow Steps */}
        {payment.workflow_steps.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-white">Recovery Workflow Trace</div>
            <div className="relative pl-6 space-y-0">
              {payment.workflow_steps.map((step, idx) => (
                <div key={idx} className="relative pb-4 last:pb-0">
                  {idx < payment.workflow_steps.length - 1 && (
                    <div className="absolute left-[-16px] top-5 bottom-0 w-px bg-slate-700" />
                  )}
                  <div className="absolute left-[-20px] top-1 text-sm">{STEP_ICONS[step.status] || '⏳'}</div>
                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-semibold text-white">{step.node_name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {step.details?.message || JSON.stringify(step.details)}
                    </div>
                    <div className="text-[9px] text-slate-600 font-mono mt-1">{new Date(step.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {/* Human Review Actions */}
          {payment.status === 'in_review' && (
            <div className="flex gap-2">
              <button onClick={handleApprove} disabled={approving} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer">
                <ThumbsUp className="w-3.5 h-3.5" /> Approve Recovery
              </button>
              <button onClick={handleReject} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition cursor-pointer">
                <ThumbsDown className="w-3.5 h-3.5" /> Reject / Halt
              </button>
            </div>
          )}

          {/* Simulate Retry */}
          {(payment.status === 'failed' || payment.status === 'scheduled') && (
            <div className="flex gap-2">
              <button onClick={() => handleRetry('success')} disabled={retrying} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer">
                {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Simulate Successful Retry
              </button>
              <button onClick={() => handleRetry('failed')} disabled={retrying} className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition cursor-pointer">
                Simulate Failed Retry
              </button>
            </div>
          )}
        </div>

        {/* Customer Context */}
        {payment.customer && (
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="font-bold text-xs text-white mb-1">Customer Profile</div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-slate-500">Segment:</span><span className="capitalize">{payment.customer.segment}</span>
              <span className="text-slate-500">Tenure:</span><span>{payment.customer.tenure_months} months</span>
              <span className="text-slate-500">LTV:</span><span>{sym}{payment.customer.lifetime_value.toLocaleString()}</span>
              <span className="text-slate-500">Historical Success:</span><span>{Math.round(payment.customer.historical_success_rate * 100)}%</span>
              <span className="text-slate-500">Country:</span><span>{payment.customer.country}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
