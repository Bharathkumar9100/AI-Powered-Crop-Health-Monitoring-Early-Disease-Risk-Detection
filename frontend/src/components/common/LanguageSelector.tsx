import React from 'react';
import { Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SupportedLanguage } from '../../i18n/translations';

const LANGUAGES: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export const LanguageSelector: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { language, setLanguage } = useAuth();

  return (
    <div className="relative inline-flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 shadow-sm">
      <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
        className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
        title="Choose language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
            {compact ? lang.native : `${lang.native} (${lang.label})`}
          </option>
        ))}
      </select>
    </div>
  );
};
