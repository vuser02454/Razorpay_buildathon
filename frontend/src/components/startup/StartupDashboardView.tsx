import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  CircleDot,
  Circle,
  Lightbulb,
  Search,
  Layers,
  Users,
  DollarSign,
  Rocket,
  ShieldCheck,
  Award,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { StartupState, DEFAULT_DEMO_STARTUP } from '../../services/startupStore';

interface StartupDashboardProps {
  onOpenAIArchitect: (topic?: string) => void;
  startupData?: StartupState;
}

export const StartupDashboardView: React.FC<StartupDashboardProps> = ({
  onOpenAIArchitect,
  startupData = DEFAULT_DEMO_STARTUP
}) => {
  const startupName = startupData.startup_name || 'SupplyFlow AI';
  const subtitle = startupData.startup_idea || 'AI-powered supply chain intelligence for small businesses';
  const healthScore = startupData.health_score || 78;

  const modules = [
    {
      id: 'idea_validation',
      title: 'Idea Validation',
      status: 'completed',
      score: '92% Viability',
      description: `Validated ${startupData.startup_category} concept for ${startupData.target_customer}.`,
      icon: Lightbulb,
      color: 'bg-lime-100 text-slate-950 border-lime-400',
      tag: 'Ready for Build'
    },
    {
      id: 'market_research',
      title: 'Market Research',
      status: 'completed',
      score: 'High Growth Sector',
      description: `Targeting ${startupData.target_market} with focus on ${startupData.customer_segment}.`,
      icon: Search,
      color: 'bg-sky-100 text-slate-950 border-sky-400',
      tag: startupData.target_market
    },
    {
      id: 'competitor_analysis',
      title: 'Competitor Analysis',
      status: 'completed',
      score: '3 Moats Identified',
      description: `Displacing current alternative: ${startupData.current_solution || 'manual spreadsheets'}.`,
      icon: Layers,
      color: 'bg-indigo-100 text-slate-950 border-indigo-400',
      tag: 'Moat: High'
    },
    {
      id: 'business_model',
      title: 'Business Model',
      status: 'in_progress',
      score: 'In Progress (75%)',
      description: 'SaaS recurring subscription model with volume-based usage tiers.',
      icon: DollarSign,
      color: 'bg-amber-100 text-slate-950 border-amber-400',
      tag: 'LTV:CAC 4.2x'
    },
    {
      id: 'customer_discovery',
      title: 'Customer Discovery',
      status: 'in_progress',
      score: '14 Pilot Interviews',
      description: `Core pain verified: ${startupData.problem?.slice(0, 75) || 'stockouts and volatility'}...`,
      icon: Users,
      color: 'bg-purple-100 text-slate-950 border-purple-400',
      tag: 'ICP Defined'
    },
    {
      id: 'revenue_strategy',
      title: 'Revenue Strategy',
      score: 'ACV $18K Projected',
      status: 'pending',
      description: 'Self-serve trial with automated recurring payment recovery pipeline via RecoverAI.',
      icon: TrendingUp,
      color: 'bg-emerald-100 text-slate-950 border-emerald-400',
      tag: 'Razorpay Ready'
    },
    {
      id: 'gtm_strategy',
      title: 'Go-To-Market Strategy',
      score: 'Outbound Playbook',
      status: 'pending',
      description: `Targeted outbound campaigns across ${startupData.target_market} for early adoption.`,
      icon: Rocket,
      color: 'bg-rose-100 text-slate-950 border-rose-400',
      tag: 'GTM Playbook'
    },
    {
      id: 'expert_recommendations',
      title: 'Expert Recommendations',
      score: '3 Mentors Matched',
      status: 'pending',
      description: `Matched with domain operators in ${startupData.startup_category} & YC SaaS mentors.`,
      icon: Award,
      color: 'bg-blue-100 text-slate-950 border-blue-400',
      tag: 'Mentors Ready'
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* Top Banner: Startup Profile & Health Score Gauge */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
              <span>Active Venture Workspace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              {startupName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500 pt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                ICP: {startupData.target_customer} ({startupData.customer_segment})
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                Market: {startupData.target_market}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                Stage: {startupData.startup_stage}
              </span>
            </div>
          </div>

          {/* Health Score Gauge */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-lime-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${healthScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-base font-extrabold text-slate-950 font-mono">{healthScore}</span>
                <span className="text-[9px] text-slate-400 block font-bold">/100</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-950">Startup Health Score</div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> High Investor Conviction
              </div>
            </div>
          </div>
        </div>

        {/* Visual Progress Milestones (Startup Progress — 20% to 64%) */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-950">Startup Progress &bull; Foundation Validated</span>
            <span className="text-indigo-600 font-mono">64% Overall Progress</span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-lime-400 via-emerald-400 to-indigo-500 h-full rounded-full" style={{ width: '64%' }} />
          </div>

          {/* Stepper Labels Requested in Prompt */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-semibold text-center pt-1">
            <div className="text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Idea ✓
            </div>
            <div className="text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Customer ✓
            </div>
            <div className="text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Problem ✓
            </div>
            <div className="text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Market ✓
            </div>
            <div className="text-indigo-700 flex items-center justify-center gap-1 font-bold">
              <CircleDot className="w-3.5 h-3.5 text-indigo-600" /> Business Model →
            </div>
            <div className="text-slate-400 flex items-center justify-center gap-1">
              <Circle className="w-3.5 h-3.5" /> Launch Strategy ○
            </div>
          </div>
        </div>
      </div>

      {/* 8 Strategic Workspace Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">Startup Intelligence Modules</h2>
          <button
            onClick={() => onOpenAIArchitect()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-lime-300" />
            <span>Open AI Strategist</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onOpenAIArchitect(m.title)}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group min-h-[220px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[110px]">
                      {m.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 group-hover:text-indigo-600 transition">
                      {m.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>{m.score}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
