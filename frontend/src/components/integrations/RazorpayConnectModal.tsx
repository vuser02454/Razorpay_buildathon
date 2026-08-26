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
  Key,
  Check,
  Eye,
  EyeOff,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { RazorpayConnectionStatus, RazorpayTestConnectionResponse } from '../../types';
import { RazorpayGatewayModal } from './RazorpayGatewayModal';

interface RazorpayConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: RazorpayConnectionStatus) => void;
  initialEmail?: string;
}

// Global helper to trigger official Razorpay Standard Checkout SDK
export const launchRazorpayCheckout = (options: {
  keyId?: string;
  amount?: number; // In INR
  currency?: string;
  name?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (response: any) => void;
  onDismiss?: () => void;
}) => {
  const openModal = () => {
    if (typeof window === 'undefined') return;
    const rzpClass = (window as any).Razorpay;
    if (!rzpClass) {
      alert('Razorpay Checkout SDK is loading. Please try again in 2 seconds.');
      return;
    }

    const rzpOptions = {
      key: options.keyId || 'rzp_test_mock_recoverai',
      amount: Math.round((options.amount || 2500) * 100), // amount in paise
      currency: options.currency || 'INR',
      name: options.name || 'RecoverAI — Payment Recovery',
      description: options.description || 'Verified Payment Recovery Sandbox Transaction',
      image: '/favicon.svg',
      handler: function (response: any) {
        if (options.onSuccess) {
          options.onSuccess(response);
        }
      },
      prefill: {
        name: options.customerName || 'Merchant Admin',
        email: options.customerEmail || 'merchant@company.com',
        contact: options.customerPhone || '+919876543210',
      },
      notes: {
        platform: 'RecoverAI Track 3',
        source: 'Recovery Gateway Live Test',
      },
      theme: {
        color: '#84cc16', // RecoverAI Lime Theme
      },
      modal: {
        ondismiss: function () {
          if (options.onDismiss) options.onDismiss();
        },
      },
    };

    const rzp = new rzpClass(rzpOptions);
    rzp.open();
  };

  // If script not loaded yet, inject and open
  if (typeof window !== 'undefined' && !(window as any).Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => openModal();
    document.body.appendChild(script);
  } else {
    openModal();
  }
};

export const RazorpayConnectModal: React.FC<RazorpayConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
}) => {
  // Method selection: 'api_keys' or 'email_otp'
  const [connectMethod, setConnectMethod] = useState<'api_keys' | 'email_otp'>('api_keys');

  // Wizard Steps: 1 = Input Credentials/Email, 2 = Authorize, 3 = Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Method 1: API Keys states
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  // Method 2: Email & OTP states
  const [email, setEmail] = useState(initialEmail);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Authorization states
  const [authorizing, setAuthorizing] = useState(false);

  // Connection Complete states
  const [connection, setConnection] = useState<RazorpayConnectionStatus | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<RazorpayTestConnectionResponse | null>(null);
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState<string | null>(null);
  const [showGatewayModal, setShowGatewayModal] = useState(false);

  // Error message state
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

  // Handle direct API Keys submit
  const handleConnectWithApiKeys = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyId.trim()) {
      setErrorMsg('Please enter your Razorpay Key ID (e.g. rzp_test_... or rzp_live_...)');
      return;
    }

    setErrorMsg(null);
    setSavingKeys(true);
    try {
      const res = await api.authorizeRazorpay(
        email || 'admin@company.com',
        keyId.slice(0, 14),
        'Razorpay Gateway',
        keyId.trim(),
        keySecret.trim()
      );
      if (res.success && res.connection) {
        setConnection(res.connection);
        setStep(3);
        onSuccess(res.connection);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else {
        setErrorMsg(res.message || 'Unable to connect with provided Razorpay API keys.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate Razorpay API keys. Please verify your credentials.');
    } finally {
      setSavingKeys(false);
    }
  };

  // Step 1: Request Verification Code (Email OTP method)
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
        setStep(2);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.message || "That code isn't correct. Please check your email and try again.");
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
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
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

  // Open the Razorpay Gateway Modal
  const handleOpenLiveCheckout = () => {
    setShowGatewayModal(true);
  };

  // Format countdown string "00:45"
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-stretch sm:items-center sm:justify-center bg-slate-950/85 backdrop-blur-md sm:p-4 overflow-hidden sm:overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl bg-slate-900 sm:bg-slate-900/95 border-none sm:border border-slate-700/80 rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl p-5 sm:p-8 relative text-white space-y-5 sm:space-y-6 overflow-hidden sm:overflow-y-auto flex flex-col justify-between sm:block"
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
              1. Credentials {step > 1 && '✓'}
            </span>
            <span className="text-slate-600">───</span>
            <span className={step === 2 ? 'text-lime-300' : step > 2 ? 'text-emerald-400' : 'text-slate-500'}>
              2. Permissions {step > 2 && '✓'}
            </span>
            <span className="text-slate-600">───</span>
            <span className={step === 3 ? 'text-lime-300 font-bold' : 'text-slate-500'}>
              3. Live Gateway {step === 3 && '✓'}
            </span>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-start gap-2 animate-fade-up">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Checkout Success Banner */}
        {checkoutSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-start gap-2 animate-fade-up">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{checkoutSuccessMsg}</div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: CREDENTIALS / EMAIL                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Razorpay Gateway Integration</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                Connect Razorpay Gateway
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your Razorpay account to listen to real-time subscription declines and execute automated smart retries.
              </p>
            </div>

            {/* Connection Method Selector Tabs */}
            <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => { setConnectMethod('api_keys'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  connectMethod === 'api_keys'
                    ? 'bg-lime-300 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Razorpay API Keys</span>
              </button>
              <button
                type="button"
                onClick={() => { setConnectMethod('email_otp'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  connectMethod === 'email_otp'
                    ? 'bg-lime-300 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email OTP Verification</span>
              </button>
            </div>

            {/* TAB 1: API KEYS INPUT */}
            {connectMethod === 'api_keys' && (
              <form onSubmit={handleConnectWithApiKeys} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Razorpay Key ID
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="rzp_test_... or rzp_live_..."
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-lime-300 transition"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Found in your Razorpay Dashboard &gt; Settings &gt; API Keys.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Razorpay Key Secret (Optional)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showKeySecret ? 'text' : 'password'}
                      placeholder="Enter Key Secret"
                      value={keySecret}
                      onChange={(e) => setKeySecret(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-lime-300 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeySecret(!showKeySecret)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Merchant Email Reference
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="merchant@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-lime-300 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={savingKeys || !keyId}
                    className="flex-1 py-3.5 px-4 rounded-2xl bg-lime-300 hover:bg-lime-200 text-slate-950 font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingKeys ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>Connect & Verify Gateway</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenLiveCheckout}
                    className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-lime-400" />
                    <span>Open Checkout Popup</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: EMAIL OTP VERIFICATION */}
            {connectMethod === 'email_otp' && (
              <div className="space-y-4 pt-1">
                {!otpSent ? (
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
                          <span>Send 6-Digit Code via Gmail SMTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-lime-300 border border-slate-700">
                        Code sent to {maskedEmail}
                      </span>
                    </div>

                    <div className="flex justify-center gap-2 py-2">
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
                          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-2xl bg-slate-950 border border-slate-700 text-lime-300 focus:outline-none focus:border-lime-300 transition"
                        />
                      ))}
                    </div>

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
                          <span>Verify & Proceed</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSendCode()}
                        disabled={cooldown > 0 || sendingCode}
                        className="text-slate-300 hover:text-white font-semibold transition"
                      >
                        Resend code {cooldown > 0 && `(${formatCooldown(cooldown)})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        Change email
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: AUTHORIZE RAZORPAY GATEWAY (OTP FLOW)                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email verified</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                Authorize Gateway Scopes
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                RecoverAI requests permission to monitor payment failures and execute deterministic recovery retries.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div><strong className="text-white">Payment monitoring:</strong> Ingest <code>payment.failed</code> and <code>subscription.halted</code> webhook events.</div>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div><strong className="text-white">Payment recovery data:</strong> Issue tokenized smart retries and Gmail SMTP 1-click recovery links.</div>
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
                  <span>Complete Gateway Connection</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 3: CONNECTION COMPLETE & LIVE CHECKOUT TEST                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-up">
            <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    ✓ Razorpay Connected & Active
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                  CONNECTED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block uppercase">Merchant</span>
                  <strong className="text-white font-mono">{connection?.merchant_email || email || 'Verified Merchant'}</strong>
                </div>

                <div>
                  <span className="text-slate-500 font-mono text-[10px] block uppercase">Key ID</span>
                  <strong className="text-lime-300 font-mono">{keyId || connection?.key_id || 'rzp_test_active'}</strong>
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
            <div className="space-y-3">
              {/* Prominent Button to Open Official Razorpay Checkout Modal */}
              <button
                type="button"
                onClick={handleOpenLiveCheckout}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm transition shadow-xl flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span>Open Live Razorpay Checkout Modal (Test Gateway)</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'Testing...' : 'Ping Gateway API'}</span>
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
          </div>
        )}

        {/* In-App Interactive Razorpay Gateway Modal */}
        <RazorpayGatewayModal
          isOpen={showGatewayModal}
          onClose={() => setShowGatewayModal(false)}
          amount={2500}
          currency="INR"
          merchantName="RecoverAI Payment Recovery Gateway"
          description="Live Gateway Connection Test"
          customerName={email.split('@')[0] || 'Merchant Admin'}
          customerEmail={email || 'admin@company.com'}
          keyId={keyId || connection?.key_id}
          onSuccess={(details) => {
            setShowGatewayModal(false);
            setCheckoutSuccessMsg(`✓ Real-time Razorpay Payment Succeeded! (ID: ${details.razorpay_payment_id})`);
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
          }}
        />
      </div>
    </div>
  );
};
