import React, { useEffect, useState } from 'react';
import { Sliders, Save, Loader2, CheckCircle2, Shield, CreditCard, RefreshCw, Unlink, Link as LinkIcon, Mail, Send, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { MerchantPolicy, RazorpayConnectionStatus } from '../types';
import { AIStatusPanel } from './AIStatusPanel';
import { RazorpayConnectModal } from './integrations/RazorpayConnectModal';
import { RazorpayGatewayModal } from './integrations/RazorpayGatewayModal';

export const SettingsView: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayConnectionStatus | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [testingGateway, setTestingGateway] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // EmailJS Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('operator@recoverai.ai');
  const [emailSendingStatus, setEmailSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [emailFeedbackMsg, setEmailFeedbackMsg] = useState<string | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setEmailSendingStatus('error');
      setEmailFeedbackMsg('Email could not be sent: Please enter a valid email address.');
      return;
    }
    setEmailSendingStatus('sending');
    setEmailFeedbackMsg('Sending...');
    try {
      const res = await api.sendTestEmail(testEmailAddress);
      if (res.success) {
        setEmailSendingStatus('success');
        setEmailFeedbackMsg(res.message || 'Email sent successfully via Gmail SMTP.');
      } else {
        setEmailSendingStatus('error');
        setEmailFeedbackMsg(res.message || 'Email could not be sent. Please check SMTP configuration.');
      }
    } catch (err: any) {
      setEmailSendingStatus('error');
      setEmailFeedbackMsg(err.message || 'Network error connecting to backend API.');
    }
  };

  useEffect(() => {
    api.getSettings().then((res) => { setPolicy(res.policy); setIsDemoMode(res.is_demo_mode); }).catch(console.error);
    api.getRazorpayStatus().then(setRazorpayStatus).catch(console.error);
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

  const handleDisconnect = async () => {
    try {
      const res = await api.disconnectRazorpay();
      setRazorpayStatus(res);
    } catch (e) {
      console.error(e);
    }
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

      {/* Razorpay Gateway Multi-Tenant Integration */}
      <div className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Razorpay Gateway Integration</h4>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${razorpayStatus?.is_connected ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {razorpayStatus?.is_connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {razorpayStatus?.is_connected
                  ? `Connected as ${razorpayStatus.merchant_email || 'Verified Merchant'} (${razorpayStatus.account_id || 'acc_live'})`
                  : 'Verify merchant email ownership with a 6-digit OTP to authorize live Razorpay payment failure synchronization.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {razorpayStatus?.is_connected ? (
              <>
                <button
                  onClick={async () => {
                    setTestingGateway(true);
                    try {
                      const res = await api.testRazorpayConnection();
                      setTestResultMsg(`${res.message} (${res.latency_ms}ms)`);
                      setTimeout(() => setTestResultMsg(null), 4000);
                    } catch {
                      setTestResultMsg('Test connection failed.');
                      setTimeout(() => setTestResultMsg(null), 4000);
                    } finally {
                      setTestingGateway(false);
                    }
                  }}
                  disabled={testingGateway}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingGateway ? 'animate-spin' : ''}`} />
                  <span>{testingGateway ? 'Testing...' : 'Test Connection'}</span>
                </button>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Open Checkout</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-rose-800/40 transition cursor-pointer"
                  title="Disconnect Razorpay"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2.5 rounded-xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Connect Razorpay</span>
              </button>
            )}
          </div>
        </div>

        {testResultMsg && (
          <div className="text-[11px] font-mono font-bold text-emerald-400 border-t border-slate-800/80 pt-2">
            {testResultMsg}
          </div>
        )}
      </div>

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

      {/* Transactional Email Testing Panel */}
      <div className="p-5 glass-panel rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white font-display uppercase tracking-tight">
                Transactional Email (Gmail SMTP Relay)
              </h4>
              <p className="text-[10px] text-slate-400">
                Send diagnostic test notification to verify transactional email delivery via Gmail SMTP
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="operator@company.com"
            className="flex-1 px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            onClick={handleSendTestEmail}
            disabled={emailSendingStatus === 'sending'}
            className="px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/25 transition cursor-pointer disabled:opacity-50"
          >
            {emailSendingStatus === 'sending' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{emailSendingStatus === 'sending' ? 'Sending...' : 'Send Test Email'}</span>
          </button>
        </div>

        {emailFeedbackMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            emailSendingStatus === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
              : emailSendingStatus === 'error'
              ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
              : 'bg-slate-900/60 text-slate-300 border border-slate-800'
          }`}>
            {emailSendingStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {emailSendingStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {emailSendingStatus === 'sending' && <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />}
            <span className="font-medium">{emailFeedbackMsg}</span>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-emerald-400">Safety Invariants:</strong> Hard decline cards (stolen/lost) are never retried regardless of policy. Expired credentials always route to customer dunning. AI outputs cannot bypass these constraints.
        </div>
      </div>

      {/* Razorpay Secure Email Verification & Gateway Connect Modal */}
      <RazorpayConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSuccess={(newStatus) => {
          setRazorpayStatus(newStatus);
        }}
      />

      {/* In-App Interactive Razorpay Gateway Modal */}
      <RazorpayGatewayModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        amount={2500}
        currency="INR"
        merchantName="RecoverAI Merchant Store"
        description="Razorpay Live Gateway Verification Test"
        customerName={razorpayStatus?.merchant_email?.split('@')[0] || 'Merchant Admin'}
        customerEmail={razorpayStatus?.merchant_email || 'admin@company.com'}
        keyId={razorpayStatus?.key_id}
        onSuccess={(details) => {
          setShowCheckoutModal(false);
          setTestResultMsg(`✓ Live Razorpay Payment Captured! (ID: ${details.razorpay_payment_id})`);
          setTimeout(() => setTestResultMsg(null), 5000);
        }}
      />
    </div>
  );
};
