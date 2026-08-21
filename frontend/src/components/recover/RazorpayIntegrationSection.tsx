import React from 'react';
import { ShieldCheck, ArrowRight, Zap, CheckCircle2, Lock, Key } from 'lucide-react';

interface RazorpayIntegrationSectionProps {
  onOpenSandbox: () => void;
}

export const RazorpayIntegrationSection: React.FC<RazorpayIntegrationSectionProps> = ({ onOpenSandbox }) => {
  return (
    <section id="integrations" className="py-24 px-4 bg-white text-slate-900 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-950 text-white shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Razorpay Production Gateway &bull; Active Connection</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Built for the Razorpay Ecosystem.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Native recurring payment webhooks, subscription billing synchronization, and tokenized payment link dispatch.
              </p>
            </div>

            <button
              onClick={onOpenSandbox}
              className="px-6 py-3 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>Simulate Gateway Event</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Subscription Webhook Ingestion</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Listens to <code>payment.failed</code>, <code>subscription.halted</code>, and <code>invoice.paid</code> events.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Zero Raw Card Storage</span>
              </div>
              <p className="text-[11px] text-slate-400">
                PCI-DSS Level 1 compliant. Zero PAN/CVV storage. Only tokenized customer references are managed.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Supabase PostgreSQL Sync</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Persistent audit log and immutable decision records stored with Row-Level Security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
