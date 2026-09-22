import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { DemoBanner } from '../common/DemoBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  unreadAlertsCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onNavigate,
  unreadAlertsCount,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DemoBanner />
      <Header
        activeTab={activeTab}
        onNavigate={onNavigate}
        unreadAlertsCount={unreadAlertsCount}
      />
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar activeTab={activeTab} onNavigate={onNavigate} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-8 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <MobileNav activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  );
};
