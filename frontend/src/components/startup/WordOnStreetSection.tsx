import React from 'react';

export const WordOnStreetSection: React.FC = () => {
  return (
    <section className="py-24 px-4 bg-[#bef264] text-slate-950 overflow-hidden relative">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Vector Journey Route Map (Matching Reference) */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="relative w-full max-w-sm aspect-square">
            {/* SVG Vector Map */}
            <svg
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full opacity-60 stroke-slate-900"
            >
              {/* Street Grid Lines */}
              <path d="M50 80 L350 80 M50 160 L350 160 M50 240 L350 240 M50 320 L350 320" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M80 50 L80 350 M160 50 L160 350 M240 50 L240 350 M320 50 L320 350" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Diagonal Routes */}
              <path d="M60 340 L180 220 L300 280 L340 100" strokeWidth="1.5" />
              
              {/* Curved Active Journey Path */}
              <path
                d="M70 330 Q 120 280 180 250 T 290 140 T 330 90"
                stroke="#0f172a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="animate-pulse"
              />
              
              {/* Point A Node */}
              <circle cx="70" cy="330" r="18" fill="#bef264" stroke="#0f172a" strokeWidth="2.5" />
              <text x="70" y="335" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a">A</text>
              
              {/* Point B Node */}
              <circle cx="330" cy="90" r="18" fill="#bef264" stroke="#0f172a" strokeWidth="2.5" />
              <text x="330" y="95" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a">B</text>
              
              {/* Midpoint Agent Waypoint Icon */}
              <circle cx="200" cy="235" r="14" fill="#0f172a" />
            </svg>

            {/* Inset Photo Badge (Matching Reference) */}
            <div className="absolute top-4 left-4 w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-900 shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
                alt="Founder milestone"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Editorial Quote (Matching Reference Typography) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-slate-800">
            Word on the Street
          </div>

          <blockquote className="text-2xl sm:text-4xl md:text-5xl font-normal tracking-tight leading-[1.15] text-slate-950">
            &ldquo;Startup Architect completely changed how we looked at our customer acquisition model. Earning validation before spending capital was brilliant.&rdquo;
          </blockquote>

          <div className="pt-2">
            <div className="text-base font-bold text-slate-950">Olesia Vance</div>
            <div className="text-xs text-slate-800 font-medium">Founder & CEO, Nimbus Commute</div>
          </div>
        </div>
      </div>
    </section>
  );
};
