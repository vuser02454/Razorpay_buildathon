import React, { useState, useEffect } from 'react';
import './index.css';

// Authentication Pages & Modals (Mandatory Supabase Auth Gate)
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { CheckEmailPage } from './components/auth/CheckEmailPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { AuthGuard } from './components/auth/AuthGuard';
import { authStore, AdminProfile } from './services/authStore';

// AI Assistant Conversational Interface (Grok + Gemini)
import { AIAssistantButton } from './components/assistant/AIAssistantButton';
import { AIAssistantDrawer } from './components/assistant/AIAssistantDrawer';

// RecoverAI Platform Components
import { RecoverNavbar } from './components/recover/RecoverNavbar';
import { RecoverHero } from './components/recover/RecoverHero';
import { CoreStorySection } from './components/recover/CoreStorySection';
import { ThreeLayerSection } from './components/recover/ThreeLayerSection';
import { PolicyGateSection } from './components/recover/PolicyGateSection';
import { DunningTimelineSection } from './components/recover/DunningTimelineSection';
import { ClosedLoopSection } from './components/recover/ClosedLoopSection';
import { ProofOfValueSection } from './components/recover/ProofOfValueSection';
import { RazorpayIntegrationSection } from './components/recover/RazorpayIntegrationSection';
import { RecoveryControlCenter } from './components/recover/RecoveryControlCenter';

// Analytics & Subsystems
import { AnalyticsView } from './components/AnalyticsView';
import { ExperimentsView } from './components/ExperimentsView';
import { DunningCenterView } from './components/DunningCenterView';
import { ClosedLoopLearningView } from './components/ClosedLoopLearningView';
import { SettingsView } from './components/SettingsView';
import { SimulationModal } from './components/SimulationModal';
import { OnboardingModal } from './components/OnboardingModal';

// Customer Payment Update Page (Accessible via 1-click email link)
import { CustomerPaymentUpdatePage } from './components/customer/CustomerPaymentUpdatePage';

type AuthViewMode = 'login' | 'signup' | 'check-email' | 'forgot-password' | 'reset-password' | 'callback';

export function App() {
  // Global Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('recoverai_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('recoverai_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Check if current URL is a customer 1-click update link from email
  const isCustomerPaymentPage = () => {
    const path = window.location.pathname;
    const search = window.location.search;
    return path.includes('update-payment') || path.startsWith('/pay') || (search.includes('payment_id=') && !search.includes('admin='));
  };

  const [onCustomerPage, setOnCustomerPage] = useState<boolean>(isCustomerPaymentPage);

  // Authentication State
  const [admin, setAdmin] = useState<AdminProfile | null>(() => authStore.getAdmin());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Determine initial auth view based on URL route / hash
  const initialAuthView = (): AuthViewMode => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    if (
      path === '/auth/callback' ||
      path.startsWith('/auth/') ||
      hash.includes('access_token=') ||
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('error=') ||
      search.includes('error=')
    ) {
      return 'callback';
    }
    return 'login';
  };

  const [authView, setAuthView] = useState<AuthViewMode>(initialAuthView);
  const [pendingEmail, setPendingEmail] = useState<string>('');

  // AI Assistant Drawer State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Authenticated View Sections: 'queue', 'landing', 'story', 'threelayer', 'policy', 'dunning', 'analytics', 'settings'
  const [activeSection, setActiveSection] = useState<string>('queue');
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── AUTHENTICATION INITIALIZATION & STATE SUBSCRIPTION ──────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const loadedAdmin = await authStore.initSession();
        if (isMounted) {
          if (loadedAdmin) {
            setAdmin(loadedAdmin);
          }
        }
      } catch (err) {
        console.warn('[RecoverAI] Auth init error:', err);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    initAuth();

    // Subscribe to Supabase Auth State Changes
    const { data: { subscription } } = authStore.onAuthStateChange((event, session, updatedAdmin) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset-password');
        setAdmin(null);
      } else if (event === 'SIGNED_IN' && updatedAdmin) {
        setAdmin(updatedAdmin);
        setAuthView('login');
      } else if (event === 'SIGNED_OUT') {
        setAdmin(null);
        setAuthView('login');
        setIsAssistantOpen(false);
      } else if (updatedAdmin) {
        setAdmin(updatedAdmin);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── PUBLIC CUSTOMER PAYMENT UPDATE PAGE (FROM EMAIL 1-CLICK LINK) ────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (onCustomerPage) {
    return (
      <CustomerPaymentUpdatePage
        onDone={() => {
          window.history.pushState({}, '', '/');
          setOnCustomerPage(false);
        }}
      />
    );
  }

  const handleAuthSuccess = (loggedAdmin: AdminProfile) => {
    setAdmin(loggedAdmin);
    setAuthView('login');
    setActiveSection('queue');
  };

  const handleLogout = async () => {
    await authStore.logout();
    setAdmin(null);
    setAuthView('login');
    setActiveSection('queue');
    setIsAssistantOpen(false);
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    if (section === 'landing' || section === 'queue') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const targetId = section === 'story'
        ? 'how-it-works'
        : section === 'threelayer'
        ? 'three-layer'
        : section === 'policy'
        ? 'policy'
        : section;
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Render Unauthenticated Flow
  const renderAuthFlow = () => {
    if (authView === 'callback') {
      return (
        <AuthCallback
          onAuthSuccess={handleAuthSuccess}
          onPasswordRecovery={() => setAuthView('reset-password')}
          onGoToLogin={() => setAuthView('login')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      );
    }

    if (authView === 'check-email') {
      return (
        <CheckEmailPage
          email={pendingEmail}
          onGoToLogin={() => setAuthView('login')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      );
    }

    if (authView === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onGoToLogin={() => setAuthView('login')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      );
    }

    if (authView === 'reset-password') {
      return (
        <ResetPasswordPage
          onSuccess={() => setAuthView('login')}
          onGoToLogin={() => setAuthView('login')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      );
    }

    if (authView === 'signup') {
      return (
        <SignupPage
          onSuccess={(email) => {
            setPendingEmail(email);
            setAuthView('check-email');
          }}
          onGoToLogin={() => setAuthView('login')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      );
    }

    return (
      <LoginPage
        onSuccess={handleAuthSuccess}
        onGoToSignup={() => setAuthView('signup')}
        onGoToForgotPassword={() => setAuthView('forgot-password')}
        onGoToCheckEmail={(email) => {
          setPendingEmail(email);
          setAuthView('check-email');
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── AUTHENTICATION GATE & PROTECTED WORKSPACE ────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AuthGuard
      admin={admin}
      isLoading={isAuthLoading}
      fallback={renderAuthFlow()}
      isDarkMode={isDarkMode}
    >
      <div className={`min-h-screen font-sans selection:bg-lime-200 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      }`}>
        {/* Floating Pill Navigation */}
        <RecoverNavbar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onLaunchEngine={() => setActiveSection('queue')}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />

        <main>
          {activeSection === 'queue' ? (
            <RecoveryControlCenter
              key={refreshKey}
              onOpenSimulation={() => setShowSimulationModal(true)}
            />
          ) : activeSection === 'dunning' ? (
            <div className="pt-28 px-4 sm:px-8 max-w-6xl mx-auto pb-16">
              <DunningCenterView key={refreshKey} />
            </div>
          ) : activeSection === 'analytics' ? (
            <div className="pt-28 px-4 sm:px-8 max-w-6xl mx-auto pb-16 space-y-12">
              <AnalyticsView key={`an-${refreshKey}`} />
              <ExperimentsView key={`exp-${refreshKey}`} />
              <ClosedLoopLearningView key={`cl-${refreshKey}`} />
            </div>
          ) : activeSection === 'settings' ? (
            <div className="pt-28 px-4 sm:px-8 max-w-6xl mx-auto pb-16">
              <SettingsView />
            </div>
          ) : (
            /* RecoverAI Landing Story Sections */
            <div>
              <RecoverHero
                onLaunchEngine={() => setActiveSection('queue')}
                onExploreHowItWorks={() => {
                  const el = document.getElementById('how-it-works');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onTryDemo={() => setActiveSection('queue')}
              />

              <CoreStorySection />
              <ThreeLayerSection onExploreLayer={() => setActiveSection('queue')} />
              <PolicyGateSection />
              <DunningTimelineSection />
              <ClosedLoopSection />
              <ProofOfValueSection />
              <RazorpayIntegrationSection onOpenSandbox={() => setShowSimulationModal(true)} />

              {/* Live Queue Preview at Bottom */}
              <div className={`py-12 border-t transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <RecoveryControlCenter
                  key={`preview-${refreshKey}`}
                  onOpenSimulation={() => setShowSimulationModal(true)}
                />
              </div>
            </div>
          )}
        </main>

        {/* Persistent Floating AI Assistant Button (Bottom-Right) */}
        <AIAssistantButton
          isOpen={isAssistantOpen}
          onClick={() => setIsAssistantOpen(true)}
        />

        {/* AI Assistant Chat Panel / Drawer */}
        <AIAssistantDrawer
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />

        {/* Simulation & Onboarding Modals */}
        <SimulationModal
          isOpen={showSimulationModal}
          onClose={() => setShowSimulationModal(false)}
          onSuccess={() => {
            setActiveSection('queue');
            setRefreshKey((k) => k + 1);
          }}
        />
        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
        />
      </div>
    </AuthGuard>
  );
}

export default App;
