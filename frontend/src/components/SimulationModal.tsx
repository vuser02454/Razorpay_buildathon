import React, { useState } from 'react';
import { Activity, X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: any) => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [customerName, setCustomerName] = useState('Rahul Sharma');
  const [amount, setAmount] = useState<number>(2000);
  const [currency, setCurrency] = useState('INR');
  const [failureCode, setFailureCode] = useState('insufficient_funds');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    try {
      setLoading(true);
      const res = await api.simulateFailure({
        amount,
        currency,
        failure_code: failureCode,
        bank_name: bankName
      });
      if (res.success) {
        onSuccess(res.payment);
        onClose();
      }
    } catch (err) {
      alert('Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Simulate Payment Failure</h2>
            <p className="text-xs text-slate-400">
              Inject a live failed recurring subscription to evaluate the LangGraph agent
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subscriber Account</label>
            <select
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Rahul Sharma">Rahul Sharma (Pro Tier • 14 mo tenure • 94% success)</option>
              <option value="Priya Venkatesh">Priya Venkatesh (Enterprise • 22 mo tenure • 97% success)</option>
              <option value="Ananya Patel">Ananya Patel (Starter • 6 mo tenure • 88% success)</option>
              <option value="Vikram Singhania">Vikram Singhania (Enterprise • 28 mo tenure • 98% success)</option>
              <option value="David Miller">David Miller (US Global • 30 mo tenure • 98% success)</option>
            </select>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          {/* Failure Scenario */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Failure Decline Code</label>
            <select
              value={failureCode}
              onChange={(e) => setFailureCode(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="insufficient_funds">Insufficient Funds (Soft Decline → AI Retries tomorrow morning)</option>
              <option value="card_expired">Card Expired (Credential Stale → Do Not Retry + Customer Dunning)</option>
              <option value="authentication_required">3DS Authentication Required (RBI Mandate → Auth Step-Up Dunning)</option>
              <option value="stolen_card">Stolen / Lost Card (Hard Decline → Permanent Stop Safety Lock)</option>
              <option value="bank_error">Bank Switch Timeout (Network 504 → Immediate Retry after switch recovery)</option>
              <option value="velocity_limit">Velocity Limit Exceeded (Risk Limit → 48-Hour Cooldown Wait & Retry)</option>
            </select>
          </div>

          {/* Issuer Bank */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Issuer Bank / Gateway</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="HDFC Bank">HDFC Bank (99.4% Gateway Health)</option>
              <option value="ICICI Bank">ICICI Bank (98.9% Gateway Health)</option>
              <option value="State Bank of India">State Bank of India (94.2% Gateway Health)</option>
              <option value="Axis Bank">Axis Bank (97.8% Gateway Health)</option>
              <option value="JPMorgan Chase">JPMorgan Chase (Global)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSimulate}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{loading ? 'Simulating...' : 'Trigger Failure'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
