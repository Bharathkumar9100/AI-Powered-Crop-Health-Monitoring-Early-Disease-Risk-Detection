import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Navigation,
  Globe2,
  ShieldAlert,
  MessageSquareHeart,
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onNavigate }) => {
  const ITEMS = [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'leaf-diagnosis', label: 'Leaf', icon: ScanLine },
    { id: 'uav-scan', label: 'UAV', icon: Navigation },
    { id: 'satellite-ndvi', label: 'NDVI', icon: Globe2 },
    { id: 'risk-map', label: 'Risk', icon: ShieldAlert },
    { id: 'ai-advisor', label: 'AI Chat', icon: MessageSquareHeart },
  ];

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800 px-2 py-1.5 flex justify-around items-center">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-colors ${
              isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
