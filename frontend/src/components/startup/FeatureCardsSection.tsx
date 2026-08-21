import React from 'react';
import { Lightbulb, Search, Rocket, CheckCircle2, ArrowRight, ShieldCheck, TrendingUp, Layers } from 'lucide-react';

interface FeatureCardsSectionProps {
  onSelectFeature: (feature: string) => void;
}

export const FeatureCardsSection: React.FC<FeatureCardsSectionProps> = ({ onSelectFeature }) => {
  return (
    <section id="features" className="py-24 px-4 bg-[#f8fafc] text-slate-900 border-t border-slate-200/80 transition-colors">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold">
            <span>The Startup Journey</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950">
            How Startup Architect Works
          </h2>
          <p className="text-sm text-slate-600">
            From raw concept to institutional execution — three core intelligence layers powering your venture.
          </p>
        </div>

        {/* 3 Numbered Editorial Cards: (01) DISCOVER, (02) INTELLIGENCE, (03) BUILD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 01: DISCOVER (Lime Green) */}
          <div
            onClick={() => onSelectFeature('discover')}
            className="card-lime rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[460px] group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Phase 01
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mt-1">
                    DISCOVER
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                  <span className="section-glyph">(01)</span>
                  <div className="w-7 h-7 rounded-full border border-slate-900/30 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 font-medium mt-3 leading-relaxed">
                Understand the idea. Deconstruct the initial thesis into falsifiable hypotheses and define who experiences the pain most.
              </p>
            </div>

            {/* Inset Photo */}
            <div className="my-6 rounded-2xl overflow-hidden h-40 w-full relative shadow-md">
              <img
                src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"
                alt="Product discovery and ideation"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] text-white font-semibold">
                  Hypothesis &amp; ICP Framing
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 text-xs text-slate-900 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Validate core problem &amp; current alternatives</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Define Ideal Customer Profile (ICP)</span>
              </div>
            </div>
          </div>

          {/* Card 02: INTELLIGENCE (Sky Blue) */}
          <div
            onClick={() => onSelectFeature('intelligence')}
            className="card-sky rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[460px] group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Phase 02
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mt-1">
                    INTELLIGENCE
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                  <span className="section-glyph">(02)</span>
                  <div className="w-7 h-7 rounded-full border border-slate-900/30 flex items-center justify-center">
                    <Search className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 font-medium mt-3 leading-relaxed">
                Let AI agents research the startup. Uncover market TAM, map competitor defensibility moats, and simulate unit economics.
              </p>
            </div>

            {/* Inset Photo */}
            <div className="my-6 rounded-2xl overflow-hidden h-40 w-full relative shadow-md">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                alt="Strategic market intelligence"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] text-white font-semibold">
                  Multi-Agent Market Scrapes
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 text-xs text-slate-900 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>TAM/SAM market sizing &amp; CAGR growth</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Competitor moat mapping &amp; pricing benchmark</span>
              </div>
            </div>
          </div>

          {/* Card 03: BUILD (Sage Green) */}
          <div
            onClick={() => onSelectFeature('build')}
            className="card-sage rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[460px] group"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Phase 03
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mt-1">
                    BUILD
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                  <span className="section-glyph">(03)</span>
                  <div className="w-7 h-7 rounded-full border border-slate-900/30 flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 font-medium mt-3 leading-relaxed">
                Turn intelligence into execution. Structure the recurring business model, design the outbound GTM engine, and safeguard recurring revenue.
              </p>
            </div>

            {/* Inset Photo */}
            <div className="my-6 rounded-2xl overflow-hidden h-40 w-full relative shadow-md">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
                alt="Business model and launch strategy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 text-[10px] text-white font-semibold">
                  Revenue Architecture &amp; GTM Sprint
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-1.5 text-xs text-slate-900 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>SaaS pricing tiers &amp; payback estimation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                <span>Built-in RecoverAI revenue protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
