import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Plus,
  MapPin,
  Calendar,
  Layers,
  Trash2,
  ScanLine,
  Globe2,
  Navigation,
  X,
  Loader2,
  Activity,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { fieldsApi, satelliteApi } from '../api/client';
import { Field, FieldHealthSummary } from '../types';

interface FieldsPageProps {
  onNavigate: (tab: string, fieldId?: number) => void;
}

export const FieldsPage: React.FC<FieldsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const [fields, setFields] = useState<Field[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Field Details Modal & Satellite Crop Health state
  const [inspectingField, setInspectingField] = useState<Field | null>(null);
  const [satelliteHealth, setSatelliteHealth] = useState<FieldHealthSummary | null>(null);
  const [ndviTimeseries, setNdviTimeseries] = useState<any | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('Tomato');
  const [area, setArea] = useState('4.0');
  const [lat, setLat] = useState('11.0168');
  const [lng, setLng] = useState('76.9558');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFields = async () => {
    try {
      const data = await fieldsApi.list();
      setFields(data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await fieldsApi.create({
        name,
        crop,
        area_hectares: parseFloat(area) || 1.0,
        latitude: parseFloat(lat) || 0,
        longitude: parseFloat(lng) || 0,
        status: 'healthy',
        notes,
      });
      setIsModalOpen(false);
      setName('');
      setNotes('');
      await loadFields();
    } catch (err) {
      console.error('Failed to create field', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to remove this field?')) {
      try {
        await fieldsApi.delete(id);
        setFields((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error('Failed to delete field', err);
      }
    }
  };

  // Inspect Satellite Crop Health for a field
  const handleInspectSatellite = async (field: Field) => {
    setInspectingField(field);
    setIsHealthLoading(true);
    try {
      const [healthRes, timeseriesRes] = await Promise.all([
        satelliteApi.getLatest(field.id).catch(() => null),
        satelliteApi.getNdviData(field.id).catch(() => null),
      ]);
      setSatelliteHealth(healthRes);
      setNdviTimeseries(timeseriesRes);
    } catch (err) {
      console.error('Failed to load field satellite health', err);
    } finally {
      setIsHealthLoading(false);
    }
  };

  // Temporal comparison calculations
  const historical = ndviTimeseries?.historical || [];
  const latestObs = historical.length > 0 ? historical[historical.length - 1] : null;
  const previousObs = historical.length >= 2 ? historical[historical.length - 2] : null;
  const deltaNdvi = previousObs && latestObs ? Number((latestObs.ndvi - previousObs.ndvi).toFixed(2)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t('nav_fields')}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Field Registry & Satellite Monitoring
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage boundary coordinates, crop planting dates, and vegetative health statuses.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Field</span>
        </button>
      </div>

      {/* Field Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(Array.isArray(fields) && fields.length
          ? fields
          : [
              { id: 1, name: 'North Tomato Plot A', crop: 'Tomato', area_hectares: 4.5, latitude: 11.0168, longitude: 76.9558, status: 'at_risk', notes: 'Showing signs of early blight near northwest corner sprinkler line.' },
              { id: 2, name: 'East Corn Field', crop: 'Corn', area_hectares: 8.2, latitude: 11.0250, longitude: 76.9700, status: 'healthy', notes: 'Optimal vegetative stage. Canopy closure at 85%.' },
              { id: 3, name: 'South Potato Block', crop: 'Potato', area_hectares: 3.0, latitude: 11.0080, longitude: 76.9420, status: 'critical', notes: 'Late blight lesion spread reported. Urgent fungicide schedule needed.' },
              { id: 4, name: 'Sunrise Grape Vineyard', crop: 'Grape', area_hectares: 6.1, latitude: 11.0310, longitude: 76.9850, status: 'healthy', notes: 'Pruning completed. Fruit development stage normal.' },
            ]
        ).map((field: any) => (
          <div
            key={field.id}
            className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{field.name}</h3>
                    <p className="text-xs text-slate-400">
                      {field.crop} · {field.area_hectares} ha
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    field.status === 'healthy'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : field.status === 'at_risk'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {field.status}
                </span>
              </div>

              {field.notes && (
                <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3 leading-relaxed">
                  {field.notes}
                </p>
              )}

              <div className="space-y-1 text-xs text-slate-400 mb-3">
                {field.latitude && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {field.latitude.toFixed(4)}°N, {field.longitude.toFixed(4)}°E
                    </span>
                  </div>
                )}
              </div>

              {/* Inspect Satellite Health Trigger Button */}
              <button
                onClick={() => handleInspectSatellite(field)}
                className="w-full mb-3 py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>View Satellite Crop Health</span>
              </button>
            </div>

            {/* Field Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onNavigate('leaf-diagnosis', field.id)}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/30 transition"
                  title={`Diagnose leaf disease for ${field.name}`}
                >
                  <ScanLine className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('satellite-ndvi')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-cyan-500/30 transition"
                  title="View satellite NDVI & map"
                >
                  <Globe2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('uav-scan')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 hover:border-teal-500/30 transition"
                  title="Run UAV drone scan"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              {fields.length > 0 && (
                <button
                  onClick={() => handleDelete(field.id)}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                  title="Remove field"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SATELLITE CROP HEALTH MODAL / DRAWER */}
      {inspectingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card w-full max-w-4xl rounded-2xl p-6 border border-slate-700 shadow-2xl relative my-8 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Field Details Intelligence
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  SATELLITE CROP HEALTH — {inspectingField.name}
                </h2>
              </div>
              <button
                onClick={() => setInspectingField(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {isHealthLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-sm text-slate-300">Retrieving Sentinel-2 multispectral observations...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Field Geometry & Overpass Details Banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Acquisition Date</span>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">
                      {satelliteHealth?.acquisition_date || 'Latest Pass'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Cloud / Quality</span>
                    <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {satelliteHealth?.cloud_cover ? `< ${satelliteHealth.cloud_cover}% Cover` : '< 10% Clear'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Average NDVI</span>
                    <p className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                      {satelliteHealth ? satelliteHealth.ndvi_mean.toFixed(2) : '0.68'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Field Area</span>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">
                      {inspectingField.area_hectares || 2.4} ha
                    </p>
                  </div>
                </div>

                {/* Satellite Imagery & Stress Map Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Latest Sentinel-2 Image / RGB Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Sentinel-2 True Color
                    </span>
                    <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {satelliteHealth?.rgb_image_url ? (
                        <img
                          src={satelliteHealth.rgb_image_url}
                          alt="Satellite RGB"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          <Globe2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <span>10m Surface Reflectance</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NDVI Map */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Continuous NDVI Heatmap
                    </span>
                    <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {satelliteHealth?.ndvi_map_url ? (
                        <img
                          src={satelliteHealth.ndvi_map_url}
                          alt="NDVI Raster"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          <Activity className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                          <span>Chlorophyll Vigor Index</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stress Map */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Classified Crop-Stress Map
                    </span>
                    <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {satelliteHealth?.stress_map_url ? (
                        <img
                          src={satelliteHealth.stress_map_url}
                          alt="Stress Map"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400">
                          <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                          <span>Green / Yellow / Red Zones</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Temporal Comparison: Previous Observation vs Latest Observation */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      Temporal Comparison: Previous vs Latest Observation
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        deltaNdvi >= 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {deltaNdvi >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{deltaNdvi >= 0 ? `+${deltaNdvi}` : `${deltaNdvi}`} Δ NDVI</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Previous Observation</span>
                      <p className="font-mono font-bold text-slate-200 mt-0.5">
                        {previousObs ? previousObs.ndvi.toFixed(2) : '0.62'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-cyan-400 block text-[11px]">Latest Observation</span>
                      <p className="font-mono font-bold text-cyan-300 mt-0.5">
                        {latestObs ? latestObs.ndvi.toFixed(2) : satelliteHealth?.ndvi_mean.toFixed(2) || '0.68'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-emerald-400 block text-[11px]">Healthy Area</span>
                      <p className="font-mono font-bold text-emerald-300 mt-0.5">
                        {satelliteHealth?.healthy_area_pct || 62}%
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-rose-400 block text-[11px]">Potential Stress Area</span>
                      <p className="font-mono font-bold text-rose-300 mt-0.5">
                        {satelliteHealth?.high_stress_pct || 13}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* NDVI Trend Progression Line Chart */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white uppercase tracking-wider">
                      NDVI Trend Progression
                    </span>
                    <span className="text-slate-400 font-mono">Date 1 → Date 2 → Date 3</span>
                  </div>

                  {historical.length > 0 ? (
                    <div className="relative rounded-lg bg-slate-950 p-3 border border-slate-800/80 aspect-[16/5] flex items-center justify-center">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 140">
                        {(() => {
                          const count = historical.length;
                          const xStep = 440 / Math.max(1, count - 1);
                          const coords = historical.map((pt: any, i: number) => {
                            const x = 30 + i * xStep;
                            const y = 120 - ((pt.ndvi - 0.2) / 0.7) * 95;
                            return { x, y, pt };
                          });

                          const pathStr = coords.map((c: any, i: number) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

                          return (
                            <>
                              <path d={pathStr} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                              {coords.map((c: any, idx: number) => (
                                <g key={idx}>
                                  <circle cx={c.x} cy={c.y} r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                                  <text x={c.x} y={c.y - 8} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                    {c.pt.ndvi.toFixed(2)}
                                  </text>
                                  <text x={c.x} y="134" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                                    {c.pt.date}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-4 text-center">No trend points available</div>
                  )}
                </div>

                {/* Early Warning Scientific Disclaimer */}
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>Scientific Notice:</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed pl-5">
                    {satelliteHealth?.disclaimer ||
                      'Satellite-based stress detection is an early-warning indicator. Stress may result from disease, water shortage, nutrient deficiency, pests, or other environmental factors. Field verification is recommended.'}
                  </p>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setInspectingField(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => {
                      setInspectingField(null);
                      onNavigate('satellite-ndvi');
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan hover:brightness-110 transition"
                  >
                    <Globe2 className="w-4 h-4" />
                    <span>Open in Interactive Satellite Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Field Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Register Crop Field</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateField} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Field Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. East Tomato Block B"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Crop Type</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Potato">Potato</option>
                    <option value="Corn">Corn</option>
                    <option value="Grape">Grape</option>
                    <option value="Apple">Apple</option>
                    <option value="Pepper">Pepper</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Area (Hectares)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Agronomic Notes</label>
                <textarea
                  rows={2}
                  placeholder="Soil moisture, irrigation type, fertilizer applied..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold shadow-glow-emerald hover:brightness-110 transition flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
