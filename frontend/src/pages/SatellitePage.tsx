import React, { useState, useEffect } from 'react';
import {
  Globe2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  SunMedium,
  ExternalLink,
  Database,
  Navigation,
  ShieldAlert,
  CheckCircle2,
  Crosshair,
  Camera,
  Loader2,
  Activity,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { satelliteApi, fieldsApi } from '../api/client';
import { Field, SatelliteNdviResponse } from '../types';

interface FieldZone {
  id: 'NW' | 'NE' | 'SW' | 'SE';
  name: string;
  sector: string;
  satelliteNdvi: number;
  uavNdvi: number;
  status: 'healthy' | 'moderate' | 'stressed';
  uavStressScore: number;
  chlorophyllDeficit: number;
  anomalyDetected: boolean;
  anomalyType: string;
  scoutRecommendation: string;
  nirBand: number;
  redBand: number;
  points: string;
  centerCoords: { x: number; y: number };
}

const FIELD_ZONES_CONFIG: Record<string, FieldZone[]> = {
  default: [
    {
      id: 'NW',
      name: 'Zone NW',
      sector: 'Northwest Sprinkler Line',
      satelliteNdvi: 0.42,
      uavNdvi: 0.38,
      status: 'stressed',
      uavStressScore: 0.88,
      chlorophyllDeficit: 0.35,
      anomalyDetected: true,
      anomalyType: 'Fungal Lesion Cluster & Pooling',
      scoutRecommendation: 'Cease overhead sprinkler. Ground scout lower canopy for Early Blight. Apply bio-fungicide (Trichoderma viride).',
      nirBand: 0.48,
      redBand: 0.20,
      points: '30,40 150,35 150,150 30,150',
      centerCoords: { x: 90, y: 92 },
    },
    {
      id: 'NE',
      name: 'Zone NE',
      sector: 'Northeast Ridge',
      satelliteNdvi: 0.74,
      uavNdvi: 0.76,
      status: 'healthy',
      uavStressScore: 0.24,
      chlorophyllDeficit: 0.06,
      anomalyDetected: false,
      anomalyType: 'None (Optimal Vigor)',
      scoutRecommendation: 'Vegetative canopy thriving. Maintain standard nutrient fertigation schedule.',
      nirBand: 0.73,
      redBand: 0.11,
      points: '150,35 270,30 275,145 150,150',
      centerCoords: { x: 210, y: 90 },
    },
    {
      id: 'SW',
      name: 'Zone SW',
      sector: 'Southwest Drainage Edge',
      satelliteNdvi: 0.58,
      uavNdvi: 0.55,
      status: 'moderate',
      uavStressScore: 0.62,
      chlorophyllDeficit: 0.18,
      anomalyDetected: true,
      anomalyType: 'Early Chlorosis / Nitrogen Deficit',
      scoutRecommendation: 'Inspect leaf undersides for foliar pests. Apply foliar seaweed extract or Panchagavya (3%).',
      nirBand: 0.57,
      redBand: 0.15,
      points: '30,150 150,150 150,265 20,270',
      centerCoords: { x: 88, y: 208 },
    },
    {
      id: 'SE',
      name: 'Zone SE',
      sector: 'Southeast Flat',
      satelliteNdvi: 0.81,
      uavNdvi: 0.83,
      status: 'healthy',
      uavStressScore: 0.15,
      chlorophyllDeficit: 0.04,
      anomalyDetected: false,
      anomalyType: 'None (Dense Canopy)',
      scoutRecommendation: 'High chlorophyll reflection. No corrective intervention required.',
      nirBand: 0.78,
      redBand: 0.08,
      points: '150,150 275,145 280,260 150,265',
      centerCoords: { x: 212, y: 205 },
    },
  ],
};

export const SatellitePage: React.FC = () => {
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number>(1);
  const [ndviData, setNdviData] = useState<SatelliteNdviResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Multimodal view layer state: satellite only, uav drone only, or fused hybrid
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'uav' | 'fused'>('fused');
  const [selectedZoneId, setSelectedZoneId] = useState<'NW' | 'NE' | 'SW' | 'SE'>('NW');

  // Simulated UAV Drone scouting flight state
  const [isDroneScanning, setIsDroneScanning] = useState(false);
  const [droneFlightProgress, setDroneFlightProgress] = useState(0);
  const [lastFlightTimestamp, setLastFlightTimestamp] = useState<string>('Today, 08:30 IST');

  const zones = FIELD_ZONES_CONFIG.default;
  const currentZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  useEffect(() => {
    fieldsApi
      .list()
      .then((res) => {
        setFields(res);
        if (res.length > 0) {
          setSelectedFieldId(res[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFieldId) return;
    setIsLoading(true);
    satelliteApi
      .getNdviData(selectedFieldId)
      .then(setNdviData)
      .catch(() => {
        setNdviData({
          field_id: selectedFieldId,
          field_name: 'North Tomato Plot A',
          crop: 'Tomato',
          current_ndvi: 0.52,
          trend: 'declining',
          health_assessment:
            'Copernicus Sentinel-2 & UAV telemetry indicate accelerated vigor decline in Zone NW (NDVI 0.42). High risk of foliar early blight.',
          is_demo: true,
          historical: [
            { date: 'Aug 02', ndvi: 0.78, health_status: 'healthy' },
            { date: 'Aug 09', ndvi: 0.76, health_status: 'healthy' },
            { date: 'Aug 16', ndvi: 0.72, health_status: 'healthy' },
            { date: 'Aug 23', ndvi: 0.65, health_status: 'moderate' },
            { date: 'Aug 30', ndvi: 0.58, health_status: 'stressed' },
            { date: 'Sep 06', ndvi: 0.52, health_status: 'stressed' },
          ],
        });
      })
      .finally(() => setIsLoading(false));
  }, [selectedFieldId]);

  // Trigger simulated UAV Drone mission across field zones
  const handleDeployDroneMission = () => {
    setIsDroneScanning(true);
    setDroneFlightProgress(10);
    const interval = setInterval(() => {
      setDroneFlightProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDroneScanning(false);
          setLastFlightTimestamp('Just now (Live UAV Link)');
          return 100;
        }
        return prev + 25;
      });
    }, 450);
  };

  const getStatusColor = (status: 'healthy' | 'moderate' | 'stressed') => {
    if (status === 'healthy') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (status === 'moderate') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getZoneFillColor = (zone: FieldZone) => {
    if (activeLayer === 'uav') {
      // High-contrast orthomosaic drone visualization
      if (zone.status === 'stressed') return 'rgba(239, 68, 68, 0.45)';
      if (zone.status === 'moderate') return 'rgba(245, 158, 11, 0.35)';
      return 'rgba(34, 197, 94, 0.35)';
    }
    if (activeLayer === 'satellite') {
      // Sentinel-2 NDVI false-color representation
      if (zone.satelliteNdvi < 0.5) return 'rgba(220, 38, 38, 0.65)';
      if (zone.satelliteNdvi < 0.65) return 'rgba(234, 179, 8, 0.65)';
      return 'rgba(22, 163, 74, 0.7)';
    }
    // Fused multimodal layer
    if (zone.status === 'stressed') return 'rgba(239, 68, 68, 0.55)';
    if (zone.status === 'moderate') return 'rgba(217, 119, 6, 0.55)';
    return 'rgba(16, 185, 129, 0.55)';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{t('nav_satellite')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Sentinel-2 & UAV Dual-Platform
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Multimodal vegetation vigor analysis fusing high-altitude Copernicus Sentinel-2 NDVI timeseries with low-altitude UAV drone orthomosaic anomaly mapping.
        </p>
      </div>

      {/* Multimodal Scientific Clarification Alert */}
      <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-cyan-200 block mb-0.5">
            How Satellite & UAV Drone Work Together Across Zones
          </span>
          <strong className="text-white">Sentinel-2 (10m Orbit)</strong> monitors macro NDVI trends across all field zones every 5 days. When a zone exhibits a vegetative drop (e.g.{' '}
          <span className="text-rose-400 font-semibold">Zone NW at 0.42 NDVI</span>), a targeted{' '}
          <strong className="text-white">UAV Drone Flight (2.1cm GSD)</strong> is deployed to that exact zone to map high-resolution anomaly clusters and pinpoint ground scouting.
        </div>
      </div>

      {/* Field Selector & Layer Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Select Field:</span>
          <div className="flex flex-wrap gap-2 ml-2">
            {(Array.isArray(fields) && fields.length
              ? fields
              : [
                  { id: 1, name: 'North Tomato Plot A', crop: 'Tomato' },
                  { id: 2, name: 'East Corn Field', crop: 'Corn' },
                  { id: 3, name: 'South Potato Block', crop: 'Potato' },
                  { id: 4, name: 'Sunrise Grape Vineyard', crop: 'Grape' },
                ]
            ).map((f: any) => (
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

        {/* View Mode Toggle: Satellite vs UAV vs Fused */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeLayer === 'satellite'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Satellite (10m)</span>
          </button>
          <button
            onClick={() => setActiveLayer('uav')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeLayer === 'uav'
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>UAV Drone (2cm)</span>
          </button>
          <button
            onClick={() => setActiveLayer('fused')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              activeLayer === 'fused'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dual-Layer Fused</span>
          </button>
        </div>
      </div>

      {ndviData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Spatial Zone Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {activeLayer === 'satellite'
                        ? 'Copernicus Sentinel-2 Level-2A'
                        : activeLayer === 'uav'
                        ? 'Drone Multispectral Orthomosaic'
                        : 'Multimodal Fusion: Satellite NDVI + UAV Hotspots'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {activeLayer === 'satellite' ? '10m GSD' : '2.1cm GSD'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Field Sub-Zone Canopy & Anomaly Map
                  </h3>
                </div>

                {/* Drone Flight Deploy Action */}
                <button
                  onClick={handleDeployDroneMission}
                  disabled={isDroneScanning}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isDroneScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning Zones ({droneFlightProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Deploy Drone Re-Scan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Interactive Vector Zone Map */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-800 p-2 flex items-center justify-center">
                {/* Background Drone Crop Rows Texture (Visible in UAV or Fused mode) */}
                {activeLayer !== 'satellite' && (
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
                )}

                <svg className="w-full h-full rounded-xl" viewBox="0 0 300 300">
                  <defs>
                    <pattern id="cropRows" width="10" height="10" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="5" x2="10" y2="5" stroke="#10b981" strokeWidth="0.8" opacity="0.3" />
                    </pattern>
                  </defs>

                  {/* Render 4 Quadrant Zones */}
                  {zones.map((zone) => {
                    const isSelected = zone.id === selectedZoneId;
                    const fillColor = getZoneFillColor(zone);

                    return (
                      <g
                        key={zone.id}
                        className="cursor-pointer transition-all duration-300"
                        onClick={() => setSelectedZoneId(zone.id)}
                      >
                        {/* Zone Polygon */}
                        <polygon
                          points={zone.points}
                          fill={fillColor}
                          stroke={isSelected ? '#38bdf8' : '#334155'}
                          strokeWidth={isSelected ? '3' : '1.5'}
                          strokeDasharray={isSelected ? 'none' : '3 3'}
                          className="hover:opacity-90 transition"
                        />

                        {/* Zone Center Label */}
                        <circle
                          cx={zone.centerCoords.x}
                          cy={zone.centerCoords.y}
                          r={isSelected ? '14' : '12'}
                          fill={isSelected ? '#0284c7' : '#0f172a'}
                          stroke={isSelected ? '#ffffff' : '#64748b'}
                          strokeWidth="2"
                        />
                        <text
                          x={zone.centerCoords.x}
                          y={zone.centerCoords.y + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {zone.id}
                        </text>

                        {/* Zone Value Pill in Map */}
                        <text
                          x={zone.centerCoords.x}
                          y={zone.centerCoords.y + 22}
                          textAnchor="middle"
                          fill={zone.status === 'stressed' ? '#f87171' : zone.status === 'moderate' ? '#fbbf24' : '#4ade80'}
                          fontSize="9"
                          fontWeight="bold"
                          className="font-mono drop-shadow"
                        >
                          {activeLayer === 'satellite' ? `NDVI ${zone.satelliteNdvi}` : `UAV ${zone.uavNdvi}`}
                        </text>

                        {/* Drone Anomaly Marker if detected */}
                        {zone.anomalyDetected && activeLayer !== 'satellite' && (
                          <g>
                            <circle
                              cx={zone.centerCoords.x + 28}
                              cy={zone.centerCoords.y - 12}
                              r="7"
                              fill="#ef4444"
                              className="animate-pulse"
                            />
                            <text
                              x={zone.centerCoords.x + 28}
                              y={zone.centerCoords.y - 9}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="8"
                              fontWeight="bold"
                            >
                              !
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Drone Flight Path Simulation overlay */}
                  {isDroneScanning && (
                    <g className="transition-all duration-300">
                      <path
                        d="M 40,50 L 260,50 L 260,110 L 40,110 L 40,180 L 260,180 L 260,250 L 40,250"
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      <circle
                        cx={40 + (220 * (droneFlightProgress % 50)) / 50}
                        cy={50 + (droneFlightProgress > 50 ? 130 : 0)}
                        r="8"
                        fill="#14b8a6"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>

                {/* Overpass & Telemetry Badges */}
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700 text-[10px] text-slate-300 font-mono space-y-0.5">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Globe2 className="w-3 h-3" />
                    <span>Sentinel-2 Pass: Today · 11:14 UTC</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-teal-300 font-bold">
                    <Navigation className="w-3 h-3" />
                    <span>UAV Telemetry: {lastFlightTimestamp}</span>
                  </div>
                </div>

                {/* Layer Indicator in Corner */}
                <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-slate-300">
                  Viewing: <strong className="text-white uppercase">{activeLayer} Layer</strong>
                </div>
              </div>

              {/* Zone Selector Quick-Buttons */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold">Select Zone to Scout:</span>
                <div className="flex items-center gap-2">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedZoneId === z.id
                          ? 'bg-sky-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <span>{z.name}</span>
                      <span className="font-mono text-[10px] opacity-80">({z.satelliteNdvi})</span>
                      {z.anomalyDetected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* NDVI Color Scale Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>Vegetation Vigor & Chlorophyll Index</span>
                  <span className="text-cyan-400 font-mono">NDVI = (NIR - Red) / (NIR + Red)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span className="text-rose-400">0.0 (Severe Stress)</span>
                  <span className="text-amber-400">0.5 (Moderate)</span>
                  <span className="text-emerald-400">1.0 (Optimal Canopy)</span>
                </div>
              </div>
            </div>

            {/* Scientific Band Reflectance Inspector for Selected Zone */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Multispectral Reflectance Bands — {currentZone.name}</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  Computed NDVI: {currentZone.satelliteNdvi.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Near-Infrared (Band 8 NIR)</span>
                    <span className="font-mono font-bold text-emerald-400">{currentZone.nirBand}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${currentZone.nirBand * 100}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Red Absorption (Band 4 Red)</span>
                    <span className="font-mono font-bold text-rose-400">{currentZone.redBand}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-rose-400 h-full rounded-full" style={{ width: `${currentZone.redBand * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Zone Deep-Dive Inspection & UAV Scouting Link */}
          <div className="lg:col-span-5 space-y-4">
            {/* Zone Telemetry & Drone Anomaly Details */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Zone Deep-Dive Inspection
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {currentZone.name} · {currentZone.sector}
                  </h3>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${getStatusColor(
                    currentZone.status
                  )}`}
                >
                  {currentZone.status}
                </span>
              </div>

              {/* Side-by-side metric comparison: Satellite vs UAV */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                    <Globe2 className="w-3.5 h-3.5" />
                    <span className="font-semibold">Satellite (10m)</span>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-white">
                    {currentZone.satelliteNdvi.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-400">Sentinel-2 Surface Reflectance</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-teal-400">
                    <Navigation className="w-3.5 h-3.5" />
                    <span className="font-semibold">UAV Drone (2cm)</span>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-white">
                    {currentZone.uavNdvi.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Stress Score: {(currentZone.uavStressScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Simulated High-Res Drone Camera Close-Up for This Zone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-teal-400" />
                    <span>Drone High-Resolution Crop Zoom</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Alt: 45m AGL</span>
                </div>

                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {/* Visual simulated orthomosaic preview depending on health status */}
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center p-4 text-center ${
                      currentZone.status === 'stressed'
                        ? 'bg-gradient-to-br from-amber-950/40 via-rose-950/30 to-slate-950'
                        : currentZone.status === 'moderate'
                        ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950'
                        : 'bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-slate-950'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        {currentZone.anomalyDetected ? (
                          <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />
                        ) : (
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{currentZone.anomalyType}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Chlorophyll Deficit:{' '}
                          <span className="font-mono text-white font-bold">
                            {(currentZone.chlorophyllDeficit * 100).toFixed(0)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Corner Target Reticle */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-teal-300 border border-slate-700 font-mono">
                    <Crosshair className="w-3 h-3 text-teal-400" />
                    <span>Target {currentZone.id}</span>
                  </div>
                </div>
              </div>

              {/* Recommended Action & Targeted Ground Scouting */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Targeted Ground Scouting Directive:</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-5">
                  {currentZone.scoutRecommendation}
                </p>
              </div>

              {/* Quick Jump Action to Leaf Diagnosis */}
              <div className="pt-2">
                <a
                  href="/leaf-scan"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-emerald hover:brightness-110 transition"
                >
                  <span>Verify Pathogen in {currentZone.name} with Leaf AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* 6-Week Progression Timeseries */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Historical Trend
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">6-Week NDVI Progression</h3>
                </div>
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    ndviData.trend === 'improving'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {ndviData.trend === 'improving' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{ndviData.trend}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {(ndviData.historical || []).map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-mono">{item.date}</span>
                      <span className="text-white font-mono font-bold">
                        {item.ndvi.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.ndvi > 0.7
                            ? 'bg-emerald-400'
                            : item.ndvi > 0.6
                            ? 'bg-teal-400'
                            : item.ndvi > 0.5
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.ndvi * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Scheduled Pass & Datasets */}
            <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Next Sentinel-2 Overpass</h4>
                  <p className="text-[11px] text-slate-400">Estimated cloud cover: &lt; 8%</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                In 2 Days
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
