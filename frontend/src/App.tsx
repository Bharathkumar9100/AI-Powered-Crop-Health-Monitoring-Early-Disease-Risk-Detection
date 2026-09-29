import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { UavPage } from './pages/UavPage';
import { SatellitePage } from './pages/SatellitePage';
import { RiskMapPage } from './pages/RiskMapPage';
import { FieldsPage } from './pages/FieldsPage';
import { ChatPage } from './pages/ChatPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { alertsApi } from './api/client';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [chatContext, setChatContext] = useState<any>(null);
  const [selectedFieldForAnalyze, setSelectedFieldForAnalyze] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await alertsApi.list();
        setUnreadAlerts(res.unread_count || 0);
      } catch {
        // Fallback default
        setUnreadAlerts(2);
      }
    };
    fetchAlerts();
  }, [user]);

  const handleNavigateToChatWithContext = (context: any) => {
    setChatContext(context);
    setActiveTab('ai-advisor');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'leaf-diagnosis':
        return (
          <AnalyzePage
            initialFieldId={selectedFieldForAnalyze}
            onNavigateToChatWithContext={handleNavigateToChatWithContext}
          />
        );
      case 'uav-scan':
        return <UavPage />;
      case 'satellite-ndvi':
        return <SatellitePage />;
      case 'risk-map':
        return <RiskMapPage />;
      case 'fields':
        return (
          <FieldsPage
            onNavigate={(tab: string, fieldId?: number) => {
              if (fieldId) {
                setSelectedFieldForAnalyze(fieldId);
              }
              setActiveTab(tab);
            }}
          />
        );
      case 'ai-advisor':
        return (
          <ChatPage
            initialContext={chatContext}
            onClearContext={() => setChatContext(null)}
          />
        );
      case 'alerts':
        return <AlertsPage onNavigate={setActiveTab} />;
      case 'settings':
        return <SettingsPage />;
      case 'login':
        return <LoginPage onSuccess={() => setActiveTab('dashboard')} />;
      default:
        return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onNavigate={setActiveTab}
      unreadAlertsCount={unreadAlerts}
    >
      {renderContent()}
    </AppLayout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
