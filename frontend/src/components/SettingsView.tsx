import React, { useEffect, useState } from 'react';
import { Sliders, Save, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../services/api';
import { MerchantPolicy } from '../types';

import { AIStatusPanel } from './AIStatusPanel';

export const SettingsView: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((res) => { setPolicy(res.policy); setIsDemoMode(res.is_demo_mode); }).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await api.updateSettings(policy);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (!policy) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Sliders className="w-5 h-5 text-indigo-400" /> Recovery Policies & Configuration</h2>
        <p className="text-xs text-slate-400">Safety guardrails enforced by the LangGraph decision agent</p>
      </div>

      {/* AI Provider & Subsystem Topology Panel */}
      <AIStatusPanel />

      {/* Environment Status */}
      <div className="p-4 glass-panel rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white">Environment Mode</div>
          <div className="text-[10px] text-slate-400">{isDemoMode ? 'Demo Sandbox — MockPaymentProvider active' : 'Production — RazorpayProvider active'}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isDemoMode ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
          {isDemoMode ? 'DEMO' : 'LIVE'}
        </span>
      </div>

      {/* Policy Controls */}
      <div className="space-y-4">
        <div className="p-4 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span>Maximum Automated Retry Attempts</span>
            <span className="text-indigo-400 font-mono">{policy.max_retry_attempts}</span>
          </div>
          <input type="range" min={1} max={5} value={policy.max_retry_attempts} onChange={(e) => setPolicy({ ...policy, max_retry_attempts: Number(e.target.value) })} className="w-full accent-indigo-500 cursor-pointer" />
          <p className="text-[10px] text-slate-500">Card network rules impose retry limits. Exceeding limits may incur merchant fees.</p>
        </div>

        <div className="p-4 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span>Maximum Recovery Window</span>
            <span className="text-indigo-400 font-mono">{policy.max_recovery_window_hours} hours</span>
          </div>
          <input type="range" min={24} max={168} step={12} value={policy.max_recovery_window_hours} onChange={(e) => setPolicy({ ...policy, max_recovery_window_hours: Number(e.target.value) })} className="w-full accent-indigo-500 cursor-pointer" />
        </div>

        <div className="p-4 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span>High-Value Human Review Threshold</span>
            <span className="text-amber-400 font-mono">₹{policy.high_value_threshold.toLocaleString()}</span>
          </div>
          <input type="range" min={2000} max={100000} step={1000} value={policy.high_value_threshold} onChange={(e) => setPolicy({ ...policy, high_value_threshold: Number(e.target.value) })} className="w-full accent-amber-500 cursor-pointer" />
          <p className="text-[10px] text-slate-500">Payments above this require merchant operator approval before automated action.</p>
        </div>

        <div className="p-4 glass-panel rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span>Human Review Confidence Threshold</span>
            <span className="text-purple-400 font-mono">{Math.round(policy.human_approval_threshold * 100)}%</span>
          </div>
          <input type="range" min={40} max={90} step={5} value={policy.human_approval_threshold * 100} onChange={(e) => setPolicy({ ...policy, human_approval_threshold: Number(e.target.value) / 100 })} className="w-full accent-purple-500 cursor-pointer" />
          <p className="text-[10px] text-slate-500">AI decisions below this confidence level are routed to human review.</p>
        </div>

        <div className="flex items-center justify-between p-4 glass-panel rounded-2xl border border-slate-800">
          <div>
            <div className="text-xs font-bold text-white">Automated Dunning Notifications</div>
            <div className="text-[10px] text-slate-400">Send failure-specific Email, SMS, WhatsApp for credential and auth issues</div>
          </div>
          <input type="checkbox" checked={policy.dunning_enabled} onChange={(e) => setPolicy({ ...policy, dunning_enabled: e.target.checked })} className="w-5 h-5 accent-indigo-500 rounded cursor-pointer" />
        </div>
      </div>

      {/* Save Button */}
      <button onClick={handleSave} disabled={saving} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : saved ? 'Saved Successfully' : 'Save Recovery Policies'}
      </button>

      {/* Security Notice */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-emerald-400">Safety Invariants:</strong> Hard decline cards (stolen/lost) are never retried regardless of policy. Expired credentials always route to customer dunning. AI outputs cannot bypass these constraints.
        </div>
      </div>
    </div>
  );
};
