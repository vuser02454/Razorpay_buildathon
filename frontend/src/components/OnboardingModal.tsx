import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  CreditCard,
  UploadCloud,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState('TechInnovate Cloud India');
  const [businessType, setBusinessType] = useState('B2B SaaS / Subscriptions');
  const [currency, setCurrency] = useState('INR (₹)');
  const [maxRetries, setMaxRetries] = useState(3);
  const [highValueLimit, setHighValueLimit] = useState(10000);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  useEffect(() => {
    if (step === 5) {
      setIsCalibrating(true);
      setCalibrationProgress(0);
      const interval = setInterval(() => {
        setCalibrationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCalibrating(false);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            return 100;
          }
          return prev + 25;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [step]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-6 relative overflow-hidden">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
              {step}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {step === 1 && 'Step 1: Business Profile'}
                {step === 2 && 'Step 2: Connect Payment Gateway'}
                {step === 3 && 'Step 3: Historical Payment Ingestion'}
                {step === 4 && 'Step 4: Autonomous Recovery Policies'}
                {step === 5 && 'Step 5: AI Engine Calibration'}
              </h2>
              <p className="text-xs text-slate-400">RecoverAI Intelligent Setup Wizard</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-6 h-1.5 rounded-full transition-all ${
                  step >= i ? 'bg-indigo-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* SCREEN 1: Business Setup */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Product Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Model</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option>B2B SaaS / Subscriptions</option>
                  <option>B2C Mobile App Subscriptions</option>
                  <option>E-Commerce Recurring Orders</option>
                  <option>Membership / Community</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Settlement Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option>INR (₹) — India</option>
                  <option>USD ($) — Global</option>
                  <option>EUR (€) — Europe</option>
                  <option>GBP (£) — UK</option>
                </select>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
              💡 <strong>Smart Routing:</strong> RecoverAI automatically tailors retry clearing schedules to India banking clearing windows (RBI e-mandate rules & 09:30 AM morning liquidity cycles).
            </div>
          </div>
        )}

        {/* SCREEN 2: Connect Payment Infrastructure */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Connect your payment provider to stream recurring subscription webhook events directly into the LangGraph recovery state machine.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Option A: Razorpay Live */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-indigo-500 transition cursor-pointer space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white">Razorpay Connect</div>
                  <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded font-mono">Live API</span>
                </div>
                <p className="text-xs text-slate-400">
                  Connect Razorpay Key ID & Key Secret for live recurring subscriptions & automatic token verification.
                </p>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for API credentials
                </div>
              </div>

              {/* Option B: Demo Mode Sandbox */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-2 border-indigo-500 transition cursor-pointer space-y-2 relative">
                <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] bg-indigo-500 text-white font-bold rounded">
                  Recommended for Hackathon
                </div>
                <div className="font-bold text-sm text-white">Hackathon Demo Mode</div>
                <p className="text-xs text-slate-300">
                  Pre-loads 105 realistic customers and 320+ payment failure scenarios for instant live evaluation.
                </p>
                <div className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Full LangGraph Agent Active
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: Import Historical Data */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-900/50 space-y-3 cursor-pointer">
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-white">Import Historical Billing Records</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drag and drop your Razorpay payment export (.csv) or use the pre-loaded seed dataset
                </p>
              </div>
              <div className="inline-block px-3 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold">
                ✓ 320 Transactions Ready for Analysis
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-bold text-white">320</div>
                <div className="text-[10px] text-slate-400 uppercase">Payment Attempts</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-bold text-rose-400">142</div>
                <div className="text-[10px] text-slate-400 uppercase">Failed Payments</div>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="text-lg font-bold text-amber-400">₹8.42 Lakh</div>
                <div className="text-[10px] text-slate-400 uppercase">Revenue at Risk</div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: Autonomous Recovery Policies */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Define guardrails and safety limits. The AI decision agent strictly respects these policies.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-white">
                  <span>Max Automated Retries per Invoice</span>
                  <span className="text-indigo-400 font-mono">{maxRetries} Attempts</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Card schemes enforce strict retry caps to avoid merchant penalty fees.</p>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-white">
                  <span>High-Value Human Review Threshold</span>
                  <span className="text-amber-400 font-mono">₹{highValueLimit.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={2000}
                  max={50000}
                  step={1000}
                  value={highValueLimit}
                  onChange={(e) => setHighValueLimit(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Payments exceeding this amount require operator confirmation.</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                <div>
                  <div className="font-semibold text-white">Automated Failure-Specific Dunning</div>
                  <div className="text-[10px] text-slate-400">Send personalized email/SMS/WhatsApp for card expiration & OTP requirements</div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-500 rounded cursor-pointer" />
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 5: AI Calibration */}
        {step === 5 && (
          <div className="py-6 space-y-6 text-center">
            {isCalibrating ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Analyzing Payment Recovery Patterns...
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evaluating card brand success elasticity, customer tenure signals, and liquidity clearing slots
                  </p>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">
                    Your AI Recovery Agent is Calibrated & Ready!
                  </h3>
                  <p className="text-xs text-slate-300">
                    RecoverAI identified ₹5.31 Lakh in immediately recoverable revenue across 142 failed recurring invoices.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Baseline Recovery:</span>{' '}
                    <span className="font-bold text-slate-300">38.2%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">AI Target Recovery:</span>{' '}
                    <span className="font-bold text-emerald-400">63.1% (+24.9% Uplift)</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Top Failure Category:</span>{' '}
                    <span className="font-bold text-indigo-300">Insufficient Funds (Soft)</span>
                  </div>
                  <div>
                    <span className="text-slate-400">LangGraph Version:</span>{' '}
                    <span className="font-mono text-slate-400">v1.2-stateful</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-6">
          {step > 1 && step < 5 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              disabled={isCalibrating}
              onClick={onClose}
              className={`w-full py-3 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer ${
                isCalibrating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 shadow-emerald-500/20'
              }`}
            >
              Open Recovery Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
