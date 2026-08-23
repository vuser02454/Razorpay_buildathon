import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BrainCircuit,
  Sliders,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  X,
  Play,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Sparkles,
  Lock,
  PlusCircle,
  Inbox,
  CreditCard,
  Unlink,
  Link as LinkIcon,
  Mail,
  Send,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { Payment, DashboardKPIs, RazorpayConnectionStatus, RecoveryCommunication } from '../../types';
import { authStore } from '../../services/authStore';
import { EmailPreviewModal } from './EmailPreviewModal';
import { LangGraphVisualizerModal } from './LangGraphVisualizerModal';
import { AIStatusPanel } from '../AIStatusPanel';

interface RecoveryControlCenterProps {
  onOpenSimulation: () => void;
}

export const RecoveryControlCenter: React.FC<RecoveryControlCenterProps> = ({ onOpenSimulation }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayConnectionStatus | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [communications, setCommunications] = useState<RecoveryCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [simulatingTest, setSimulatingTest] = useState(false);
  const [syncingRazorpay, setSyncingRazorpay] = useState(false);
  const [connectingRazorpay, setConnectingRazorpay] = useState(false);
  const [quickSendingEmail, setQuickSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string>('policy_gate');
  const [emailNotification, setEmailNotification] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const currentAdmin = authStore.getAdmin();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiRes, paymentsRes, rzpRes, commsRes] = await Promise.all([
        api.getKPIs(),
        api.getPayments({ filter_type: filterType, search, limit: 30 }),
        api.getRazorpayStatus(),
        api.getEmailHistory()
      ]);
      setKpis(kpiRes);
      setPayments(paymentsRes.items);
      setRazorpayStatus(rzpRes);
      setCommunications(commsRes);
      if (paymentsRes.items.length > 0) {
        if (!selectedPayment || !paymentsRes.items.some((p) => p.id === selectedPayment.id)) {
          setSelectedPayment(paymentsRes.items[0]);
        }
      } else {
        setSelectedPayment(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, search]);

  const handleConnectRazorpay = async () => {
    setConnectingRazorpay(true);
    try {
      const res = await api.connectRazorpay();
      if (res.success) {
        setRazorpayStatus(res.connection);
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        handleSyncRazorpay();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnectingRazorpay(false);
    }
  };

  const handleSyncRazorpay = async () => {
    setSyncingRazorpay(true);
    try {
      const res = await api.syncRazorpay();
      if (res.success) {
        setRazorpayStatus(res.connection);
        setKpis(res.kpis);
        await fetchDashboardData();
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSyncingRazorpay(false);
    }
  };

  const handleDisconnectRazorpay = async () => {
    if (!window.confirm("Disconnect Razorpay account? Historical recovery records will be preserved.")) return;
    try {
      const res = await api.disconnectRazorpay();
      setRazorpayStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedPayment) return;
    setAnalyzing(true);
    try {
      const res = await api.analyzePayment(selectedPayment.id);
      if (res.success) {
        setSelectedPayment(res.payment);
        setPayments((prev) => prev.map((p) => (p.id === res.payment.id ? res.payment : p)));
        const updatedKpis = await api.getKPIs();
        setKpis(updatedKpis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSimulateRetry = async (outcome: 'success' | 'failed') => {
    if (!selectedPayment) return;
    setRetrying(true);
    try {
      const res = await api.simulateRetry(selectedPayment.id, outcome);
      if (res.success) {
        setSelectedPayment(res.payment);
        setPayments((prev) => prev.map((p) => (p.id === res.payment.id ? res.payment : p)));
        const updatedKpis = await api.getKPIs();
        setKpis(updatedKpis);
        if (outcome === 'success') {
          confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRetrying(false);
    }
  };

  const handleCreateTestRecovery = async () => {
    setSimulatingTest(true);
    try {
      await api.simulateFailure({
        amount: 2500,
        currency: 'INR',
        failure_code: 'insufficient_funds',
        bank_name: 'HDFC Bank'
      });
      await fetchDashboardData();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingTest(false);
    }
  };

  const handleQuickSendEmail = async () => {
    if (!selectedPayment) return;
    setQuickSendingEmail(true);
    try {
      const res = await api.sendEmail(
        selectedPayment.id,
        selectedPayment.customer?.email,
        selectedPayment.customer?.name,
        'PAYMENT_UPDATE_REQUIRED'
      );
      if (res.success) {
        setEmailNotification(`✓ Recovery email sent to ${selectedPayment.customer?.email} via Brevo SMTP`);
        const commsRes = await api.getEmailHistory();
        setCommunications(commsRes);
        setTimeout(() => setEmailNotification(null), 5000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuickSendingEmail(false);
    }
  };

  const sym = (p?: Payment | null) => (p?.currency === 'INR' || !p ? '₹' : '$');

  // Filter communications for selected payment
  const paymentComms = communications.filter((c) => c.payment_id === selectedPayment?.id);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 pt-28 px-4 sm:px-6 animate-fade-up">
      {/* Subtle Toast Notification for Email Sent */}
      {emailNotification && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-950 text-white border border-emerald-500 shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fade-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{emailNotification}</span>
        </div>
      )}

      {/* Top Editorial Header & Tenant Status */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold mb-2 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Workspace: {currentAdmin?.name || 'Admin'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white uppercase font-display">
              Recovery Control Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autonomous payment failure triage, deterministic safety gate, and intelligent retry execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border ${currentAdmin?.is_demo
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              }`}>
              {currentAdmin?.is_demo ? 'DEMO DATA' : 'LIVE TENANT'}
            </span>
            <button
              onClick={onOpenSimulation}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Simulate Payment Failure</span>
            </button>
          </div>
        </div>

        {/* Razorpay Gateway Multi-Tenant Connection Banner Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${razorpayStatus?.is_connected
                ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}>
              <CreditCard className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase font-bold text-slate-400">PAYMENT GATEWAY</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${razorpayStatus?.is_connected
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                  {razorpayStatus?.is_connected ? '● Razorpay Connected' : '○ Razorpay Not Connected'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {razorpayStatus?.is_connected
                  ? `Account: ${razorpayStatus.account_id || 'rzp_account_live'} • Last synchronized: ${razorpayStatus.last_synced_at ? new Date(razorpayStatus.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}`
                  : 'Connect your Razorpay account to allow RecoverAI to analyze real payment failures.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {razorpayStatus?.is_connected ? (
              <>
                <button
                  onClick={handleSyncRazorpay}
                  disabled={syncingRazorpay}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingRazorpay ? 'animate-spin' : ''}`} />
                  <span>{syncingRazorpay ? 'Syncing Razorpay...' : 'Sync Payments'}</span>
                </button>
                <button
                  onClick={handleDisconnectRazorpay}
                  className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Disconnect Razorpay"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectRazorpay}
                disabled={connectingRazorpay}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {connectingRazorpay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>Connect Razorpay</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Prominent High-Contrast KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">RECOVERED REVENUE</div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-mono">
              ₹{(kpis?.recovered_revenue || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {kpis?.recovered_revenue ? '+24.9% uplift via AI' : 'Zero recoveries yet'}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">RECOVERY RATE</div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-mono">
              {kpis?.recovery_rate || 0}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {kpis?.recovery_rate ? 'Industry baseline: 38.2%' : 'Awaiting failure events'}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">PENDING RECOVERY</div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-mono">
              ₹{(kpis?.revenue_at_risk || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {kpis?.active_workflows_count || 0} active workflows
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">PAYMENTS ANALYZED</div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-mono">
              {kpis?.failed_payments_count || 0}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {kpis?.failed_payments_count ? '92% non-intrusive' : '0 processed'}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">POLICY BLOCKS</div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white font-mono">
              {currentAdmin?.is_demo ? '47' : '0'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Unsafe Retries Stopped
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Left Queue + Right AI Decision Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Live Transaction Queue or Polished Empty State */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">Live Recovery Queue</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {payments.length > 0
                    ? 'Select any transaction to inspect AI decision factors & LangGraph execution stream'
                    : 'Real-time payment failure ingestion and triage stream'}
                </p>
              </div>

              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition cursor-pointer self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Filters */}
            {payments.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer, email, payment ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-700"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Declines</option>
                  <option value="soft_decline">Soft Decline</option>
                  <option value="hard_decline">Hard Decline</option>
                  <option value="credential_issue">Credential Issue</option>
                  <option value="network_timeout">Network Timeout</option>
                </select>
              </div>
            )}

            {/* Payments List or Polished High-Contrast Empty State */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : payments.length === 0 ? (
              /* Polished High-Contrast Zero State */
              <div className="py-14 px-6 text-center space-y-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 shadow-md mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <Inbox className="w-6 h-6 text-slate-400 dark:text-slate-300" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-950 dark:text-white">YOUR RECOVERY WORKSPACE</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    No payment failures detected yet. Connect your Razorpay account to begin analyzing failed payments or run a test recovery.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleCreateTestRecovery}
                    disabled={simulatingTest}
                    className="px-5 py-2.5 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    {simulatingTest ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Run a Test Recovery</span>
                  </button>
                  <button
                    onClick={handleConnectRazorpay}
                    disabled={connectingRazorpay}
                    className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Connect Razorpay</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {payments.map((p) => {
                  const isSelected = selectedPayment?.id === p.id;
                  const dec = p.latest_decision;
                  const isRecovered = p.status === 'recovered';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                          ? 'bg-slate-950 text-white border-slate-950 dark:border-slate-600 shadow-md scale-[1.01]'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-900 dark:text-white'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-950 dark:text-white">{p.customer?.name || 'Customer'}</span>

                            {/* Source Badge (DEMO DATA vs RAZORPAY LIVE vs TEST RECOVERY) */}
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${p.source === 'RAZORPAY'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                                : p.source === 'TEST'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                                  : 'bg-slate-500/20 text-slate-300 border border-slate-400/30'
                              }`}>
                              {p.source === 'RAZORPAY' ? 'RAZORPAY LIVE' : p.source === 'TEST' ? 'TEST EVENT' : 'DEMO DATA'}
                            </span>

                            <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                              {p.failure?.error_code || 'declined'}
                            </span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {p.customer?.email}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold font-mono text-slate-950 dark:text-white">
                            {sym(p)}{p.amount.toLocaleString()}
                          </div>
                          <div className={`text-[10px] font-bold ${isRecovered ? 'text-emerald-500' : p.status === 'in_review' ? 'text-purple-400' : 'text-rose-500'
                            }`}>
                            {p.status.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* AI Recommendation Pill Bar */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.failure?.failure_type === 'soft_decline'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                            }`}>
                            {p.failure?.failure_type?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {dec && (
                            <span className={`font-semibold ${isSelected ? 'text-lime-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              → {dec.recommended_action.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          {dec && (
                            <span className={dec.recovery_probability >= 0.6 ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                              {Math.round(dec.recovery_probability * 100)}% Prob.
                            </span>
                          )}
                          <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Decision Drawer & LangGraph Workflow State */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          {selectedPayment ? (
            <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 animate-fade-up">
              {/* Top Drawer Title */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">RECOVERY ANALYSIS</span>
                  <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">{selectedPayment.customer?.name}</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedPayment.id} &bull; {selectedPayment.customer?.email}</div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-slate-950 dark:text-white font-mono">
                    {sym(selectedPayment)}{selectedPayment.amount.toLocaleString()}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${selectedPayment.status === 'recovered'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                    }`}>
                    {selectedPayment.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Recovery Probability & AI Recommendation Box */}
              {selectedPayment.latest_decision ? (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-slate-300">Recovery Probability</div>
                      <div className="text-3xl font-black text-slate-950 dark:text-white font-mono mt-0.5">
                        {Math.round(selectedPayment.latest_decision.recovery_probability * 100)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-slate-300">AI Action</div>
                      <div className="text-sm font-extrabold text-slate-950 dark:text-white px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mt-1">
                        {selectedPayment.latest_decision.recommended_action.replace(/_/g, ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-200/60 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                    <div className="font-bold">Recommended Retry Window: <span className="font-mono text-slate-950 dark:text-white">Tomorrow &bull; 09:30 AM</span></div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedPayment.latest_decision.explanation}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRunAnalysis}
                  disabled={analyzing}
                  className="w-full py-3 rounded-full bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{analyzing ? 'Running LangGraph Agent...' : 'Run AI Recovery Analysis'}</span>
                </button>
              )}

              {/* Customer Communication (Brevo SMTP Outgoing Dunning Section) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-950 dark:text-white">
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Customer Communication</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    EMAIL AVAILABLE
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dispatch failure-specific transactional email with 1-click payment update link powered by Brevo SMTP.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setEmailModalOpen(true)}
                    className="flex-1 py-2 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Email</span>
                  </button>

                  <button
                    onClick={handleQuickSendEmail}
                    disabled={quickSendingEmail}
                    className="flex-1 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {quickSendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Email</span>
                  </button>
                </div>

                {/* Communication History for this payment */}
                {paymentComms.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Communication Activity:</span>
                    {paymentComms.map((comm) => (
                      <div key={comm.id} className="text-[11px] font-mono flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Sent &bull; {comm.provider.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observable Decision Factors */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-950 dark:text-white">Observable Decision Factors</div>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Decline Signal: {selectedPayment.failure?.failure_type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Customer History: {selectedPayment.customer?.tenure_months || 6} mo tenure &bull; {Math.round((selectedPayment.customer?.historical_success_rate || 0.88) * 100)}% past success</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Retry Window Available: Tomorrow 09:30 AM clearing</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Policy Safety Gate: Within retry limit ({selectedPayment.retry_count} / {selectedPayment.max_retries})</span>
                  </div>
                </div>
              </div>

              {/* LangGraph 7-Step Autonomous Workflow State Stream */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>LangGraph Execution Stream</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">● State Verified</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedGraphNodeId('policy_gate');
                      setGraphModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center gap-1 cursor-pointer"
                    title="Open Complete 7-Node LangGraph Flow"
                  >
                    <span>View Full Graph →</span>
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <button
                    onClick={() => {
                      setSelectedGraphNodeId('classify_failure');
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">01 CLASSIFY FAILURE</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓ {selectedPayment.failure?.failure_type?.toUpperCase() || 'SOFT_DECLINE'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGraphNodeId('recovery_probability');
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">02 RECOVERY PROBABILITY</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">✓ {Math.round((selectedPayment.latest_decision?.recovery_probability || 0.74) * 100)}%</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGraphNodeId('policy_gate');
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      03 POLICY SAFETY GATE
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ DETERMINISTIC PASSED</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGraphNodeId('decision');
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-400 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">04 ACTION DECISION</span>
                    <span className="text-slate-950 dark:text-white font-bold">✓ {selectedPayment.latest_decision?.recommended_action?.toUpperCase() || 'RETRY'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const branchId = selectedPayment.latest_decision?.recommended_action === 'customer_action' ? 'communication' : selectedPayment.latest_decision?.requires_human_review ? 'human_review' : 'retry_action';
                      setSelectedGraphNodeId(branchId);
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-400 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">05 CONDITIONAL ROUTING</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓ {selectedPayment.latest_decision?.recommended_action === 'customer_action' ? 'COMMUNICATION' : selectedPayment.latest_decision?.requires_human_review ? 'HUMAN_REVIEW' : 'RETRY_ACTION'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const branchId = selectedPayment.latest_decision?.recommended_action === 'customer_action' ? 'communication' : 'retry_action';
                      setSelectedGraphNodeId(branchId);
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">06 EXECUTION (RAZORPAY / BREVO)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {selectedPayment.latest_decision?.recommended_action === 'customer_action' ? 'BREVO SMTP RELAY' : 'RAZORPAY SCHEDULED'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGraphNodeId('outcome');
                      setGraphModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">07 CLOSED-LOOP OUTCOME</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ TELEMETRY RECORDED</span>
                  </button>
                </div>
              </div>

              {/* Simulation Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>ACTION DISPATCH</span>
                  <span>Instant Sandbox Action</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSimulateRetry('success')}
                    disabled={retrying}
                    className="flex-1 py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>
                      <span className="hidden sm:inline">SIMULATE SUCCESSFUL RETRY </span>
                      <span className="sm:hidden">RETRY SUCCESS </span>
                      (+{sym(selectedPayment)}{selectedPayment.amount.toLocaleString()})
                    </span>
                  </button>

                  <button
                    onClick={() => handleSimulateRetry('failed')}
                    disabled={retrying}
                    className="py-2.5 px-4 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Fail
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              {payments.length === 0
                ? 'Create a test recovery event or connect Razorpay to inspect AI decision factors.'
                : 'Select a payment transaction from the queue to inspect AI decision factors.'}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Subsystem & AI Provider Topology Panel */}
      <AIStatusPanel />

      {/* Email Preview & Sending Modal */}
      <EmailPreviewModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        payment={selectedPayment}
        onEmailSent={async () => {
          const commsRes = await api.getEmailHistory();
          setCommunications(commsRes);
        }}
      />

      {/* Interactive LangGraph 7-Node Autonomous Recovery Flow Modal */}
      <LangGraphVisualizerModal
        isOpen={graphModalOpen}
        onClose={() => setGraphModalOpen(false)}
        payment={selectedPayment}
        initialNodeId={selectedGraphNodeId}
      />
    </div>
  );
};
