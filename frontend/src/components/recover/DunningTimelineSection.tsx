import React, { useState } from 'react';
import { Mail, MessageSquare, Smartphone, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export const DunningTimelineSection: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');

  const timeline = [
    { day: 'DAY 0', title: 'Payment Failed', action: 'Silent AI Triage', desc: 'Evaluates soft vs hard decline. If recoverable without bothering the customer, no message is sent.' },
    { day: 'DAY 3', title: 'Helpful Reminder', action: 'Gentle Notice', desc: 'Brief notification that auto-pay did not complete. Zero aggressive collection language.' },
    { day: 'DAY 7', title: 'Recovery Action', action: '1-Click Update', desc: 'Direct link to update expired card or switch to UPI Autopay / Netbanking in 30 seconds.' },
    { day: 'DAY 14', title: 'Escalation', action: 'WhatsApp / SMS', desc: 'Dispatches high-open rate channel reminder before service grace period restriction.' },
    { day: 'DAY 21', title: 'Re-engagement', action: 'Discount / Pause', desc: 'Offers 1-month pause or plan downgrade before involuntary churn occurs.' },
    { day: 'DAY 27', title: 'Final Recovery Attempt', action: 'Final Window', desc: 'Scheduled morning clearing retry before subscription cancellation.' },
  ];

  return (
    <section id="dunning-timeline" className="py-24 px-4 bg-[#f8fafc] text-slate-900 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <MessageSquare className="w-3.5 h-3.5 text-lime-400" />
            <span>Empathetic Multi-Channel Strategy</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
            Communicate Only When Necessary.
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Spamming subscribers after a transient network glitch destroys retention. RecoverAI coordinates communication across a measured 27-day lifecycle.
          </p>
        </div>

        {/* 27-Day Lifecycle Stepper */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            27-Day Coordinated Lifecycle
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {timeline.map((t, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-lime-300 inline-block mb-1.5">
                    {t.day}
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-950">{t.title}</h4>
                  <div className="text-[10px] font-semibold text-emerald-600">{t.action}</div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Channel Template Preview Box */}
        <div className="p-8 rounded-3xl bg-slate-950 text-white shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-mono text-lime-400 uppercase font-bold tracking-wider">
              Failure-Specific Copy Generation
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Personalized Multi-Channel Channels
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every message is dynamically personalized with the exact failure reason, the customer's name, and a tokenized Razorpay payment link.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedChannel('email')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedChannel === 'email' ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button
                onClick={() => setSelectedChannel('sms')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedChannel === 'sms' ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> SMS
              </button>
              <button
                onClick={() => setSelectedChannel('whatsapp')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedChannel === 'whatsapp' ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
              </button>
            </div>
          </div>

          {/* Right Preview Card */}
          <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3 font-sans">
            {selectedChannel === 'email' && (
              <div className="space-y-2 text-xs">
                <div className="text-[10px] text-slate-400 font-mono">FROM: billing@yourcompany.com &bull; TO: rahul.test@gmail.com</div>
                <div className="font-bold text-sm text-white">Update your payment method to keep your subscription active</div>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 space-y-2 leading-relaxed">
                  <p>Hi Rahul,</p>
                  <p>We noticed that your saved payment card for your recurring subscription of <strong>₹2,000.00</strong> has expired.</p>
                  <p>To ensure your service continues without interruption, please take 30 seconds to update your card:</p>
                  <div className="pt-2">
                    <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-block">
                      👉 Update Payment Method Securely
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedChannel === 'sms' && (
              <div className="space-y-2 text-xs">
                <div className="text-[10px] text-slate-400 font-mono">SMS GATEWAY &bull; TO: +91 98100 88219</div>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 leading-relaxed">
                  Hi Rahul, your card for your subscription (₹2,000.00) expired. Tap to update in 30 sec & avoid disruption: https://recover.ai/pay/pay_rp_1001
                </div>
              </div>
            )}

            {selectedChannel === 'whatsapp' && (
              <div className="space-y-2 text-xs">
                <div className="text-[10px] text-slate-400 font-mono">WHATSAPP BUSINESS API (VERIFIED)</div>
                <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] text-[#e9edef] space-y-2 leading-relaxed">
                  <p>👋 Hello <strong>Rahul</strong>,</p>
                  <p>Your saved card has expired for your monthly renewal of <strong>₹2,000.00</strong>.</p>
                  <p>Please update your card securely in under 30 seconds:</p>
                  <p className="text-emerald-400 font-mono">🔗 https://recover.ai/pay/pay_rp_1001</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
