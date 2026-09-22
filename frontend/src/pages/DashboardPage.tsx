import React, { useState, useEffect } from 'react';
import {
  Sprout,
  AlertTriangle,
  ScanLine,
  Navigation,
  Globe2,
  TrendingUp,
  CloudSun,
  Wind,
  Droplets,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { fieldsApi, alertsApi } from '../api/client';
import { Field, Alert } from '../types';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, demoLogin } = useAuth();
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [fieldsData, alertsData] = await Promise.all([
          fieldsApi.list().catch(() => []),
          alertsApi.list().catch(() => ({ alerts: [], unread_count: 0 })),
        ]);
        setFields(fieldsData);
        setAlerts(alertsData.alerts || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, [user]);

  const safeFields = Array.isArray(fields) ? fields : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const atRiskCount = safeFields.filter((f) => f.status === 'at_risk' || f.status === 'critical').length;
  const healthyCount = safeFields.filter((f) => f.status === 'healthy').length;

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Status Banner */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Early Warning Active
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {user ? `Welcome back, ${user.full_name || user.username}` : 'Smart Crop Health Platform'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Multimodal early plant disease forecasting combining Sentinel-2 NDVI vegetative stress detection, UAV drone anomaly scanning, and deep learning Grad-CAM leaf diagnosis.
            </p>
          </div>

          {!user && (
            <button
              onClick={demoLogin}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('btn_demo_login')}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('stats_total_fields')}</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">{safeFields.length || 4}</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{healthyCount || 2} healthy</span> · {safeFields.length ? (safeFields.reduce((acc, f) => acc + (f.area_hectares || 0), 0)).toFixed(1) : '21.8'} ha
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('stats_at_risk')}</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-2 font-mono">{atRiskCount || 2}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requiring immediate scouting</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Avg Canopy NDVI</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-teal-400 mt-2 font-mono">0.68</p>
          <p className="text-[11px] text-slate-400 mt-1">Sentinel-2 5-day rolling index</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('stats_active_alerts')}</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2 font-mono">{safeAlerts.length || 3}</p>
          <p className="text-[11px] text-slate-400 mt-1">Early warnings pending review</p>
        </div>
      </div>

      {/* Quick Action Portals */}
      <div>
        <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-400 mb-3">Diagnostic Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('leaf-diagnosis')}
            className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-emerald-500/50 transition duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <ScanLine className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                Launch <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="font-bold text-white text-base">Leaf Disease Diagnosis</h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload leaf photos for instant disease classification with explainable Grad-CAM heatmaps.
            </p>
          </div>

          <div
            onClick={() => onNavigate('uav-scan')}
            className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-teal-500/50 transition duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                <Navigation className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                Launch <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="font-bold text-white text-base">UAV Aerial Scouting</h3>
            <p className="text-xs text-slate-400 mt-1">
              Analyze drone orthomosaics to map localized crop stress patches and high-risk hotspots.
            </p>
          </div>

          <div
            onClick={() => onNavigate('satellite-ndvi')}
            className="glass-card p-5 rounded-2xl cursor-pointer group hover:border-cyan-500/50 transition duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                <Globe2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                Launch <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h3 className="font-bold text-white text-base">Satellite NDVI Timeseries</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sentinel-2 multispectral vegetation indices to track moisture deficit and chlorophyll decline.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Fields Health & Weather Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fields Health Table / Cards */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white text-base">Monitored Fields Overview</h2>
              <p className="text-xs text-slate-400">Current vegetation health & disease risk ratings</p>
            </div>
            <button
              onClick={() => onNavigate('fields')}
              className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {(safeFields.length ? safeFields : [
              { id: 1, name: "North Tomato Plot A", crop: "Tomato", area_hectares: 4.5, status: "at_risk" },
              { id: 2, name: "East Corn Field", crop: "Corn", area_hectares: 8.2, status: "healthy" },
              { id: 3, name: "South Potato Block", crop: "Potato", area_hectares: 3.0, status: "critical" },
              { id: 4, name: "Sunrise Grape Vineyard", crop: "Grape", area_hectares: 6.1, status: "healthy" },
            ]).map((f: any) => (
              <div
                key={f.id}
                onClick={() => onNavigate('risk-map')}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    f.status === 'healthy' ? 'bg-emerald-400' :
                    f.status === 'at_risk' ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'
                  }`} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{f.name}</h4>
                    <p className="text-xs text-slate-400">{f.crop} · {f.area_hectares} ha</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    f.status === 'healthy'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : f.status === 'at_risk'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {f.status === 'healthy' ? t('status_healthy') : f.status === 'at_risk' ? t('status_at_risk') : t('status_critical')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Local Weather & Spray Advisory */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-white text-base">Agricultural Weather</h2>
                <p className="text-xs text-slate-400">Micro-climate & spray conditions</p>
              </div>
              <CloudSun className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-white font-mono">27°C</span>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Ideal Spray Window
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">Partly Cloudy · Low Fungal Spore Drift</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Humidity</span>
                </div>
                <p className="text-sm font-bold text-white font-mono">68%</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Wind className="w-3.5 h-3.5 text-teal-400" />
                  <span>Wind Speed</span>
                </div>
                <p className="text-sm font-bold text-white font-mono">7 km/h</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Agronomist Advisory</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Wind speeds below 10 km/h allow safe spray application before 11:00 AM. Avoid spraying during midday heat.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('ai-advisor')}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 font-semibold text-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Consult AI Crop Advisor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
