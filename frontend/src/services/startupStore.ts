export interface StartupState {
  startup_name: string;
  startup_idea: string;
  startup_category: string;
  target_customer: string;
  customer_segment: string;
  icp_description: string;
  problem: string;
  current_solution: string;
  target_market: string;
  startup_stage: string;
  goals: string[];
  health_score: number;
  health_breakdown: {
    problem_clarity: number;
    market_potential: number;
    customer_definition: number;
    differentiation: number;
    business_readiness: number;
  };
  completed_onboarding: boolean;
  created_at: string;
}

export const DEFAULT_DEMO_STARTUP: StartupState = {
  startup_name: 'SupplyFlow AI',
  startup_idea: 'AI-powered supply chain intelligence for small and mid-sized retailers to predict stockouts and automate replenishment.',
  startup_category: 'AI / SaaS',
  target_customer: 'Small businesses',
  customer_segment: 'Small & Mid-Market Retailers',
  icp_description: 'Operations and purchasing managers at retail brands managing 500+ SKUs across multiple suppliers.',
  problem: 'Small businesses struggle to predict supplier stockouts and lead time volatility, causing 12% annual revenue leakage.',
  current_solution: 'Disjointed Excel spreadsheets, manual WhatsApp supplier follow-ups, and reactive emergency re-ordering.',
  target_market: 'India & Southeast Asia',
  startup_stage: 'Prototype',
  goals: [
    'Validate my idea',
    'Research my market',
    'Analyze competitors',
    'Build my business model',
    'Estimate revenue',
    'Create a launch strategy'
  ],
  health_score: 78,
  health_breakdown: {
    problem_clarity: 88,
    market_potential: 82,
    customer_definition: 75,
    differentiation: 72,
    business_readiness: 73
  },
  completed_onboarding: true,
  created_at: new Date().toISOString()
};

const STORAGE_KEY = 'startup_architect_profile';

export const startupStore = {
  getProfile(): StartupState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load startup profile from localStorage', e);
    }
    return DEFAULT_DEMO_STARTUP;
  },

  saveProfile(profile: Partial<StartupState>): StartupState {
    const current = this.getProfile();
    const updated: StartupState = {
      ...current,
      ...profile,
      completed_onboarding: true,
      created_at: current.created_at || new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save startup profile', e);
    }
    return updated;
  },

  resetToDemo(): StartupState {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_STARTUP));
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DEMO_STARTUP;
  }
};
