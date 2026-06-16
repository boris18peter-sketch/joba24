import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, RTL_LANGS, detectLanguage } from '@/lib/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('joba24_lang') || 'he');
  const [ready, setReady] = useState(false);

  // On mount: detect language from IP if not saved
  useEffect(() => {
    if (localStorage.getItem('joba24_lang')) {
      setReady(true);
      return;
    }
    detectLanguage().then(detected => {
      setLangState(detected);
      setReady(true);
    });
  }, []);

  // Apply dir + lang to <html>
  useEffect(() => {
    const isRTL = RTL_LANGS.has(lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    localStorage.setItem('joba24_lang', code);
    setLangState(code);
  }, []);

  const t = useCallback((key, fallback) => {
    return translations[lang]?.[key] ?? translations['he']?.[key] ?? fallback ?? key;
  }, [lang]);

  const isRTL = RTL_LANGS.has(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}