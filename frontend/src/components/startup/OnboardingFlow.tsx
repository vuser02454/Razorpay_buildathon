import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Check, Compass, Layers } from 'lucide-react';
import { StartupState, DEFAULT_DEMO_STARTUP } from '../../services/startupStore';

interface OnboardingFlowProps {
  onComplete: (data: Partial<StartupState>) => void;
  onCancel: () => void;
  initialData?: StartupState;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onCancel,
  initialData = DEFAULT_DEMO_STARTUP
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1: Idea
  const [startupIdea, setStartupIdea] = useState(initialData.startup_idea || '');
  const [startupCategory, setStartupCategory] = useState(initialData.startup_category || 'AI / SaaS');

  // Step 2: Target Customer
  const [targetCustomer, setTargetCustomer] = useState(initialData.target_customer || 'Small businesses');
  const [customerSegment, setCustomerSegment] = useState(initialData.customer_segment || 'Small & Mid-Market Retailers');
  const [icpDescription, setIcpDescription] = useState(initialData.icp_description || '');

  // Step 3: Problem & Current Solution
  const [problem, setProblem] = useState(initialData.problem || '');
  const [currentSolution, setCurrentSolution] = useState(initialData.current_solution || '');

  // Step 4: Market & Stage
  const [targetMarket, setTargetMarket] = useState(initialData.target_market || 'India & Southeast Asia');
  const [startupStage, setStartupStage] = useState(initialData.startup_stage || 'Prototype');

  // Step 5: Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    initialData.goals || [
      'Validate my idea',
      'Research my market',
      'Analyze competitors',
      'Build my business model',
      'Estimate revenue',
      'Create a launch strategy'
    ]
  );

  const categories = ['AI / SaaS', 'FinTech', 'HealthTech', 'Climate', 'Marketplace', 'Consumer', 'Other'];
  const customerTypes = ['Individual consumers', 'Small businesses', 'Startups', 'Enterprises', 'Developers', 'Students', 'Other'];
  const markets = ['Global', 'India', 'North America', 'Europe', 'Southeast Asia', 'Other'];
  const stages = ['Just an idea', 'Prototype', 'Early users', 'Revenue', 'Scaling'];
  const allGoals = [
    'Validate my idea',
    'Research my market',
    'Analyze competitors',
    'Find my ideal customers',
    'Build my business model',
    'Estimate revenue',
    'Create a launch strategy',
    'Identify risks',
    'Find experts'
  ];

  const toggleGoal = (g: string) => {
    if (selectedGoals.includes(g)) {
      setSelectedGoals(selectedGoals.filter((item) => item !== g));
    } else {
      setSelectedGoals([...selectedGoals, g]);
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Derive a clean startup name if none exists
      let derivedName = 'SupplyFlow AI';
      if (startupIdea.toLowerCase().includes('fintech') || startupCategory === 'FinTech') {
        derivedName = 'FinEdge AI';
      } else if (startupIdea.toLowerCase().includes('health') || startupCategory === 'HealthTech') {
        derivedName = 'CarePulse AI';
      } else if (startupIdea.toLowerCase().includes('supply') || startupIdea.toLowerCase().includes('logistics')) {
        derivedName = 'SupplyFlow AI';
      } else {
        const words = startupIdea.trim().split(' ');
        derivedName = words[0] ? words[0].replace(/[^a-zA-Z]/g, '') + ' AI' : 'VentureLab AI';
      }

      onComplete({
        startup_name: derivedName,
        startup_idea: startupIdea,
        startup_category: startupCategory,
        target_customer: targetCustomer,
        customer_segment: customerSegment,
        icp_description: icpDescription,
        problem,
        current_solution: currentSolution,
        target_market: targetMarket,
        startup_stage: startupStage,
        goals: selectedGoals
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-6 sm:p-12 font-sans">
      {/* Top Header with Brand & Exit */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm text-slate-950">Startup Architect</span>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          Exit to Home
        </button>
      </div>

      {/* Main Wizard Container */}
      <div
        onKeyDown={handleKeyDown}
        className="max-w-2xl w-full mx-auto my-8 bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/80 space-y-8 animate-fade-up"
      >
        {/* Step Indicator (01 / 05) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-bold text-slate-400">Step</span>
            <span className="text-sm font-extrabold text-slate-950 px-2 py-0.5 rounded-full bg-lime-200">
              0{step} / 05
            </span>
          </div>

          {/* Stepper Progress Dots */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-slate-950' : s < step ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── STEP 01 — STARTUP IDEA ── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                What's the idea?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tell us what you're building. Don't worry about making it perfect — we'll help structure it.
              </p>
            </div>

            <textarea
              rows={4}
              required
              value={startupIdea}
              onChange={(e) => setStartupIdea(e.target.value)}
              placeholder="Example: AI-powered supply chain platform for small businesses to predict stockouts and automate replenishment"
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition leading-relaxed shadow-inner"
            />

            {/* Category Suggestion Chips */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Category:
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setStartupCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      startupCategory === cat
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 02 — TARGET CUSTOMER ── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Who are you building for?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Who experiences this problem most?
              </p>
            </div>

            {/* Customer Type Chips */}
            <div className="flex flex-wrap gap-2">
              {customerTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTargetCustomer(type)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    targetCustomer === type
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Segment / Industry
                </label>
                <input
                  type="text"
                  value={customerSegment}
                  onChange={(e) => setCustomerSegment(e.target.value)}
                  placeholder="e.g. Small & Mid-Market Retailers with $1M-$10M revenue"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Describe your ideal customer persona (ICP)
                </label>
                <textarea
                  rows={2}
                  value={icpDescription}
                  onChange={(e) => setIcpDescription(e.target.value)}
                  placeholder="e.g. Operations managers managing 500+ SKUs across multiple distributor suppliers."
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 03 — PROBLEM ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                What problem are you solving?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                What is currently difficult, expensive, slow, or frustrating for your customer?
              </p>
            </div>

            <textarea
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="e.g. Small businesses struggle to predict supplier stockouts and lead time volatility, costing 12% margin leakage annually."
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition leading-relaxed shadow-inner"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                How do they solve it today?
              </label>
              <textarea
                rows={2}
                value={currentSolution}
                onChange={(e) => setCurrentSolution(e.target.value)}
                placeholder="e.g. Disjointed Excel spreadsheets, manual WhatsApp supplier follow-ups, and reactive emergency re-ordering."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
              />
            </div>
          </div>
        )}

        {/* ── STEP 04 — MARKET & STAGE ── */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Where do you want to build?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Select your target market & geographic corridor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {markets.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMarket(m)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    targetMarket === m
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                What stage are you at?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {stages.map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => setStartupStage(stg)}
                    className={`p-3 rounded-2xl border text-xs font-bold text-center transition cursor-pointer ${
                      startupStage === stg
                        ? 'bg-lime-200 border-lime-500 text-slate-950 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {stg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 05 — GOALS ── */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                What do you want Startup Architect to help with?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Select the strategic intelligence areas you want our agents to analyze.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {allGoals.map((g) => {
                const isSelected = selectedGoals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-lime-200 border-lime-500 text-slate-950 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span>✓ {g}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition shadow-md cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-lime-300 hover:bg-lime-200 text-slate-950 font-extrabold text-xs transition shadow-xl hover:scale-102 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>Build My Startup Strategy</span>
            </button>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400">
        Startup Architect AI &bull; Encrypted Founder Sandbox
      </div>
    </div>
  );
};
