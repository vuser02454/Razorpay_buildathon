import React, { useState } from 'react';
import { ArrowRight, Compass, CheckCircle2 } from 'lucide-react';

interface StartJourneySectionProps {
  onGetStarted: (email: string) => void;
}

export const StartJourneySection: React.FC<StartJourneySectionProps> = ({ onGetStarted }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      onGetStarted(email);
    }, 600);
  };

  return (
    <section className="py-20 px-4 bg-white text-slate-900 border-t border-slate-100">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Form & Map Grid (Matching Reference Screenshot 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Side: Form */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Start Your Journey
              </h2>
              <p className="text-xs text-slate-500">
                Create your account and begin earning validation today.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  First name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Last name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center gap-2"
              >
                <span>{submitted ? 'Setting up Workspace...' : 'Claim My Spot'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Right Side: Network Vector Graphic + Pedestrian Photo (Matching Reference) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {/* Vector Network Routes */}
              <svg viewBox="0 0 400 350" fill="none" className="w-full h-full stroke-slate-200">
                <path d="M40 80 L360 80 M40 180 L360 180 M40 280 L360 280" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M80 40 L80 320 M180 40 L180 320 M280 40 L280 320" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Active Waypoints */}
                <path d="M70 270 Q 150 180 230 190 T 320 70" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                <circle cx="70" cy="270" r="10" fill="#93c5fd" />
                <circle cx="230" cy="190" r="8" fill="#bef264" />
                <circle cx="320" cy="70" r="10" fill="#0f172a" />
              </svg>

              {/* Inset Pedestrian Photo (Matching Reference Screenshot 5) */}
              <div className="absolute bottom-6 right-6 w-32 h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-white">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80"
                  alt="Founder moving forward"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reference Clean Footer */}
        <footer className="pt-12 border-t border-slate-200 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                <Compass className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-900">Startup Architect</span>
            </div>

            <div className="flex items-center gap-6 font-medium">
              <a href="#privacy" className="hover:text-slate-900 transition">Privacy Policy</a>
              <a href="#accessibility" className="hover:text-slate-900 transition">Accessibility Statement</a>
              <a href="#features" className="hover:text-slate-900 transition">Features</a>
              <a href="#benefits" className="hover:text-slate-900 transition">Benefits</a>
              <a href="#contacts" className="hover:text-slate-900 transition">Contacts</a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div>
              Tel: +1 (415) 890-2026 &bull; San Francisco, CA & Bengaluru, IN
            </div>
            <div>
              &copy; 2026 Startup Architect. Powered by Autonomous AI Systems.
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};
