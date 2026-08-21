import React from 'react';
import {
  LayoutDashboard,
  AlertCircle,
  BrainCircuit,
  Mail,
  BarChart3,
  SplitSquareVertical,
  GraduationCap,
  Sliders,
  CheckCircle2,
  Workflow
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'payments'
  | 'decisions'
  | 'dunning'
  | 'analytics'
  | 'experiments'
  | 'learning'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  failedCount: number;
  inReviewCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  failedCount,
  inReviewCount
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'payments' as NavTab,
      label: 'Failed Payments',
      icon: AlertCircle,
      badge: failedCount > 0 ? failedCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      id: 'decisions' as NavTab,
      label: 'AI Decision Center',
      icon: BrainCircuit,
      badge: inReviewCount > 0 ? `${inReviewCount} review` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'dunning' as NavTab,
      label: 'Dunning Center',
      icon: Mail,
      badge: null
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics & Cohorts',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'experiments' as NavTab,
      label: 'A/B Testing & Uplift',
      icon: SplitSquareVertical,
      badge: 'Control vs AI',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    {
      id: 'learning' as NavTab,
      label: 'Closed-Loop Learning',
      icon: GraduationCap,
      badge: 'Active ML',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'settings' as NavTab,
      label: 'Recovery Policies',
      icon: Sliders,
      badge: null
    }
  ];

  return (
    <aside className="w-64 min-h-[calc(100vh-61px)] glass-panel border-r border-slate-800/80 flex flex-col justify-between p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Recovery Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full border font-mono ${
                    isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Security / Architecture Notice */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 text-[11px] space-y-2">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>PCI DSS Level 1 Safe</span>
        </div>
        <p className="text-slate-400 leading-tight">
          No raw PAN/CVV stored. LangGraph enforces hard network safety constraints.
        </p>
      </div>
    </aside>
  );
};
