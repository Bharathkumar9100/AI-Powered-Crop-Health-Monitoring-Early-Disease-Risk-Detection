import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { analyzeApi, fieldsApi } from '../api/client';
import { ImageAnalysisResponse, Field } from '../types';

interface AnalyzePageProps {
  onNavigateToChatWithContext?: (context: any) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({ onNavigateToChatWithContext }) => {
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | undefined>(undefined);
  const [fields, setFields] = useState<Field[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ImageAnalysisResponse | null>(null);
  const [activeCamView, setActiveCamView] = useState<'overlay' | 'heatmap' | 'original'>('overlay');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load fields on mount
  React.useEffect(() => {
    fieldsApi.list().then(setFields).catch(() => {});
  }, []);

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

  // Demo presets for easy instant testing
  const loadDemoSample = async (sampleName: string, crop: string, disease: string) => {
    // Generate a simple colored canvas image blob as demo upload
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Leaf green gradient with disease spots
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#15803d');
      grad.addColorStop(1, '#166534');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);

      // Add leaf vein lines
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(200, 400);
      ctx.quadraticCurveTo(200, 200, 200, 50);
      ctx.stroke();

      // Add lesion spots if disease
      if (disease.toLowerCase() !== 'healthy') {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(180, 160, 35, 0, Math.PI * 2);
        ctx.arc(230, 240, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(180, 160, 42, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Add text tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText(`${crop} - ${disease}`, 20, 370);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${crop}_${disease}.jpg`, { type: 'image/jpeg' });
          handleFileChange(file);
        }
      }, 'image/jpeg');
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

          {/* Quick Demo Presets with Multi-Dataset Indicators */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Instant Leaf Test Presets
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Multi-Dataset Ready</span>
            </div>

            {/* Group 1: PlantVillage Laboratory Benchmark */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
                <span className="font-semibold text-emerald-400">🔬 PlantVillage Benchmark (Lab)</span>
                <span>54k Images / 38 Classes</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => loadDemoSample('sample_tomato', 'Tomato', 'Early blight')}
                  className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs transition group"
                >
                  <span className="font-semibold text-amber-400 block group-hover:text-amber-300">Tomato Early Blight</span>
                  <span className="text-[10px] text-slate-400">Alternaria solani</span>
                </button>
                <button
                  onClick={() => loadDemoSample('sample_potato', 'Potato', 'Late blight')}
                  className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs transition group"
                >
                  <span className="font-semibold text-rose-400 block group-hover:text-rose-300">Potato Late Blight</span>
                  <span className="text-[10px] text-slate-400">Phytophthora infestans</span>
                </button>
              </div>
            </div>

            {/* Group 2: Field-Acquired Plant Disease Dataset */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
                <span className="font-semibold text-teal-400">🌾 Field-Acquired Dataset (Real World)</span>
                <span>Natural Lighting & Soil BG</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => loadDemoSample('sample_corn', 'Corn', 'Common rust')}
                  className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs transition group"
                >
                  <span className="font-semibold text-amber-300 block group-hover:text-amber-200">Corn Common Rust</span>
                  <span className="text-[10px] text-slate-400">In-Field Sunlight</span>
                </button>
                <button
                  onClick={() => loadDemoSample('sample_healthy', 'Tomato', 'healthy')}
                  className="text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs transition group"
                >
                  <span className="font-semibold text-emerald-400 block group-hover:text-emerald-300">Healthy Canopy</span>
                  <span className="text-[10px] text-slate-400">Field Background</span>
                </button>
              </div>
            </div>
          </div>

          {/* Field Selection & Submit Action */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Associate with Field (Optional)
              </label>
              <select
                value={selectedFieldId || ''}
                onChange={(e) => setSelectedFieldId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- No specific field --</option>
                {(Array.isArray(fields) ? fields : []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.crop})
                  </option>
                ))}
              </select>
            </div>

            <button
              disabled={!selectedFile || isAnalyzing}
              onClick={handleRunAnalysis}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Neural Attention...</span>
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

                {/* Grad-CAM Explainable AI Visualizer */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-white">{t('label_gradcam')}</span>
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
                          ? 'Grad-CAM Attention Overlay'
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
                Select an image on the left or choose one of the instant sample tests to generate the deep learning pathology report and Grad-CAM attention heatmap.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
