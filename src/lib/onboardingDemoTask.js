import { useLanguage } from '@/lib/LanguageContext';

/**
 * THE task the onboarding illustrations show, defined once.
 *
 * Every explainer screen — the publish form, the price step, the applicants
 * list, the feed card and the task detail — draws its title, description, price
 * and location from this one job. The visitor therefore sees the SAME job at the
 * SAME price all the way through, instead of two different prices attached to
 * two slightly different jobs.
 *
 * ── TRANSLATED ──────────────────────────────────────────────────────────────
 * The wording is a translation key resolved through `useOnboardingTask()`, so
 * the job reads in the visitor's own language on every one of those screens.
 * Only the figures and the category KEY are literal here — a price is a price in
 * every language, and the category key is app data, not copy.
 *
 * `ONBOARDING_TASK` still exposes those language-free values for any code that
 * needs the job's identity rather than its text.
 */
export const ONBOARDING_TASK = {
  price: 250,
  priceLabel: '₪250',
  category: 'electricity',
};

/** The demo job, with every piece of copy resolved for the current language. */
export function useOnboardingTask() {
  const { t } = useLanguage();
  return {
    ...ONBOARDING_TASK,
    title: t('onb_demo_title'),
    description: t('onb_demo_desc'),
    categoryLabel: t('onb_demo_category'),
    location: t('onb_demo_location'),
    city: t('onb_demo_city'),
    time: t('onb_demo_time'),
  };
}