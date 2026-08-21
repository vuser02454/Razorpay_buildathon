import React from 'react';

export const WhyBuildWithUsSection: React.FC = () => {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Main Photo Banner with Floating Overlay Cards (Matching Screenshot 4) */}
        <div className="relative rounded-3xl overflow-hidden min-h-[520px] sm:min-h-[580px] flex items-end p-6 sm:p-10">
          {/* Photography Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80"
              alt="Founders working together"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          </div>

          {/* Top Title */}
          <div className="absolute top-8 left-8 sm:left-10 z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why Build <br />
              with Us
            </h2>
          </div>

          {/* Floating Metric Overlay Cards */}
          <div className="relative z-10 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Overlay Card 01 (White Matte) */}
            <div className="p-5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-900 space-y-1.5 shadow-lg">
              <div className="text-[10px] font-mono font-bold text-slate-500">(01)</div>
              <h4 className="text-base font-bold">Capital-Efficient Routine</h4>
              <p className="text-xs text-slate-600 leading-snug">
                Reduce premature engineering spend by validating demand first.
              </p>
            </div>

            {/* Overlay Card 02 (Dark Matte) */}
            <div className="p-5 rounded-2xl bg-slate-900/90 backdrop-blur-md text-white space-y-1.5 border border-white/10 shadow-lg">
              <div className="text-[10px] font-mono font-bold text-slate-400">(02)</div>
              <h4 className="text-base font-bold">Zero Blindspots</h4>
              <p className="text-xs text-slate-400 leading-snug">
                LangGraph agents continuously probe competitor pricing & moat gaps.
              </p>
            </div>

            {/* Overlay Card 03 (Sky Blue with Vector Line Chart) */}
            <div className="p-5 rounded-2xl bg-[#bae6fd] text-slate-950 space-y-2 shadow-lg">
              <div className="text-[10px] font-mono font-bold text-slate-800">(03)</div>
              <h4 className="text-base font-bold">Health Score Traction</h4>

              {/* Vector Sparkline */}
              <div className="h-10 w-full flex items-end">
                <svg viewBox="0 0 200 40" fill="none" className="w-full h-full stroke-slate-950 stroke-2">
                  <path d="M5 30 L50 20 L100 28 L150 10 L195 5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="5" cy="30" r="3" fill="#0f172a" />
                  <circle cx="50" cy="20" r="3" fill="#0f172a" />
                  <circle cx="100" cy="28" r="3" fill="#0f172a" />
                  <circle cx="150" cy="10" r="3" fill="#0f172a" />
                  <circle cx="195" cy="5" r="4" fill="#0f172a" />
                </svg>
              </div>

              <p className="text-[11px] font-medium text-slate-800">
                Live traction telemetry scored from 0 to 100
              </p>
            </div>
          </div>
        </div>

        {/* Driven by Real Impact Quote (Matching Reference Bottom Split) */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-t border-slate-100">
          <div className="md:col-span-3 text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
            Driven by Real Impact
          </div>
          <div className="md:col-span-9 space-y-4">
            <blockquote className="text-xl sm:text-3xl font-normal text-slate-950 tracking-tight leading-snug">
              &ldquo;Startup Architect gave our seed round the exact defensibility narrative our investors were looking for. The unit economics builder alone paid for itself 100x.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                alt="Joris Thome"
                className="w-9 h-9 rounded-full object-cover border border-slate-300"
              />
              <div>
                <div className="text-xs font-bold text-slate-950">Joris Thome</div>
                <div className="text-[11px] text-slate-500">Co-Founder, Synthetix AI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
