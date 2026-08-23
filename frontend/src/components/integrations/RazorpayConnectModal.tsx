import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Cpu,
  Unlink,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { RazorpayConnectionStatus, RazorpayTestConnectionResponse } from '../../types';

interface RazorpayConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: RazorpayConnectionStatus) => void;
  initialEmail?: string;
}

export const RazorpayConnectModal: React.FC<RazorpayConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
}) => {
  // Wizard Steps: 1 = Verify Email, 2 = Authorize Razorpay, 3 = Connection Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Email & OTP states
  const [email, setEmail] = useState(initialEmail);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Step 2: Authorization states
  const [authorizing, setAuthorizing] = useState(false);

  // Step 3: Connection Complete states
  const [connection, setConnection] = useState<RazorpayConnectionStatus | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<RazorpayTestConnectionResponse | null>(null);

  // Friendly error message state (Zero technical SMTP/traceback leakage)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize initial email
  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  // Step 1: Request Verification Code
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid merchant email address.');
      return;
    }
    setErrorMsg(null);
    setSendingCode(true);
    try {
      const res = await api.requestRazorpayVerification(email);
      if (res.success) {
        setOtpSent(true);
        setMaskedEmail(res.masked_email || email);
        setCooldown(res.resend_cooldown_seconds || 45);
        setOtpValues(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMsg(res.message || 'Unable to send verification code. Please try again.');
        if (res.resend_cooldown_seconds) {
          setCooldown(res.resend_cooldown_seconds);
        }
      }
    } catch (err: any) {
      setErrorMsg('Unable to send verification code. Please try again in a moment.');
    } finally {
      setSendingCode(false);
    }
  };

  // Step 1: Handle OTP Inputs
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.slice(-1);
    setOtpValues(newOtp);
    setErrorMsg(null);

    // Auto advance focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const chars = pastedData.split('');
      setOtpValues(chars);
      inputRefs.current[5]?.focus();
    }
  };

  // Step 1: Verify OTP
  const handleVerifyOtp = async () => {
    const fullOtp = otpValues.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }
    setErrorMsg(null);
    setVerifyingOtp(true);
    try {
      const res = await api.verifyRazorpayOTP(email, fullOtp);
      if (res.success && res.verified) {
        // Proceed to Step 2: Authorize Razorpay
        setStep(2);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.message || "That code isn't correct. Please check your email and try again.");
        if (res.remaining_attempts !== undefined) {
          setRemainingAttempts(res.remaining_attempts);
        }
      }
    } catch (err: any) {
      setErrorMsg('Invalid or expired verification code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 2: Authorize Razorpay Gateway Connection
  const handleAuthorizeRazorpay = async () => {
    setErrorMsg(null);
    setAuthorizing(true);
    try {
      const res = await api.authorizeRazorpay(email);
      if (res.success && res.connection) {
        setConnection(res.connection);
        setStep(3);
        onSuccess(res.connection);
      } else {
        setErrorMsg('Razorpay authorization was not completed. You can try again.');
      }
    } catch (err: any) {
      setErrorMsg('We could not complete the connection. Please try again.');
    } finally {
      setAuthorizing(false);
    }
  };

  // Step 3: Run Real-time Connection Health Test
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.testRazorpayConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({
        success: false,
        status: 'error',
        message: 'Connection diagnostic test timed out.',
        latency_ms: 0,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Format countdown string "00:45"
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-8 relative text-white space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 3-Step Progress Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold tracking-wider uppercase">
            <span className={step === 1 ? 'text-lime-300' : step > 1 ? 'text-emerald-400' : 'text-slate-500'}>
              1. Verify Email {step > 1 && '✓'}
            </span>
            <span className="text-slate-600">───</span>
            <span className={step === 2 ? 'text-lime-300' : step > 2 ? 'text-emerald-400' : 'text-slate-500'}>
              2. Authorize Razorpay {step > 2 && '✓'}
            </span>
            <span className="text-slate-600">───</span>
            <span className={step === 3 ? 'text-lime-300 font-bold' : 'text-slate-500'}>
              3. Connection Complete {step === 3 && '✓'}
            </span>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
            />
          </div>
        </div>

        {/* Error Banner (Clean user-facing error message) */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-start gap-2 animate-fade-up">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: VERIFY EMAIL (OTP REQUEST & VERIFY)                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            {!otpSent ? (
              /* Step 1A: Enter Merchant Email */
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Secure Integration Verification</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                    Connect Razorpay Gateway
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    RecoverAI verifies merchant email ownership with a secure 6-digit verification code before linking your payment recovery workspace.
                  </p>
                </div>

                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      Razorpay Merchant Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="merchant@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-lime-300 transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingCode || !email}
                    className="w-full py-3.5 px-4 rounded-2xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {sendingCode ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Fintech Security Standard:</strong> RecoverAI never stores raw credentials. The code expires in 5 minutes and is dispatched directly via transactional mail.
                  </span>
                </div>
              </div>
            ) : (
              /* Step 1B: Enter 6-Digit OTP */
              <div className="space-y-5">
                <div className="space-y-1.5 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Verification Code Sent</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                    Verify your email
                  </h2>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Enter the 6-digit verification code sent to your registered email address.
                  </p>
                  <div className="pt-1">
                    <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-lime-300 border border-slate-700">
                      {maskedEmail}
                    </span>
                  </div>
                </div>

                {/* 6 Individual Digit Inputs */}
                <div className="flex justify-center gap-2 sm:gap-3 py-2">
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl bg-slate-950 border border-slate-700 text-lime-300 focus:outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-300/30 transition shadow-inner"
                    />
                  ))}
                </div>

                {/* Verification CTA Button */}
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpValues.join('').length !== 6}
                  className="w-full py-3.5 px-4 rounded-2xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {verifyingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Resend Code & Timer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-400 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSendCode()}
                    disabled={cooldown > 0 || sendingCode}
                    className="text-slate-300 hover:text-white font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Didn't receive the code? <span className="underline text-lime-300">Resend code</span>
                  </button>

                  {cooldown > 0 ? (
                    <span className="font-mono text-[11px] text-slate-400">
                      Resend available in <strong className="text-white">{formatCooldown(cooldown)}</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                    >
                      Change email
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: AUTHORIZE RAZORPAY GATEWAY                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email verified</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                Connect your Razorpay account
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your email has been verified. Continue to authorize RecoverAI to access the Razorpay data required for payment recovery.
              </p>
            </div>

            {/* Scope / Permissions Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Requested Scopes & Permissions
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-white">Payment monitoring:</strong> Listen to real-time <code>payment.failed</code> and <code>subscription.halted</code> webhook events.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-white">Payment status:</strong> Query issuer clearance, bank decline codes, and tokenized payment status references.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <strong className="text-white">Payment recovery data:</strong> Dispatch policy-approved smart retries and synchronized customer communication links.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAuthorizeRazorpay}
              disabled={authorizing}
              className="w-full py-3.5 px-4 rounded-2xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {authorizing ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Continue to Razorpay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: CONNECTION COMPLETE & STATUS                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-up">
            <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    ✓ Razorpay Connected
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                  CONNECTED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block uppercase">Merchant</span>
                  <strong className="text-white font-mono">{connection?.merchant_email || email}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-mono text-[10px] block uppercase">Status</span>
                  <strong className="text-emerald-400 font-mono">CONNECTED</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-mono text-[10px] block uppercase">Account ID</span>
                  <strong className="text-slate-300 font-mono">{connection?.account_id || 'acc_rzp_live'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-mono text-[10px] block uppercase">Last verified</span>
                  <strong className="text-slate-300">Just now</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 font-mono text-[10px] block uppercase mb-1.5">Permissions</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    Payment monitoring
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    Payment status
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    Payment recovery data
                  </span>
                </div>
              </div>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
                testResult.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-rose-950/40 border-rose-800 text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>{testResult.message}</span>
                  <span className="font-mono text-[11px]">{testResult.latency_ms}ms</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Testing Connection...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
