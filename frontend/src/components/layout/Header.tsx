import React from 'react';
import { Leaf, Bell, User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LanguageSelector } from '../common/LanguageSelector';
import { useTranslation } from '../../hooks/useTranslation';

interface HeaderProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  unreadAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, unreadAlertsCount = 0 }) => {
  const { user, logout, demoLogin } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="glass-panel border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-glow-emerald">
            <Leaf className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">PhytoVision<span className="text-emerald-400">-X</span></span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AI + UAV + NDVI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Explainable Plant Pathology</p>
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          <LanguageSelector compact />

          {/* Alerts Bell */}
          <button
            onClick={() => onNavigate('alerts')}
            className="relative p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 transition"
            title="View alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* User Section / Demo Access */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-200 font-medium truncate max-w-[140px]">{user.full_name || user.username}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition"
                title={t('btn_logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={demoLogin}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Login</span>
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                {t('btn_login')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
