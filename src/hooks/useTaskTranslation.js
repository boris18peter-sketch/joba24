import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';

function hasHebrew(text) {
  return /[\u0590-\u05FF]/.test(text || '');
}

/**
 * useTaskTranslation — auto-translates task title & description to the user's UI language.
 *
 * How it works (like Twitter):
 *   - When a user whose UI language differs from the task's content language opens a task,
 *     the content is automatically translated and displayed.
 *   - Translations are cached on the task entity (server-side), so each language is
 *     translated only once per task — shared across all users and devices.
 *   - Skips the LLM call entirely when the user is Hebrew AND the task content is in Hebrew
 *     (the most common case in this Israeli app), to save credits and latency.
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
  const skip = !task || (lang === 'he' && hasHebrew(content));

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
    retry: false,
  });

  const isTranslated = !!data?.was_translated;
  return {
    translatedTask: task
      ? {
          ...task,
          title: isTranslated ? data.title : task.title,
          description: isTranslated ? data.description : task.description,
        }
      : task,
    isTranslated,
    sourceLang: data?.source_lang,
    isLoading: !skip && isLoading,
  };
}