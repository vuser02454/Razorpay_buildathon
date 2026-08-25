import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  QrCode,
  Sparkles,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RazorpayGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: string;
  merchantName?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  keyId?: string | null;
  paymentId?: string;
  onSuccess: (paymentDetails: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    method: string;
  }) => void;
}

export const RazorpayGatewayModal: React.FC<RazorpayGatewayModalProps> = ({
  isOpen,
  onClose,
  amount = 2500,
  currency = 'INR',
  merchantName = 'RecoverAI Subscription Recovery',
  description = 'Smart Payment Recovery Transaction',
  customerName = 'Merchant Admin',
  customerEmail = 'admin@company.com',
  customerPhone = '+91 98765 43210',
  keyId,
  paymentId,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'upi' | 'netbanking' | 'wallet'>('card');
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [cardHolder, setCardHolder] = useState(customerName);
  
  // UPI Form State
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [upiMode, setUpiMode] = useState<'qr' | 'vpa'>('qr');
  
  // Netbanking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  
  // Wallet State
  const [selectedWallet, setSelectedWallet] = useState('Paytm');

  // Processing & Simulation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedPaymentId, setGeneratedPaymentId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setIsCompleted(false);
      setGeneratedPaymentId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    setProcessingStep('Connecting to Razorpay Banking Gateway...');

    setTimeout(() => {
      setProcessingStep('Simulating 3D Secure / OTP clearance...');
    }, 900);

    setTimeout(() => {
      setProcessingStep('Authorizing recurring subscription clearance...');
    }, 1800);

    setTimeout(() => {
      const pId = `pay_rzp_${Math.random().toString(36).substring(2, 11)}`;
      setGeneratedPaymentId(pId);
      setIsProcessing(false);
      setIsCompleted(true);
      
      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.5 },
      });

      setTimeout(() => {
        onSuccess({
          razorpay_payment_id: pId,
          razorpay_order_id: `order_${Math.random().toString(36).substring(2, 10)}`,
          method: activeTab,
        });
      }, 1400);
    }, 2600);
  };

  const sym = currency === 'INR' ? '₹' : '$';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-between pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-display tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-[#3395ff] font-extrabold italic text-2xl">R</span>
                  <span>Razorpay</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#3395ff]/20 text-[#68b5ff] font-mono text-[10px] font-bold border border-[#3395ff]/30">
                  {keyId ? 'LIVE GATEWAY' : 'SANDBOX TEST'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate max-w-xs sm:max-w-sm">
                {merchantName}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Amount</span>
              <span className="text-2xl sm:text-3xl font-black font-display text-white">
                {sym}{amount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-bit SSL Secured by Razorpay</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {paymentId || 'pay_ref_auto'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        {isCompleted ? (
          /* Step 3: Success Screen */
          <div className="p-8 text-center space-y-5 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/20 animate-bounce">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black font-display uppercase tracking-tight text-slate-950 dark:text-white">
                Payment Succeeded!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                Transaction cleared successfully via Razorpay Gateway. Subscription has been recovered and updated in RecoverAI.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1.5 max-w-sm mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{generatedPaymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900 dark:text-white">{sym}{amount.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">CAPTURED</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full max-w-sm py-3.5 px-6 rounded-2xl bg-[#0c2340] hover:bg-[#14325a] text-white font-bold text-xs transition shadow-lg cursor-pointer"
            >
              Continue to RecoverAI
            </button>
          </div>
        ) : isProcessing ? (
          /* Step 2: Processing Screen */
          <div className="p-10 text-center space-y-6 animate-fade-up">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-[#3395ff] animate-spin" />
              <Lock className="w-6 h-6 text-[#3395ff] absolute" />
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-bold font-display uppercase tracking-tight text-slate-900 dark:text-white">
                Processing Secure Payment
              </h4>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 animate-pulse">
                {processingStep}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[11px] text-blue-700 dark:text-blue-300 max-w-sm mx-auto">
              Please do not close this window or refresh the page while the bank authenticates your transaction.
            </div>
          </div>
        ) : (
          /* Step 1: Payment Method Selection & Form */
          <div className="flex flex-col sm:flex-row min-h-[380px]">
            {/* Left Nav Tabs */}
            <div className="w-full sm:w-44 bg-slate-50 dark:bg-slate-950/80 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex sm:flex-col gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  activeTab === 'card'
                    ? 'bg-white dark:bg-slate-800 text-[#3395ff] shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  activeTab === 'upi'
                    ? 'bg-white dark:bg-slate-800 text-[#3395ff] shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  activeTab === 'netbanking'
                    ? 'bg-white dark:bg-slate-800 text-[#3395ff] shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Netbanking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('wallet')}
                className={`flex-1 sm:flex-none flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  activeTab === 'wallet'
                    ? 'bg-white dark:bg-slate-800 text-[#3395ff] shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Wallets</span>
              </button>
            </div>

            {/* Right Form Panel */}
            <div className="flex-1 p-5 sm:p-6 space-y-4">
              {/* TAB 1: CARDS */}
              {activeTab === 'card' && (
                <div className="space-y-3.5 animate-fade-up">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#3395ff] transition"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold text-[9px]">VISA</span>
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-[9px]">MC</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#3395ff] transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#3395ff] transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Name on card"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#3395ff] transition"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: UPI / QR */}
              {activeTab === 'upi' && (
                <div className="space-y-3.5 animate-fade-up">
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setUpiMode('qr')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        upiMode === 'qr'
                          ? 'bg-white dark:bg-slate-800 text-[#3395ff] shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMode('vpa')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        upiMode === 'vpa'
                          ? 'bg-white dark:bg-slate-800 text-[#3395ff] shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>UPI ID / VPA</span>
                    </button>
                  </div>

                  {upiMode === 'qr' ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border border-slate-300 shadow-inner flex items-center justify-center">
                        <div className="grid grid-cols-5 gap-1.5 w-full h-full p-2 bg-slate-950 rounded-lg">
                          {Array.from({ length: 25 }).map((_, i) => (
                            <div
                              key={i}
                              className={`rounded-xs ${
                                (i % 2 === 0 || i % 3 === 0) ? 'bg-white' : 'bg-[#3395ff]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Scan with Google Pay, PhonePe, Paytm, or BHIM
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                        Virtual Payment Address (UPI ID)
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="username@okhdfcbank"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#3395ff] transition"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: NETBANKING */}
              {activeTab === 'netbanking' && (
                <div className="space-y-3 animate-fade-up">
                  <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Select Indian Bank
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Yes Bank'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          selectedBank === b
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-[#3395ff] text-[#3395ff]'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{b}</span>
                        {selectedBank === b && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: WALLETS */}
              {activeTab === 'wallet' && (
                <div className="space-y-3 animate-fade-up">
                  <label className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Select Digital Wallet
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Paytm Wallet', 'PhonePe', 'Amazon Pay', 'MobiKwik'].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSelectedWallet(w)}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          selectedWallet === w
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-[#3395ff] text-[#3395ff]'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{w}</span>
                        {selectedWallet === w && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full py-3.5 px-4 rounded-xl bg-[#3395ff] hover:bg-[#2085f0] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm transition shadow-lg shadow-[#3395ff]/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>Pay {sym}{amount.toLocaleString()}.00 via Razorpay</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-slate-400 font-mono">
                PCI-DSS Level 1 &bull; Instant Tokenization &bull; Auto-Recovery
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
