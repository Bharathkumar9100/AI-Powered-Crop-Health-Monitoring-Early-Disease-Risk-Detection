import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Navigation,
  Globe2,
  ShieldAlert,
  Sprout,
  MessageSquareHeart,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate }) => {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'leaf-diagnosis', label: t('nav_leaf_scan'), icon: ScanLine },
    { id: 'uav-scan', label: t('nav_uav'), icon: Navigation },
    { id: 'satellite-ndvi', label: t('nav_satellite'), icon: Globe2 },
    { id: 'risk-map', label: t('nav_risk_map'), icon: ShieldAlert },
    { id: 'fields', label: t('nav_fields'), icon: Sprout },
    { id: 'ai-advisor', label: t('nav_chat'), icon: MessageSquareHeart },
    { id: 'settings', label: t('nav_settings'), icon: SettingsIcon },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-800 p-4 min-h-[calc(100vh-61px)] flex-shrink-0">
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.id === 'ai-advisor' && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Voice
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-200">System Status</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sentinel-2: <span className="text-emerald-400 font-mono">LIVE</span>
          </p>
          <p className="text-[11px] text-slate-400">
            CNN Grad-CAM: <span className="text-emerald-400 font-mono">READY</span>
          </p>
        </div>
      </div>
    </aside>
  );
};
