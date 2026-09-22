import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { riskApi, fieldsApi } from '../api/client';
import { Field, FieldRiskResponse, RiskZone } from '../types';

export const RiskMapPage: React.FC = () => {
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number>(1);
  const [riskData, setRiskData] = useState<FieldRiskResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');

  useEffect(() => {
    fieldsApi.list().then((res) => {
      setFields(res);
      if (res.length > 0) setSelectedFieldId(res[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFieldId) return;
    riskApi.getFieldRisk(selectedFieldId)
      .then(setRiskData)
      .catch(() => {
        // Fallback realistic risk model
        setRiskData({
          field_id: selectedFieldId,
          field_name: "North Tomato Plot A",
          crop: "Tomato",
          overall_risk_score: 0.76,
          overall_risk_level: "high",
          last_updated: new Date().toISOString(),
          is_demo: true,
          zones: [
            {
              zone_id: "Zone-NW",
              name: "Northwest Sprinkler Sector",
              risk_score: 0.88,
              risk_level: "high",
              primary_stress_factor: "Fungal Early Blight Lesions & Moisture Pooling",
              affected_area_percentage: 32,
              suggested_action: "Cease overhead sprinkling. Apply Mancozeb 75 WP (2.5 g/L). Prune infected lower leaves.",
            },
            {
              zone_id: "Zone-NE",
              name: "Northeast Ridge",
              risk_score: 0.35,
              risk_level: "low",
              primary_stress_factor: "Healthy vegetative canopy",
              affected_area_percentage: 28,
              suggested_action: "Maintain standard fertigation routine. Re-scout in 7 days.",
            },
            {
              zone_id: "Zone-SW",
              name: "Southwest Edge",
              risk_score: 0.64,
              risk_level: "moderate",
              primary_stress_factor: "Mild Chlorophyll Deficit / Early Stage Stress",
              affected_area_percentage: 22,
              suggested_action: "Inspect undersides of foliage for spider mites or early leaf spot.",
            },
            {
              zone_id: "Zone-SE",
              name: "Southeast Flat",
              risk_score: 0.21,
              risk_level: "low",
              primary_stress_factor: "Optimal Growth Vigor",
              affected_area_percentage: 18,
              suggested_action: "No corrective actions needed.",
            },
          ],
        });
      });
  }, [selectedFieldId]);

  const safeZones = Array.isArray(riskData?.zones) ? riskData.zones : [];
  const filteredZones = safeZones.filter((z) => {
    if (activeFilter === 'all') return true;
    return z.risk_level === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{t('nav_risk_map')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Spatial Multi-Risk
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Combines leaf pathology, satellite NDVI moisture deficit, and UAV orthomosaic stress points into actionable field micro-zones.
        </p>
      </div>

      {/* Field Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Choose Target Field:</span>
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
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-glow-emerald'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.name} ({f.crop})
            </button>
          ))}
        </div>
      </div>

      {riskData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Spatial Zone Map */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Spatial Risk Grid</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{riskData.field_name}</h3>
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  riskData.overall_risk_level === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  riskData.overall_risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{riskData.overall_risk_level} Overall Risk</span>
                </div>
              </div>

              {/* Interactive Vector Grid of Field Zones */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 p-4">
                <div className="grid grid-cols-2 grid-rows-2 h-full gap-2">
                  {safeZones.map((zone) => (
                    <div
                      key={zone.zone_id}
                      className={`rounded-xl p-3.5 flex flex-col justify-between border transition cursor-pointer ${
                        zone.risk_level === 'high'
                          ? 'bg-rose-950/40 border-rose-500/50 hover:bg-rose-900/50'
                          : zone.risk_level === 'moderate'
                          ? 'bg-amber-950/40 border-amber-500/50 hover:bg-amber-900/50'
                          : 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-xs">{zone.zone_id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          zone.risk_level === 'high' ? 'bg-rose-500 text-white' :
                          zone.risk_level === 'moderate' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                        }`}>
                          {(zone.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-slate-200 truncate">{zone.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{zone.affected_area_percentage}% of total field</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span>High Risk (&gt;70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Moderate (40-70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Low (&lt;40%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Zone Remediation Action Plan */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Zone Remediation Directives</h3>
                {/* Filter buttons */}
                <div className="flex items-center gap-1 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {(['all', 'high', 'moderate', 'low'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setActiveFilter(lvl)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition ${
                        activeFilter === lvl
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredZones.map((zone) => (
                  <div
                    key={zone.zone_id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{zone.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({zone.zone_id})</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        zone.risk_level === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        zone.risk_level === 'moderate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {zone.risk_level} Risk
                      </span>
                    </div>

                    <p className="text-xs text-amber-300 font-medium">
                      Primary Factor: {zone.primary_stress_factor}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{zone.suggested_action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
