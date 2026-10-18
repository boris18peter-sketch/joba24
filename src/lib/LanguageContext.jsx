import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, RTL_LANGS, detectLanguage, loadLanguage, isLanguageLoaded } from '@/lib/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('joba24_lang') || 'he');
  // Hebrew is compiled into the entry bundle, so a launch with no saved choice —
  // or a Hebrew one, which is the overwhelming majority — is ready on the very
  // FIRST render. `ready` is false only for a returning visitor whose saved
  // language is not Hebrew, and only until that language's chunk arrives.
  const [ready, setReady] = useState(() => isLanguageLoaded(lang));
  // Bumped when a dictionary lands AFTER the guard already released the screen,
  // so that arrival actually reaches the UI. See the load below.
  const [, setDictTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // No saved choice: render in Hebrew straight away (ready is already true)
    // and let IP detection refine it in the background — the same first-run
    // behaviour as before, so the cold start is untouched.
    if (!localStorage.getItem('joba24_lang')) {
      detectLanguage().then(async (detected) => {
        await loadLanguage(detected);
        if (!cancelled && detected !== 'he') setLangState(detected);
      });
      return () => { cancelled = true; };
    }

    // A saved choice: hold the first paint until that dictionary is in memory,
    // so the app never flashes Hebrew at a visitor who chose another language.
    // Bounded — if the chunk has not arrived in 3s we render anyway with the
    // Hebrew fallback rather than leaving a loading screen up. (loadLanguage
    // never rejects; this guards a stalled network, it is not a failure path.)
    if (isLanguageLoaded(lang)) return;
    const guard = setTimeout(() => { if (!cancelled) setReady(true); }, 3000);
    loadLanguage(lang).then(() => {
      if (cancelled) return;
      setReady(true);
      // The guard may already have released the screen. setReady(true) is then a
      // no-op to React — the same value — so without this bump the dictionary
      // would sit in memory and never reach the UI: the visitor would keep
      // reading the Hebrew fallback until some unrelated render came along.
      // One bump per load, so there is no render loop.
      setDictTick((n) => n + 1);
    });
    return () => { cancelled = true; clearTimeout(guard); };
  }, []);

  // Apply dir + lang to <html>. Runs on the first render's value, so RTL is
  // already correct before any dictionary has loaded.
  useEffect(() => {
    const isRTL = RTL_LANGS.has(lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(async (code) => {
    localStorage.setItem('joba24_lang', code);
    // Load first, switch after: the new language is never displayed while the
    // previous dictionary is still the only one in memory.
    await loadLanguage(code);
    setLangState(code);
  }, []);

  const t = useCallback((key, paramsOrFallback) => {
    // Falls back to Hebrew for any key the active language does not define.
    const val = translations[lang]?.[key] ?? translations['he']?.[key];
    if (val === undefined) {
      return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
    }
    if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      return val.replace(/\{(\w+)\}/g, (_, k) =>
        paramsOrFallback[k] != null ? String(paramsOrFallback[k]) : `{${k}}`);
    }
    return val;
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