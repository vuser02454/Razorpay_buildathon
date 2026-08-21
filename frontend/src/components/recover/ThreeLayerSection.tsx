import React from 'react';
import { ShieldCheck, SlidersHorizontal, RefreshCw, MessageSquare, ArrowUpRight, CheckCircle2, Zap } from 'lucide-react';

interface ThreeLayerSectionProps {
  onExploreLayer: (layer: string) => void;
}

export const ThreeLayerSection: React.FC<ThreeLayerSectionProps> = ({ onExploreLayer }) => {
  return (
    <section id="three-layer" className="py-24 px-4 bg-[#f0faf7] text-slate-900 border-t border-slate-200/80 transition-colors">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <span>Three Core Intelligence Layers</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 uppercase">
            Prevent. Decide. Recover.
          </h2>
          <p className="text-sm text-slate-600">
            A three-tier operational defense turning payment failures into intelligent recovery decisions.
          </p>
        </div>

        {/* 3 Numbered Editorial Cards: (01) PREVENT, (02) DECIDE, (03) RECOVER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 01: PREVENT (Lime Green) */}
          <div
            onClick={() => onExploreLayer('prevent')}
            className="card-lime rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[460px] group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Tier 01
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mt-1 uppercase">
                    PREVENT
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                  <span className="section-glyph">(01)</span>
                  <div className="w-7 h-7 rounded-full border border-slate-900/30 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 font-medium mt-3 leading-relaxed">
                Prevent unnecessary retries before they incur gateway decline penalty fees or damage customer goodwill.
              </p>
            </div>

            {/* Middle Inset Photo */}
            <div className="my-6 rounded-2xl overflow-hidden h-40 w-full relative shadow-md">
              <img
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"
                alt="Payment prevention monitoring"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] text-white font-semibold">
                  Credential Verification &amp; Risk Guard
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 text-xs text-slate-900 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Expired card &amp; stolen/lost card blocking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Card network constraint caps (Max 3 retries)</span>
              </div>
            </div>
          </div>

          {/* Card 02: DECIDE (Sky Blue) */}
          <div
            onClick={() => onExploreLayer('decide')}
            className="card-sky rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[460px] group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Tier 02
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mt-1 uppercase">
                    DECIDE
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                  <span className="section-glyph">(02)</span>
                  <div className="w-7 h-7 rounded-full border border-slate-900/30 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 font-medium mt-3 leading-relaxed">
                Let AI determine the correct recovery action based on probabilistic scoring and deterministic safety policies.
              </p>
            </div>

            {/* Telemetry Inset Box */}
            <div className="my-6 p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-950">
                <span>Optimal Retry Window</span>
                <span className="font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full font-bold">09:30 AM Slot</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>Recovery Probability:</span>
                <span className="text-lg font-black text-slate-950 font-mono">74%</span>
              </div>
              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '74%' }} />
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 text-xs text-slate-900 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Soft vs hard failure classification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Human operator review routing (&gt;₹10,000)</span>
              </div>
            </div>
          </div>

          {/* Card 03: RECOVER (Sage Green) */}
          <div
            onClick={() => onExploreLayer('recover')}
            className="card-sage rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[460px] group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Tier 03
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mt-1 uppercase">
                    RECOVER
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                  <span className="section-glyph">(03)</span>
                  <div className="w-7 h-7 rounded-full border border-slate-900/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 font-medium mt-3 leading-relaxed">
                Execute the correct recovery strategy: smart gateway retries, failure-specific dunning, and payment update links.
              </p>
            </div>

            {/* Inset Photo */}
            <div className="my-6 rounded-2xl overflow-hidden h-40 w-full relative shadow-md">
              <img
                src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=800&q=80"
                alt="Multi-channel recovery communication"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] text-white font-semibold">
                  1-Click Razorpay Update Links
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 text-xs text-slate-900 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Automated morning clearing retries</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Empathetic, failure-tailored WhatsApp &amp; Email</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
