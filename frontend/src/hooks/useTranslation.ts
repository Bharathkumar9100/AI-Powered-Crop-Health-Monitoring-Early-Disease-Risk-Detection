import { useAuth } from '../context/AuthContext';
import { translations, SupportedLanguage } from '../i18n/translations';

export const useTranslation = () => {
  const { language } = useAuth();
  const currentLang = (language in translations ? language : 'en') as SupportedLanguage;

  const t = (key: string, fallback?: string): string => {
    return translations[currentLang]?.[key] || translations['en']?.[key] || fallback || key;
  };

  return { t, language: currentLang };
};
