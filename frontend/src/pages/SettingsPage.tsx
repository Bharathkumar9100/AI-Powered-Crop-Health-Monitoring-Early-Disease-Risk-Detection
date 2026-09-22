import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Cpu,
  Database,
  CheckCircle2,
  Shield,
  Radio,
  Sparkles,
  ExternalLink,
  Layers,
  Sprout,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { SupportedLanguage } from '../i18n/translations';

export const SettingsPage: React.FC = () => {
  const { user, language, setLanguage } = useAuth();
  const { t } = useTranslation();

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{t('nav_settings')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            System & Preferences
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure interface language, view deep learning model architecture specs, and inspect data pipelines.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      {/* Language Preferences */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2.5 mb-4">
          <Globe className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-white text-base">Regional Language Interface</h3>
            <p className="text-xs text-slate-400">Select your preferred Indian agricultural language</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { code: 'en', name: 'English', native: 'English' },
            { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
            { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
            { code: 'te', name: 'Telugu', native: 'తెలుగు' },
            { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
          ].map((item) => (
            <button
              key={item.code}
              onClick={() => handleLanguageChange(item.code as SupportedLanguage)}
              className={`p-3 rounded-xl border text-center transition ${
                language === item.code
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-glow-emerald'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="block text-sm font-semibold">{item.native}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Model Diagnostics & Specifications */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2.5 mb-4">
          <Cpu className="w-5 h-5 text-teal-400" />
          <div>
            <h3 className="font-bold text-white text-base">Deep Learning Architecture</h3>
            <p className="text-xs text-slate-400">Convolutional neural network specifications and explainability stack</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Vision Backbone</span>
            <p className="text-white font-bold text-sm">EfficientNet-B0 / MobileNetV3</p>
            <p className="text-slate-400 text-[11px]">Transfer learning optimized for edge devices and low-latency inference.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Training Dataset</span>
            <p className="text-white font-bold text-sm">PlantVillage Benchmark (38 Classes)</p>
            <p className="text-slate-400 text-[11px]">54,306 curated crop images spanning 14 species and 26 disease states.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Explainability Protocol</span>
            <p className="text-white font-bold text-sm">Grad-CAM (Gradient-weighted Class Activation)</p>
            <p className="text-slate-400 text-[11px]">Visualizes target layer gradients to highlight biological lesion boundaries.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Multispectral Integration</span>
            <p className="text-white font-bold text-sm">Sentinel-2 MSI (Copernicus API)</p>
            <p className="text-slate-400 text-[11px]">Automated Level-2A surface reflectance B4/B8 band retrieval.</p>
          </div>
        </div>
      </div>

      {/* Multi-Dataset Architecture Suite */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-base">Multi-Dataset Training & Validation Architecture</h3>
              <p className="text-xs text-slate-400">4-Tier benchmark and remote-sensing dataset pipeline</p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            4 Datasets Integrated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Dataset 1: PlantVillage */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">PlantVillage — Plant Disease</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                Lab Benchmark
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              54,303 leaf images across 38 crop and pathogen classes. Serves as the primary baseline for training CNN / EfficientNet disease classification models.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400">54k Images • 38 Classes</span>
              <a
                href="https://www.kaggle.com/datasets/mohitsingh1804/plantvillage"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Kaggle PlantVillage</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Dataset 2: Field-acquired Plant Disease */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 transition space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Field-acquired Plant Disease</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                In-Field Validation
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Real-world field images with natural farm backgrounds, shadows, and dynamic outdoor lighting. Validates model generalization beyond lab conditions.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400">Outdoor Lighting • Natural Soil BG</span>
              <a
                href="https://www.kaggle.com/datasets/alexzcheny/testdataset"
                target="_blank"
                rel="noreferrer"
                className="text-teal-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Kaggle Field Dataset</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Dataset 3: Sentinel-2 Satellite Imagery */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Sentinel-2 Satellite Imagery</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                Multispectral Macro
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              27,000 multispectral satellite image patches across 10 land-cover classes. Maps agricultural parcels, vegetation clusters, and land-use context.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400">27k Patches • 10 Land Classes</span>
              <a
                href="https://www.kaggle.com/datasets/gallo33henrique/sentinel-2-satellite-imagery"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Kaggle Sentinel-2</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Dataset 4: Sentinel-2 Time Series for Crop Mapping */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Sentinel-2 Time Series Crop Mapping</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                Early Forecasting
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Multi-temporal Sentinel-2 imagery tracking crop phenology changes over acquisition dates. Essential for early vegetative vigor drop forecasting.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400">Multi-Temporal • Phenology Curves</span>
              <a
                href="https://www.kaggle.com/datasets/ignazio/sentinel2-crop-mapping/data"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Kaggle Time Series</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Backend & Deployment Telemetry */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2.5 mb-4">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white text-base">Platform Infrastructure</h3>
            <p className="text-xs text-slate-400">Database, security, and API status</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="text-slate-300">Database Engine:</span>
            <span className="font-mono text-emerald-400 font-semibold">SQLite WAL + Async SQLAlchemy 2.0</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="text-slate-300">Speech Audio Engine:</span>
            <span className="font-mono text-emerald-400 font-semibold">W3C Web Speech API (Native Browser)</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="text-slate-300">Authentication:</span>
            <span className="font-mono text-emerald-400 font-semibold">JWT Bearer HS256 + Bcrypt</span>
          </div>
        </div>
      </div>
    </div>
  );
};
