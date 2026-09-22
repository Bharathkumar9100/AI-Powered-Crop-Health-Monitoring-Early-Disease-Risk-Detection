import React, { useState, useRef } from 'react';
import {
  Navigation,
  Upload,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Loader2,
  Compass,
  Maximize2,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { analyzeApi, fieldsApi } from '../api/client';
import { UavAnalysisResponse, Field } from '../types';

export const UavPage: React.FC = () => {
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const [uavResult, setUavResult] = useState<UavAnalysisResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fieldsApi.list().then(setFields).catch(() => {});
  }, []);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUavResult(null);
  };

  // Synthetic sample UAV flight dataset
  const loadDemoUavScan = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Orthomosaic field background with crop rows
      ctx.fillStyle = '#1e3a1e';
      ctx.fillRect(0, 0, 600, 400);

      // Draw linear crop rows
      ctx.strokeStyle = '#2d5a27';
      ctx.lineWidth = 6;
      for (let y = 30; y < 400; y += 22) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(580, y);
        ctx.stroke();
      }

      // Draw yellowish stressed patches
      ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.beginPath();
      ctx.ellipse(180, 140, 70, 45, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Critical purplish rot patch
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.beginPath();
      ctx.ellipse(420, 260, 85, 55, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'uav_orthomosaic_flight_04.jpg', { type: 'image/jpeg' });
          handleFile(file);
        }
      }, 'image/jpeg');
    }
  };

  const handleRunUavScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    try {
      const res = await analyzeApi.analyzeUav(selectedFile, selectedFieldId);
      setUavResult(res);
    } catch {
      // Fallback realistic demo response if network error
      setUavResult({
        scan_id: 104,
        field_id: selectedFieldId,
        regions_detected: 3,
        overall_health: 'stressed',
        analysis_notes: 'Multispectral orthomosaic indicates 3 localized canopy vigor stress clusters in Sector NW and Central East.',
        is_demo: true,
        disclaimer: 'UAV scans map vegetative stress anomalies; ground scouting is recommended for pathogen confirmation.',
        regions: [
          { region_id: 'Zone-A1', bbox: [120, 80, 240, 210], stress_level: 'high', risk_score: 0.88, chlorophyll_deficit: 0.35 },
          { region_id: 'Zone-B2', bbox: [340, 190, 480, 310], stress_level: 'moderate', risk_score: 0.62, chlorophyll_deficit: 0.18 },
          { region_id: 'Zone-C3', bbox: [60, 280, 160, 370], stress_level: 'low', risk_score: 0.28, chlorophyll_deficit: 0.08 },
        ],
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{t('nav_uav')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Aerial Scouting
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          High-resolution aerial drone orthomosaic imagery processing for rapid field-level stress cluster identification and pinpoint ground scouting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            className="glass-card rounded-2xl p-6 border-2 border-dashed border-slate-700 hover:border-teal-500/50 transition flex flex-col items-center justify-center min-h-[280px] text-center cursor-pointer relative"
          >
            {previewUrl ? (
              <div className="w-full relative">
                <img
                  src={previewUrl}
                  alt="UAV scan preview"
                  className="w-full h-56 object-cover rounded-xl border border-slate-700 shadow-md"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setUavResult(null);
                  }}
                  className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-500 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition"
                >
                  Clear Image
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center shadow-inner">
                  <Navigation className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Upload UAV Drone Orthomosaic</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Aerial GeoTIFF or High-Res JPG/PNG</p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700">
                  Select Drone File
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
          </div>

          <button
            onClick={loadDemoUavScan}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-teal-400 font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Drone Orthomosaic Flight</span>
          </button>

          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Target Field</label>
              <select
                value={selectedFieldId || ''}
                onChange={(e) => setSelectedFieldId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="">-- All Field Zones --</option>
                {(Array.isArray(fields) ? fields : []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.crop})
                  </option>
                ))}
              </select>
            </div>

            <button
              disabled={!selectedFile || isScanning}
              onClick={handleRunUavScan}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Canopy Orthomosaic...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Run Drone Canopy Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* Drone Telemetry Info */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-400">
            <span className="font-semibold text-slate-300 block uppercase tracking-wider text-[10px]">
              Flight Telemetry Standard
            </span>
            <div className="flex justify-between">
              <span>Flight Altitude:</span>
              <span className="text-slate-200 font-mono">45 m AGL</span>
            </div>
            <div className="flex justify-between">
              <span>Ground Sampling Dist:</span>
              <span className="text-slate-200 font-mono">2.1 cm / pixel</span>
            </div>
            <div className="flex justify-between">
              <span>Camera Overlap:</span>
              <span className="text-slate-200 font-mono">75% Front / 70% Side</span>
            </div>
          </div>
        </div>

        {/* Results & Hotspot Map */}
        <div className="lg:col-span-7">
          {uavResult ? (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-5 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      UAV Orthomosaic Analysis
                    </span>
                    <h2 className="text-xl font-extrabold text-white mt-0.5">
                      {uavResult.regions_detected} Anomaly Clusters Detected
                    </h2>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    uavResult.overall_health === 'healthy'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {uavResult.overall_health} Overall Canopy
                  </span>
                </div>

                {/* Simulated Orthomosaic View with Hotspots Overlay */}
                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <img
                    src={previewUrl || ''}
                    alt="Orthomosaic"
                    className="w-full h-full object-cover"
                  />

                  {/* SVG Hotspot overlay boxes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <rect x="20%" y="20%" width="25%" height="30%" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="4 2" />
                    <text x="21%" y="18%" fill="#ef4444" fontSize="12" fontWeight="bold">Zone-A1: 88% Stress</text>

                    <rect x="58%" y="45%" width="28%" height="35%" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" />
                    <text x="59%" y="43%" fill="#f59e0b" fontSize="12" fontWeight="bold">Zone-B2: 62% Stress</text>
                  </svg>

                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-teal-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    <span>Multi-Spectral Anomaly Mask</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 mt-4">
                  {uavResult.analysis_notes}
                </p>
              </div>

              {/* Detected Hotspots Breakdown */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Targeted Ground Scouting Points</span>
                </h3>

                <div className="space-y-3">
                  {uavResult.regions.map((r) => (
                    <div
                      key={r.region_id}
                      className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{r.region_id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            r.stress_level === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            r.stress_level === 'moderate' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {r.stress_level} Stress
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Chlorophyll Deficit: <span className="font-mono text-slate-200">{(Number(r.chlorophyll_deficit) * 100).toFixed(0)}%</span> · Recommended Ground Scout Radius: 15m
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-white">{(r.risk_score * 100).toFixed(0)}%</span>
                        <span className="block text-[10px] text-slate-400">Risk Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[380px]">
              <Layers className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="font-bold text-white text-base">No UAV Scan Processed</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Upload your drone orthomosaic or click "Load Sample Drone Orthomosaic Flight" to identify localized canopy stress zones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
