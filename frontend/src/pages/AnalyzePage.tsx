import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Layers,
  ArrowRight,
  Sparkles,
  Loader2,
  FileImage,
  ExternalLink,
  Sprout,
  Leaf,
  ShieldCheck,
  Database,
  MapPin,
  Check,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { analyzeApi, fieldsApi } from '../api/client';
import { ImageAnalysisResponse, Field } from '../types';

interface AnalyzePageProps {
  onNavigateToChatWithContext?: (context: any) => void;
  initialFieldId?: number;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({ onNavigateToChatWithContext, initialFieldId }) => {
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | undefined>(initialFieldId);
  const [fields, setFields] = useState<Field[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null);
  const [activeCamView, setActiveCamView] = useState<'overlay' | 'heatmap' | 'original'>('overlay');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load fields on mount and auto-select default field
  useEffect(() => {
    fieldsApi.list().then((loadedFields) => {
      setFields(loadedFields);
      if (loadedFields && loadedFields.length > 0 && !selectedFieldId) {
        setSelectedFieldId(initialFieldId || loadedFields[0].id);
      }
    }).catch(() => {});
  }, [initialFieldId]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const response = await analyzeApi.analyzeLeaf(selectedFile, selectedFieldId);
      setResult(response);
    } catch (err) {
      console.error('Analysis failed', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{t('nav_leaf_scan')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Explainable AI
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload or capture a clear photo of an infected leaf. Deep learning will classify the pathogen and visualize the decision regions with Grad-CAM.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Image Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="glass-card rounded-2xl p-6 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 transition flex flex-col items-center justify-center min-h-[300px] text-center relative"
          >
            {previewUrl ? (
              <div className="w-full relative group">
                <img
                  src={previewUrl}
                  alt="Crop preview"
                  className="w-full h-64 object-cover rounded-xl border border-slate-700 shadow-md"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setResult(null);
                  }}
                  className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-500 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Drag & drop leaf photo here</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Supports JPG, PNG, WEBP (up to 10MB)</p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>Browse Device</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Field Association & Agronomic Traceability */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Field Association</span>
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Traceable Agronomy
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5 flex items-center justify-between">
                <span>Select Target Field for Sample</span>
                <span className="text-[10px] text-emerald-400">Required</span>
              </label>
              <select
                id="select-associate-field"
                value={selectedFieldId || ''}
                onChange={(e) => setSelectedFieldId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose registered field --</option>
                {(Array.isArray(fields) ? fields : []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.crop} — {f.area_hectares || 1.0} ha)
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Field Information Card */}
            {selectedField ? (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{selectedField.name}</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    selectedField.status === 'healthy'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {selectedField.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500">Registered Crop: </span>
                    <strong className="text-slate-200">{selectedField.crop}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Plot Size: </span>
                    <strong className="text-slate-200">{selectedField.area_hectares || 1.0} Hectares</strong>
                  </div>
                  {selectedField.latitude && (
                    <div className="col-span-2 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>{selectedField.latitude.toFixed(4)}°N, {selectedField.longitude?.toFixed(4)}°E</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-emerald-400/90 flex items-center gap-1 pt-0.5">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Diagnosis history and pathogen alerts will link to this field plot.</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Please select a field to associate this leaf specimen with its crop registry, health logs, and soil advisories.
                </span>
              </div>
            )}

            <button
              disabled={!selectedFile || isAnalyzing}
              onClick={handleRunAnalysis}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Foliar Pathology...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('btn_analyze')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Prediction & Grad-CAM Visualizations */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="space-y-6">
              {/* Top Result Card */}
              <div className="glass-card rounded-2xl p-5 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Diagnosis Result
                    </span>
                    <h2 className="text-xl font-extrabold text-white mt-0.5">
                      {result.prediction.crop} — {result.prediction.disease}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      result.prediction.is_healthy
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : result.prediction.severity === 'high' || result.prediction.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {result.prediction.severity} Severity
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {(result.prediction.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                  {result.prediction.explanation}
                </p>

                {/* Grad-CAM Explainable AI Visualizer (Generated ONLY for diseased leaves) */}
                {!result.prediction.is_healthy ? (
                  <div className="border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs text-white">{t('label_gradcam')}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                          Pathogen Localized
                        </span>
                      </div>
                      {/* Visualizer Toggle */}
                      <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
                        <button
                          id="tab-cam-overlay"
                          onClick={() => setActiveCamView('overlay')}
                          className={`px-2.5 py-1 rounded-md font-medium transition ${
                            activeCamView === 'overlay' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          Overlay
                        </button>
                        <button
                          id="tab-cam-heatmap"
                          onClick={() => setActiveCamView('heatmap')}
                          className={`px-2.5 py-1 rounded-md font-medium transition ${
                            activeCamView === 'heatmap' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          Heatmap
                        </button>
                        <button
                          id="tab-cam-original"
                          onClick={() => setActiveCamView('original')}
                          className={`px-2.5 py-1 rounded-md font-medium transition ${
                            activeCamView === 'original' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          Original
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
                      <img
                        src={(() => {
                          if (activeCamView === 'original') return previewUrl || '';
                          const raw = activeCamView === 'heatmap' ? result.heatmap_url : result.overlay_url;
                          if (!raw) return previewUrl || '';
                          if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
                          const clean = raw.replace(/\\/g, '/').replace(/^\/+/, '');
                          return `/${clean}`;
                        })()}
                        alt={`${activeCamView} Explainable AI view`}
                        className="w-full h-full object-contain"
                      />

                      <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-slate-950/80 backdrop-blur-md text-[11px] text-slate-300 border border-slate-800 flex items-center justify-between">
                        <span>
                          {activeCamView === 'overlay'
                            ? 'Grad-CAM Attention Overlay (Pathogen Regions)'
                            : activeCamView === 'heatmap'
                            ? 'Thermal Activation Heatmap'
                            : 'Original Leaf Image'}
                        </span>
                        <span className="text-amber-400 font-semibold uppercase text-[10px]">
                          {activeCamView === 'overlay' ? 'OVERLAY' : activeCamView === 'heatmap' ? 'HEATMAP' : 'ORIGINAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Specimen Verified Healthy: No Grad-CAM Needed */
                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">Specimen Verified Healthy</span>
                          <span className="text-[10px] text-slate-400">Zero Disease Regions Detected</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Clear Foliage
                      </span>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/30 shadow-inner group">
                      <img
                        src={previewUrl || ''}
                        alt="Healthy leaf specimen"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-slate-950/85 backdrop-blur-md text-[11px] text-slate-300 border border-emerald-500/30 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Uniform Vegetative Cellular Structure</span>
                        </span>
                        <span className="text-emerald-400 font-mono text-[10px] font-bold uppercase">
                          HEALTHY CANOPY
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-emerald-300">Grad-CAM Notice:</strong> Grad-CAM neural attention heatmaps are exclusively generated for diseased specimens to locate lesion boundaries and fungal spore sites. Because this leaf is healthy, no pathogen activation heatmaps were produced.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 🌿 Dedicated Organic Fertilizer & Bio-Remedy Suggestions */}
              <div className="glass-card rounded-2xl p-5 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-teal-950/20 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Organic Fertilizers & Bio-Remedies</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          100% Eco-Friendly
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Tailored biological nutrition and natural pathogen suppression for {result.prediction.crop}
                      </p>
                    </div>
                  </div>

                  {result.prediction.organic_badge && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-glow-emerald">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{result.prediction.organic_badge}</span>
                    </span>
                  )}
                </div>

                {/* Primary Organic Fertilizers & Soil Nutrients */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Recommended Organic Fertilizers & Bio-Stimulants:</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Regenerative Soil Care</span>
                  </div>

                  <ul className="space-y-2">
                    {(result.prediction.organic_fertilizers && result.prediction.organic_fertilizers.length > 0
                      ? result.prediction.organic_fertilizers
                      : [
                          'Apply Vermicompost @ 500 kg/acre pre-inoculated with Trichoderma viride to suppress soil-borne pathogens.',
                          'Foliar spray of 3% Panchagavya (30 mL/L) bi-weekly for systemic immunity.',
                          'Drench root zone with Liquid Jeevamrutha (200 L/acre) every 14 days.',
                          'Incorporate Neem cake meal (200 kg/acre) around drip-line to supply bio-nitrogen and deter nematodes.'
                        ]
                    ).map((fert, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-xs text-slate-200 hover:border-emerald-500/40 transition"
                      >
                        <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{fert}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Structured Biological Control Agents & Organic Sprays */}
                {result.prediction.bio_remedies && result.prediction.bio_remedies.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                      <span>Biological Sprays & Antifungal Formulations:</span>
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {result.prediction.bio_remedies.map((remedy, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-white text-[12px]">{remedy.title}</span>
                            <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              {remedy.type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-300 font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                            <strong>Dosage:</strong> {remedy.application}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            {remedy.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct AI Consultation Button for Custom Organic Mix */}
                {onNavigateToChatWithContext && (
                  <button
                    onClick={() =>
                      onNavigateToChatWithContext({
                        crop: result.prediction.crop,
                        disease: result.prediction.disease,
                        severity: result.prediction.severity,
                        risk_level: result.prediction.risk_level,
                        recommendations: result.prediction.recommendations,
                        organic_fertilizers: result.prediction.organic_fertilizers,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-300 border border-emerald-500/40 font-semibold text-xs transition active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ask Gemini AI for Personalized Organic Fertilizer Recipe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Multi-Dataset Source Telemetry */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-400">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    Classification Benchmark: <strong className="text-slate-200">{result.prediction.dataset_source || 'PlantVillage (38 Classes)'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="https://www.kaggle.com/datasets/mohitsingh1804/plantvillage"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>PlantVillage Kaggle</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-700">|</span>
                  <a
                    href="https://www.kaggle.com/datasets/alexzcheny/testdataset"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>Field-Acquired Kaggle</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Agronomic Recommendations</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  {result.prediction.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>

                {/* Ask AI Advisor Button with Context */}
                {onNavigateToChatWithContext && (
                  <button
                    onClick={() =>
                      onNavigateToChatWithContext({
                        crop: result.prediction.crop,
                        disease: result.prediction.disease,
                        severity: result.prediction.severity,
                        risk_level: result.prediction.risk_level,
                        recommendations: result.prediction.recommendations,
                      })
                    }
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold text-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Discuss this diagnosis with AI Assistant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Eye className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="font-bold text-white text-base">Awaiting Leaf Inspection</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Upload or capture a leaf photograph on the left and select your field to generate the deep learning pathology report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
