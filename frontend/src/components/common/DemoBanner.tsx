import React, { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  if (dismissed) return null;

  return (
    <aside aria-label="Demo notice" className="bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-amber-950/90 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-500/30 uppercase tracking-wide">
            Enterprise System Active
          </span>
          <span className="hidden sm:inline text-slate-300">
            Sentinel-2 Multispectral Sync & EfficientNet Neural Diagnostic Network Active
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Stress ≠ Diagnosis</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
