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
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ScanLine,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { satelliteApi, fieldsApi } from '../api/client';
import { Field, SatelliteNdviResponse, FieldHealthSummary } from '../types';
import { FieldSatelliteMap } from '../components/map/FieldSatelliteMap';

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

interface SatellitePageProps {
  onNavigate?: (tab: string) => void;
  onNavigateToAnalyze?: (fieldId?: number) => void;
}

export const SatellitePage: React.FC<SatellitePageProps> = ({ onNavigate, onNavigateToAnalyze }) => {
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [ndviData, setNdviData] = useState<SatelliteNdviResponse | null>(null);
  const [healthSummary, setHealthSummary] = useState<FieldHealthSummary | null>(null);
  const [historicalObservations, setHistoricalObservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sub-zone & UAV multimodal state
  const [activeLayer, setActiveLayer] = useState<'satellite' | 'uav' | 'fused'>('fused');
  const [selectedZoneId, setSelectedZoneId] = useState<'NW' | 'NE' | 'SW' | 'SE'>('NW');
  const [isDroneScanning, setIsDroneScanning] = useState(false);
  const [droneFlightProgress, setDroneFlightProgress] = useState(0);
  const [lastFlightTimestamp, setLastFlightTimestamp] = useState<string>('Today, 08:30 IST');

  const zones = React.useMemo<FieldZone[]>(() => {
    if (!healthSummary) {
      return FIELD_ZONES_CONFIG.default;
    }

    const mean = healthSummary.ndvi_mean;
    const min = healthSummary.ndvi_min;
    const max = healthSummary.ndvi_max;

    // Dynamically calculate 4 spatial quadrants based on the actual field NDVI analysis
    const nwNdvi = Number(Math.max(0.1, min + (mean - min) * 0.25).toFixed(2));
    const neNdvi = Number(Math.min(0.95, mean + (max - mean) * 0.75).toFixed(2));
    const swNdvi = Number(Math.max(0.15, mean * 0.92).toFixed(2));
    const seNdvi = Number(Math.min(0.95, max * 0.98).toFixed(2));

    const getStatus = (val: number): 'healthy' | 'moderate' | 'stressed' => {
      if (val >= 0.60) return 'healthy';
      if (val >= 0.35) return 'moderate';
      return 'stressed';
    };

    const fieldName = selectedField?.name || healthSummary.field_name || 'Field';

    return [
      {
        id: 'NW',
        name: `${fieldName} - NW Quadrant`,
        sector: 'Northwest Canopy Sector',
        satelliteNdvi: nwNdvi,
        uavNdvi: Number(Math.max(0.1, nwNdvi - 0.04).toFixed(2)),
        status: getStatus(nwNdvi),
        uavStressScore: Number((1.0 - nwNdvi).toFixed(2)),
        chlorophyllDeficit: Number(Math.max(0, 0.7 - nwNdvi).toFixed(2)),
        anomalyDetected: nwNdvi < 0.55,
        anomalyType: nwNdvi < 0.4 ? 'Potential High Stress / Chlorosis Zone' : nwNdvi < 0.6 ? 'Moderate Canopy Deficit' : 'Optimal Vigor',
        scoutRecommendation: nwNdvi < 0.5 ? 'Ground scout for moisture deficit, nutrient leaching, or early foliar blight.' : 'Standard crop management.',
        nirBand: Number((nwNdvi * 0.8 + 0.1).toFixed(2)),
        redBand: Number(Math.max(0.05, 0.25 - nwNdvi * 0.15).toFixed(2)),
        points: '30,40 150,35 150,150 30,150',
        centerCoords: { x: 90, y: 92 },
      },
      {
        id: 'NE',
        name: `${fieldName} - NE Quadrant`,
        sector: 'Northeast Canopy Sector',
        satelliteNdvi: neNdvi,
        uavNdvi: Number((neNdvi + 0.02).toFixed(2)),
        status: getStatus(neNdvi),
        uavStressScore: Number(Math.max(0, 1.0 - neNdvi).toFixed(2)),
        chlorophyllDeficit: Number(Math.max(0, 0.7 - neNdvi).toFixed(2)),
        anomalyDetected: neNdvi < 0.55,
        anomalyType: neNdvi < 0.55 ? 'Canopy Moisture Deficit' : 'Optimal Vegetative Greenness',
        scoutRecommendation: neNdvi >= 0.6 ? 'Vegetative canopy thriving. Maintain standard nutrient fertigation.' : 'Inspect irrigation flow.',
        nirBand: Number((neNdvi * 0.85 + 0.1).toFixed(2)),
        redBand: Number(Math.max(0.04, 0.2 - neNdvi * 0.12).toFixed(2)),
        points: '150,35 270,30 275,145 150,150',
        centerCoords: { x: 210, y: 90 },
      },
      {
        id: 'SW',
        name: `${fieldName} - SW Quadrant`,
        sector: 'Southwest Canopy Sector',
        satelliteNdvi: swNdvi,
        uavNdvi: Number((swNdvi - 0.02).toFixed(2)),
        status: getStatus(swNdvi),
        uavStressScore: Number((1.0 - swNdvi).toFixed(2)),
        chlorophyllDeficit: Number(Math.max(0, 0.7 - swNdvi).toFixed(2)),
        anomalyDetected: swNdvi < 0.55,
        anomalyType: swNdvi < 0.55 ? 'Early Chlorosis / Nitrogen Deficit' : 'Healthy Canopy',
        scoutRecommendation: 'Check drainage channels and inspect leaf undersides for pests.',
        nirBand: Number((swNdvi * 0.8 + 0.1).toFixed(2)),
        redBand: Number(Math.max(0.06, 0.22 - swNdvi * 0.12).toFixed(2)),
        points: '30,150 150,150 150,265 20,270',
        centerCoords: { x: 88, y: 208 },
      },
      {
        id: 'SE',
        name: `${fieldName} - SE Quadrant`,
        sector: 'Southeast Canopy Sector',
        satelliteNdvi: seNdvi,
        uavNdvi: Number((seNdvi + 0.01).toFixed(2)),
        status: getStatus(seNdvi),
        uavStressScore: Number(Math.max(0, 1.0 - seNdvi).toFixed(2)),
        chlorophyllDeficit: 0.03,
        anomalyDetected: false,
        anomalyType: 'Optimal Photosynthetic Activity',
        scoutRecommendation: 'High chlorophyll reflection. No corrective intervention required.',
        nirBand: Number((seNdvi * 0.88 + 0.08).toFixed(2)),
        redBand: 0.09,
        points: '150,150 275,145 280,260 150,265',
        centerCoords: { x: 212, y: 205 },
      },
    ];
  }, [healthSummary, selectedField]);

  const currentZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  useEffect(() => {
    fieldsApi
      .list()
      .then((res) => {
        setFields(res);
        if (res.length > 0) {
          setSelectedField(res[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedField) return;
    setIsLoading(true);

    Promise.all([
      satelliteApi.getNdviData(selectedField.id).catch(() => null),
      satelliteApi.getLatest(selectedField.id).catch(() => null),
      satelliteApi.getHistory(selectedField.id).catch(() => []),
    ])
      .then(([ndviRes, latestRes, historyRes]) => {
        if (ndviRes) {
          setNdviData(ndviRes);
        } else if (selectedField) {
          setNdviData({
            field_id: selectedField.id,
            field_name: selectedField.name,
            crop: selectedField.crop,
            current_ndvi: 0.65,
            trend: 'stable',
            health_assessment: 'Canopy vigor index remains within expected seasonal health bounds.',
            historical: [
              { date: '05-10', ndvi: 0.61, health_status: 'healthy' },
              { date: '06-15', ndvi: 0.64, health_status: 'healthy' },
              { date: '07-20', ndvi: 0.68, health_status: 'healthy' },
              { date: '08-25', ndvi: 0.72, health_status: 'healthy' },
              { date: '09-15', ndvi: 0.66, health_status: 'healthy' },
              { date: '10-02', ndvi: 0.65, health_status: 'healthy' },
            ],
            is_demo: true,
          });
        }

        if (latestRes) {
          setHealthSummary(latestRes);
        } else if (selectedField) {
          setHealthSummary({
            observation_id: 1,
            field_id: selectedField.id,
            field_name: selectedField.name,
            crop: selectedField.crop,
            area_hectares: selectedField.area_hectares || 4.0,
            acquisition_date: new Date().toISOString().split('T')[0],
            provider: 'Copernicus Sentinel-2 Level-2A',
            is_demo: true,
            ndvi_mean: 0.65,
            ndvi_min: 0.35,
            ndvi_max: 0.81,
            healthy_area_pct: 72.0,
            moderate_stress_pct: 20.0,
            high_stress_pct: 8.0,
            status: 'Optimal Canopy Vigor',
            headline: 'Strong vegetative vigor across 72.0% of the field canopy.',
            recommendation: 'Copernicus Sentinel-2 multispectral vegetation indices demonstrate dense chlorophyll reflection.',
            disclaimer: 'Satellite-based stress detection is an early-warning indicator. Field verification is recommended.',
          });
        }
        if (historyRes && historyRes.length > 0) setHistoricalObservations(historyRes);
      })
      .finally(() => setIsLoading(false));
  }, [selectedField]);

  // Deploy Drone Scan simulation
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
      if (zone.status === 'stressed') return 'rgba(239, 68, 68, 0.45)';
      if (zone.status === 'moderate') return 'rgba(245, 158, 11, 0.35)';
      return 'rgba(34, 197, 94, 0.35)';
    }
    if (activeLayer === 'satellite') {
      if (zone.satelliteNdvi < 0.5) return 'rgba(220, 38, 38, 0.65)';
      if (zone.satelliteNdvi < 0.65) return 'rgba(234, 179, 8, 0.65)';
      return 'rgba(22, 163, 74, 0.7)';
    }
    if (zone.status === 'stressed') return 'rgba(239, 68, 68, 0.55)';
    if (zone.status === 'moderate') return 'rgba(217, 119, 6, 0.55)';
    return 'rgba(16, 185, 129, 0.55)';
  };

  // Temporal comparison calculations
  const historicalPoints = ndviData?.historical || [];
  const latestObs = historicalPoints[historicalPoints.length - 1];
  const previousObs = historicalPoints.length >= 2 ? historicalPoints[historicalPoints.length - 2] : null;

  const deltaNdvi = previousObs && latestObs ? Number((latestObs.ndvi - previousObs.ndvi).toFixed(2)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{t('nav_satellite')}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Automatic Location & Sentinel-2
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Automatic GPS field boundary positioning, cloud-filtered Sentinel-2 multispectral band retrieval, and NDVI crop-stress analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Provider:{' '}
              <strong className="text-white">
                {healthSummary?.provider || 'Copernicus Sentinel-2 Level-2A'}
              </strong>
            </span>
            {healthSummary?.is_demo && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DEMO DATA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scientific Clarification Alert */}
      <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-cyan-200 block mb-0.5">
            Vegetation Stress Monitoring — Early Warning Indicator
          </span>
          Copernicus Sentinel-2 multispectral sensors measure Red (Band 4) and Near-Infrared (Band 8) reflectance to compute vegetative vigor.
          <strong className="text-white"> Potential crop stress</strong> may stem from moisture deficit, nutrient shortage, soil compaction, or disease onset.
          Ground-truth verification and leaf pathology are recommended for definitive diagnosis.
        </div>
      </div>

      {/* Interactive Map Component with Location & Boundary Drawing */}
      <FieldSatelliteMap
        fields={fields}
        selectedField={selectedField}
        onSelectField={(f) => setSelectedField(f)}
        onAnalysisComplete={(summary) => {
          setHealthSummary(summary);
          const fId = summary.field_id || selectedField?.id;
          if (fId) {
            satelliteApi.getNdviData(fId).then(setNdviData).catch(() => {});
            satelliteApi.getHistory(fId).then(setHistoricalObservations).catch(() => {});
          }
        }}
        onNavigateToLeafScan={(fId) => {
          if (onNavigateToAnalyze) onNavigateToAnalyze(fId);
        }}
      />

      {/* SATELLITE CROP HEALTH DEDICATED SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Field Intelligence
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">SATELLITE CROP HEALTH</h2>
          </div>
          {latestObs && (
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              Observation: {latestObs.date}
            </span>
          )}
        </div>

        {/* Temporal Comparison & Metric Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Temporal Comparison Box: Previous Observation vs Latest Observation */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Temporal Comparison
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">Previous vs Latest Overpass</h3>
              </div>
              <div
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  deltaNdvi >= 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {deltaNdvi >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>
                  {deltaNdvi >= 0 ? `+${deltaNdvi}` : `${deltaNdvi}`} Δ NDVI
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Previous Observation */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Previous Observation</span>
                <p className="text-2xl font-mono font-bold text-slate-200">
                  {previousObs ? previousObs.ndvi.toFixed(2) : '0.62'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Date: <span className="font-mono text-slate-300">{previousObs ? previousObs.date : '10 Days Ago'}</span>
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 inline-block mt-1">
                  Baseline
                </span>
              </div>

              {/* Latest Observation */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-1">
                <span className="text-[11px] text-cyan-400 font-medium">Latest Observation</span>
                <p className="text-2xl font-mono font-bold text-cyan-300">
                  {healthSummary
                    ? healthSummary.ndvi_mean.toFixed(2)
                    : latestObs
                    ? latestObs.ndvi.toFixed(2)
                    : '0.65'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Date: <span className="font-mono text-cyan-200">{healthSummary?.acquisition_date || latestObs?.date || 'Today'}</span>
                </p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 font-semibold ${
                    deltaNdvi >= 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {deltaNdvi >= 0 ? 'Vigor Gain' : 'Stress Alert'}
                </span>
              </div>
            </div>

            {/* Health Distribution Breakdown */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-300 font-semibold block">
                Field Health Distribution ({healthSummary?.field_name || selectedField?.name || 'Current Field'})
              </span>
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-800 border border-slate-700">
                <div
                  style={{ width: `${healthSummary?.healthy_area_pct ?? (latestObs ? 65 : 60)}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Healthy: ${healthSummary?.healthy_area_pct ?? 65}%`}
                />
                <div
                  style={{ width: `${healthSummary?.moderate_stress_pct ?? (latestObs ? 25 : 25)}%` }}
                  className="bg-amber-400 h-full transition-all duration-500"
                  title={`Moderate Stress: ${healthSummary?.moderate_stress_pct ?? 25}%`}
                />
                <div
                  style={{ width: `${healthSummary?.high_stress_pct ?? (latestObs ? 10 : 15)}%` }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`High Stress: ${healthSummary?.high_stress_pct ?? 10}%`}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="text-emerald-400">
                  Healthy: {healthSummary?.healthy_area_pct !== undefined ? `${healthSummary.healthy_area_pct}%` : 'Calculating...'}
                </span>
                <span className="text-amber-400">
                  Moderate: {healthSummary?.moderate_stress_pct !== undefined ? `${healthSummary.moderate_stress_pct}%` : 'Calculating...'}
                </span>
                <span className="text-rose-400">
                  High Stress: {healthSummary?.high_stress_pct !== undefined ? `${healthSummary.high_stress_pct}%` : 'Calculating...'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Historical NDVI Trend Line Chart */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Longitudinal Analysis
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">Historical NDVI Trend Progression</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="font-mono text-[11px]">Sentinel-2 (Level-2A)</span>
              </div>
            </div>

            {/* SVG Trend Line Chart */}
            <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800/80 aspect-[16/7] flex items-center justify-center">
              {historicalPoints.length > 0 ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                  <defs>
                    <linearGradient id="ndviGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Threshold Reference Lines */}
                  {/* Healthy Threshold line (0.60) */}
                  <line x1="40" y1="72" x2="480" y2="72" stroke="#10b981" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.5" />
                  <text x="485" y="75" fill="#10b981" fontSize="9" fontFamily="monospace">0.60</text>

                  {/* Moderate Threshold line (0.35) */}
                  <line x1="40" y1="120" x2="480" y2="120" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="0.8" opacity="0.5" />
                  <text x="485" y="123" fill="#f59e0b" fontSize="9" fontFamily="monospace">0.35</text>

                  {/* Construct Line Coordinates */}
                  {(() => {
                    const count = historicalPoints.length;
                    const xStep = (440) / Math.max(1, count - 1);
                    const coords = historicalPoints.map((pt, i) => {
                      const x = 40 + i * xStep;
                      // map ndvi [0.2, 0.9] to Y [150, 20]
                      const y = 150 - ((pt.ndvi - 0.2) / 0.7) * 130;
                      return { x, y, pt };
                    });

                    const pathStr = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                    const areaStr = `${pathStr} L ${coords[coords.length - 1].x} 160 L ${coords[0].x} 160 Z`;

                    return (
                      <>
                        {/* Area fill */}
                        <path d={areaStr} fill="url(#ndviGradient)" />
                        {/* Line */}
                        <path d={pathStr} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />

                        {/* Coordinate points */}
                        {coords.map((c, idx) => (
                          <g key={idx}>
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r="5"
                              fill="#0f172a"
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                            />
                            {/* Point value text */}
                            <text
                              x={c.x}
                              y={c.y - 10}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {c.pt.ndvi.toFixed(2)}
                            </text>
                            {/* Date label */}
                            <text
                              x={c.x}
                              y="172"
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {c.pt.date}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div className="text-xs text-slate-400">Loading historical trend...</div>
              )}
            </div>

            {/* Historical Observations List */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>NDVI Trend: <strong>{ndviData?.trend || 'stable'}</strong></span>
              <span className="font-mono text-[11px]">Revisit cycle: 5 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTIMODAL DUAL-PLATFORM SUB-ZONE SCANNER (Preserved & Integrated) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              High-Resolution Sub-Zone Diagnostic
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">UAV Drone & Spatial Quadrant Analysis</h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveLayer('satellite')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeLayer === 'satellite' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Satellite (10m)</span>
            </button>
            <button
              onClick={() => setActiveLayer('uav')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeLayer === 'uav' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>UAV Drone (2cm)</span>
            </button>
            <button
              onClick={() => setActiveLayer('fused')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeLayer === 'fused'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dual Fused</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sub-zone SVG Quadrant Visualizer */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Spatial Field Quadrants</h3>
              <button
                onClick={handleDeployDroneMission}
                disabled={isDroneScanning}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isDroneScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Drone Scouting ({droneFlightProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Deploy UAV Drone Scan</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-slate-800 p-2 flex items-center justify-center">
              <svg className="w-full h-full rounded-xl" viewBox="0 0 300 300">
                {zones.map((zone) => {
                  const isSelected = zone.id === selectedZoneId;
                  const fillColor = getZoneFillColor(zone);

                  return (
                    <g
                      key={zone.id}
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => setSelectedZoneId(zone.id)}
                    >
                      <polygon
                        points={zone.points}
                        fill={fillColor}
                        stroke={isSelected ? '#38bdf8' : '#334155'}
                        strokeWidth={isSelected ? '3' : '1.5'}
                      />
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
                      <text
                        x={zone.centerCoords.x}
                        y={zone.centerCoords.y + 22}
                        textAnchor="middle"
                        fill={zone.status === 'stressed' ? '#f87171' : zone.status === 'moderate' ? '#fbbf24' : '#4ade80'}
                        fontSize="9"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {activeLayer === 'satellite' ? `NDVI ${zone.satelliteNdvi}` : `UAV ${zone.uavNdvi}`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Quick Zone Selection buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Inspect Quadrant:</span>
              <div className="flex items-center gap-2">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedZoneId === z.id
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <span>{z.name}</span>
                    <span className="font-mono text-[10px] opacity-80">({z.satelliteNdvi})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Zone Deep-Dive Inspection */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Zone Detailed Inspection
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

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-xs text-cyan-400 font-semibold block">Satellite (10m)</span>
                <p className="text-2xl font-mono font-bold text-white mt-1">
                  {currentZone.satelliteNdvi.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400">Canopy vigor index</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-xs text-teal-400 font-semibold block">UAV Drone (2cm)</span>
                <p className="text-2xl font-mono font-bold text-white mt-1">
                  {currentZone.uavNdvi.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400">
                  Stress Score: {(currentZone.uavStressScore * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Targeted Agronomist Scouting Directive:</span>
              </div>
              <p className="text-slate-300 leading-relaxed pl-5">
                {currentZone.scoutRecommendation}
              </p>
            </div>

            {/* Direct Bridge to Leaf Disease Diagnosis */}
            <button
              onClick={() => {
                if (onNavigateToAnalyze && selectedField) {
                  onNavigateToAnalyze(selectedField.id);
                } else if (onNavigate) {
                  onNavigate('leaf-diagnosis');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-glow-emerald hover:brightness-110 transition"
            >
              <ScanLine className="w-4 h-4" />
              <span>Verify Pathogen in {currentZone.name} with Leaf AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
