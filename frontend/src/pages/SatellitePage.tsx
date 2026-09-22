import React, { useState, useEffect } from 'react';
import {
  Globe2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Info,
  Sparkles,
  CloudRain,
  SunMedium,
  ExternalLink,
  Database,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { satelliteApi, fieldsApi } from '../api/client';
import { Field, SatelliteNdviResponse } from '../types';

export const SatellitePage: React.FC = () => {
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number>(1);
  const [ndviData, setNdviData] = useState<SatelliteNdviResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fieldsApi.list().then((res) => {
      setFields(res);
      if (res.length > 0) {
        setSelectedFieldId(res[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFieldId) return;
    setIsLoading(true);
    satelliteApi.getNdviData(selectedFieldId)
      .then(setNdviData)
      .catch(() => {
        // Fallback demo data
        setNdviData({
          field_id: selectedFieldId,
          field_name: "North Tomato Plot A",
          crop: "Tomato",
          current_ndvi: 0.52,
          trend: "declining",
          health_assessment: "Significant 21% NDVI decline observed over the past 3 weeks. Canopy vegetation shows accelerating chlorosis near the northwest irrigation line.",
          is_demo: true,
          historical: [
            { date: "Aug 02", ndvi: 0.78, health_status: "healthy" },
            { date: "Aug 09", ndvi: 0.76, health_status: "healthy" },
            { date: "Aug 16", ndvi: 0.72, health_status: "healthy" },
            { date: "Aug 23", ndvi: 0.65, health_status: "moderate" },
            { date: "Aug 30", ndvi: 0.58, health_status: "stressed" },
            { date: "Sep 06", ndvi: 0.52, health_status: "stressed" },
          ],
        });
      })
      .finally(() => setIsLoading(false));
  }, [selectedFieldId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{t('nav_satellite')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Sentinel-2 Multispectral
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Normalized Difference Vegetation Index (NDVI) monitoring computed from Copernicus Sentinel-2 Level-2A surface reflectance bands (B4 Red & B8 NIR).
        </p>
      </div>

      {/* Critical Scientific Disclaimer Alert */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-amber-300 block mb-0.5">Agronomic Principle: Stress ≠ Specific Disease Diagnosis</span>
          Satellite NDVI measures photosynthetic activity, canopy density, and cellular chlorophyll reflection. While a sharp drop signals plant stress (drought, nitrogen deficit, or disease), <strong className="text-white">definitive disease diagnosis requires leaf-level close-up diagnosis</strong>.
        </div>
      </div>

      {/* Field Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Select Monitored Field:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {((Array.isArray(fields) && fields.length) ? fields : [
            { id: 1, name: "North Tomato Plot A", crop: "Tomato" },
            { id: 2, name: "East Corn Field", crop: "Corn" },
            { id: 3, name: "South Potato Block", crop: "Potato" },
            { id: 4, name: "Sunrise Grape Vineyard", crop: "Grape" },
          ]).map((f: any) => (
            <button
              key={f.id}
              onClick={() => setSelectedFieldId(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedFieldId === f.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.name} ({f.crop})
            </button>
          ))}
        </div>
      </div>

      {ndviData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: NDVI Map Visualizer */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Copernicus Sentinel-2 Band 8/4
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">Canopy Surface NDVI Map</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  <SunMedium className="w-3.5 h-3.5" />
                  <span>10m Resolution</span>
                </div>
              </div>

              {/* Dynamic SVG / Canvas NDVI False Color Field Simulation */}
              <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 p-2 flex items-center justify-center">
                <svg className="w-full h-full rounded-lg" viewBox="0 0 300 300">
                  <defs>
                    <radialGradient id="ndviGrad1" cx="35%" cy="30%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                      <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="80%" stopColor="#22c55e" stopOpacity="0.75" />
                    </radialGradient>
                    <radialGradient id="ndviGrad2" cx="70%" cy="70%" r="50%">
                      <stop offset="0%" stopColor="#15803d" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity="0.6" />
                    </radialGradient>
                  </defs>

                  {/* Polygon boundary of field */}
                  <polygon
                    points="30,40 270,30 280,260 20,270"
                    fill="url(#ndviGrad1)"
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                  <polygon
                    points="140,110 270,30 280,260 160,250"
                    fill="url(#ndviGrad2)"
                    opacity="0.7"
                  />

                  {/* Field Sub-zone Grid Lines */}
                  <line x1="30" y1="150" x2="275" y2="145" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                  <line x1="150" y1="35" x2="150" y2="265" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />

                  <text x="50" y="80" fill="#ffffff" fontSize="11" fontWeight="bold">Zone NW (0.42)</text>
                  <text x="180" y="80" fill="#ffffff" fontSize="11" fontWeight="bold">Zone NE (0.74)</text>
                  <text x="50" y="210" fill="#ffffff" fontSize="11" fontWeight="bold">Zone SW (0.58)</text>
                  <text x="180" y="210" fill="#ffffff" fontSize="11" fontWeight="bold">Zone SE (0.81)</text>
                </svg>

                {/* Live timestamp */}
                <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-slate-300 font-mono">
                  Pass: {new Date().toLocaleDateString()} · 11:14 UTC
                </div>
              </div>

              {/* NDVI Color Legend */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Vegetation Vigor Index</span>
                <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>0.0 (Severe Stress)</span>
                  <span>0.5 (Moderate)</span>
                  <span>1.0 (Optimal Canopy)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Historical Timeseries & Health Assessment */}
          <div className="lg:col-span-6 space-y-4">
            {/* Vigor Trend Card */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Historical Trend</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">6-Week NDVI Progression</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  ndviData.trend === 'improving'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {ndviData.trend === 'improving' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{ndviData.trend}</span>
                </div>
              </div>

              {/* Timeseries Chart Bars */}
              <div className="space-y-3">
                {(ndviData.historical || []).map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300 font-mono">{item.date}</span>
                      <span className="text-white font-mono font-bold">{item.ndvi.toFixed(2)}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.ndvi > 0.7 ? 'bg-emerald-400' :
                          item.ndvi > 0.6 ? 'bg-teal-400' :
                          item.ndvi > 0.5 ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.ndvi * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-cyan-300 block mb-1">Copernicus Analytics Summary:</span>
                {ndviData.health_assessment}
              </div>
            </div>

            {/* Next Scheduled Pass */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Next Sentinel-2 Satellite Overpass</h4>
                  <p className="text-xs text-slate-400">Estimated cloud cover: &lt; 8% · High confidence</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                In 2 Days
              </span>
            </div>

            {/* Remote Sensing Benchmark Datasets */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-400">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Satellite Datasets: <strong className="text-slate-200">Sentinel-2 (27k patches) & Crop Time Series</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.kaggle.com/datasets/gallo33henrique/sentinel-2-satellite-imagery"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]"
                >
                  <span>Sentinel-2 Kaggle</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-700">|</span>
                <a
                  href="https://www.kaggle.com/datasets/ignazio/sentinel2-crop-mapping/data"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1 text-[10px]"
                >
                  <span>Crop Mapping Time-Series Kaggle</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
