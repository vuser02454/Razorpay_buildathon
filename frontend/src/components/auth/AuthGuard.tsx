import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { AdminProfile } from '../../services/authStore';

interface AuthGuardProps {
  admin: AdminProfile | null;
  isLoading: boolean;
  fallback: React.ReactNode;
  children: React.ReactNode;
  isDarkMode?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  admin,
  isLoading,
  fallback,
  children,
  isDarkMode = false,
}) => {
  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans ${
        isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-lime-400/20 border border-lime-400/40 flex items-center justify-center text-lime-500 shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
            <span>AUTHENTICATING SECURE WORKSPACE...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
