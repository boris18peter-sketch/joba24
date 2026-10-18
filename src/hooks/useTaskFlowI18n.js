import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * useTaskFlowI18n — the task-flow dictionaries, loaded only when they are needed.
 *
 * `taskFlowI18n` and its six dictionaries are ~256 KB of translated field labels,
 * options and placeholders for the category forms. Two components imported them
 * statically, which put the whole 256 KB into the ENTRY bundle: every launch
 * parsed and executed it, for every visitor, before first paint — even though the
 * strings are only ever read while a category form is on screen, and Hebrew (the
 * language those strings are written in) needs none of it at all.
 *
 * They are now fetched as their own chunk, the first time a component asks for
 * them. Hebrew returns immediately and never triggers the download.
 *
 * The returned `tTaskFlow` keeps the exact signature of the module it wraps, so
 * every existing call site is unchanged — it simply returns the Hebrew source
 * string until the dictionary has arrived.
 */
let modulePromise = null;
const loadTaskFlowI18n = () => {
  if (!modulePromise) modulePromise = import('@/lib/taskFlowI18n').catch(() => null);
  return modulePromise;
};

export default function useTaskFlowI18n() {
  const { lang } = useLanguage();
  const [mod, setMod] = useState(null);

  useEffect(() => {
    // Hebrew is the language these strings are written in: there is nothing to
    // translate, so nothing is ever downloaded for a Hebrew launch.
    if (lang === 'he' || mod) return;
    let alive = true;
    loadTaskFlowI18n().then((m) => { if (alive && m) setMod(m); });
    return () => { alive = false; };
  }, [lang, mod]);

  return {
    tTaskFlow: (text, l) => (mod ? mod.tTaskFlow(text, l) : text),
    tTaskFlowOptions: (options, l) => (mod ? mod.tTaskFlowOptions(options, l) : options),
    ready: !!mod || lang === 'he',
  };
}