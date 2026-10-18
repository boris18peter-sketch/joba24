import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { loadTaskFlowI18n, getLoadedTaskFlowI18n } from '@/lib/taskFlowI18nLoader';

/**
 * useTaskFlowI18n — the task-flow dictionaries, read without ever painting the
 * Hebrew source text at a visitor who chose another language.
 *
 * `taskFlowI18n` and its six dictionaries are ~256 KB of translated field labels,
 * options and placeholders for the category forms. They are a dynamic chunk, not
 * part of the entry bundle, and for a non-Hebrew visitor they are fetched by the
 * LANGUAGE load — the same load that already holds the first paint. By the time
 * any of these components renders, the module is therefore already in memory and
 * the first render is in the right language. There is no flash to correct.
 *
 * `getLoadedTaskFlowI18n()` is read during render rather than copied into state
 * on mount. That is what makes a language SWITCH correct on its first pass as
 * well: setLang awaits the language load before switching, so the module is
 * present the moment the new language reaches the UI.
 *
 * The returned `tTaskFlow` keeps the exact signature of the module it wraps, so
 * every existing call site is unchanged.
 *
 * Hebrew is the language these strings are written in: nothing is fetched, the
 * component renders on its first pass, and the Hebrew cold start is untouched.
 */
export default function useTaskFlowI18n() {
  const { lang } = useLanguage();
  const [, forceRender] = useState(0);

  // Synchronous read — see above.
  const mod = getLoadedTaskFlowI18n();

  useEffect(() => {
    // Nothing to fetch for Hebrew, and nothing to fetch once it is in memory.
    if (mod || lang === 'he') return;
    let alive = true;
    // Reached only when the language load could not deliver the chunk (a stalled
    // or failed network). The retry is bounded inside the loader; when it also
    // fails, the labels stay in the Hebrew fallback rather than the screen
    // breaking or the component loading forever.
    loadTaskFlowI18n().then((m) => { if (alive && m) forceRender((n) => n + 1); });
    return () => { alive = false; };
  }, [lang, mod]);

  return {
    tTaskFlow: (text, l) => (mod ? mod.tTaskFlow(text, l) : text),
    tTaskFlowOptions: (options, l) => (mod ? mod.tTaskFlowOptions(options, l) : options),
    ready: !!mod || lang === 'he',
  };
}