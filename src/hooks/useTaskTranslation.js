import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

// Script detection — lets us skip the network call entirely when the task
// content is already written in the user's UI language script.
const SCRIPT_TESTS = {
  he: { re: /[\u0590-\u05FF]/, name: 'Hebrew' },
  ar: { re: /[\u0600-\u06FF\u0750-\u077F]/, name: 'Arabic' },
  ru: { re: /[\u0400-\u04FF]/, name: 'Cyrillic' },
  hi: { re: /[\u0900-\u097F]/, name: 'Devanagari' },
  zh: { re: /[\u4E00-\u9FFF\u3400-\u4DBF]/, name: 'CJK' },
};

// Latin-script languages can't be reliably distinguished by script alone
// (English, Spanish, French, Filipino all use Latin), so we always send
// those to the backend which detects the language and caches the result.

function contentMatchesLangScript(text, lang) {
  const test = SCRIPT_TESTS[lang];
  if (!test) return false; // Latin-script languages — always send to backend
  return test.re.test(text || '');
}

/**
 * useTaskTranslation — auto-translates task title & description to the user's UI language.
 *
 * How it works (like Twitter):
 *   - When a user whose UI language differs from the task's content language opens a task,
 *     the content is automatically translated and displayed.
 *   - Translations are cached on the task entity (server-side), so each language is
 *     translated only once per task — shared across all users and devices.
 *   - Skips the LLM call entirely when the task content is already in the user's
 *     language script (Hebrew, Arabic, Russian, Hindi, Chinese) — saves credits
 *     and eliminates latency for the most common same-language cases.
 *
 * Returns:
 *   { translatedTask, isTranslated, sourceLang, isLoading }
 *   - translatedTask: a task object with title/description replaced by translations
 *       (or the original task if no translation was needed/available).
 *   - isTranslated: true when the displayed content is a translation.
 *   - sourceLang: the detected source language code (e.g. 'he').
 *   - isLoading: true while the translation is being fetched.
 */
export function useTaskTranslation(task) {
  const { lang } = useLanguage();

  const content = task ? `${task.title || ''} ${task.description || ''}` : '';
  const location = task?.location_name || '';
  // Skip only when BOTH content AND location match the user's language script.
  // Without the location check, a task whose title/description are in the user's
  // language but whose location_name is in a different language (e.g. Hebrew city
  // name on a Russian task) would never get its location translated.
  const skip = !task || (contentMatchesLangScript(content, lang) && contentMatchesLangScript(location, lang));

  const { data, isLoading } = useQuery({
    queryKey: ['taskTranslation', task?.id, lang],
    queryFn: async () => {
      const res = await base44.functions.invoke('translateTask', {
        task_id: task.id,
        target_lang: lang,
      });
      return res.data;
    },
    enabled: !skip,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  const isTranslated = !!data?.was_translated;
  return {
    translatedTask: task
      ? {
          ...task,
          title: isTranslated ? data.title : task.title,
          description: isTranslated ? data.description : task.description,
          location_name: data?.location_name ? data.location_name : task.location_name,
        }
      : task,
    isTranslated,
    sourceLang: data?.source_lang,
    isLoading: !skip && isLoading,
  };
}