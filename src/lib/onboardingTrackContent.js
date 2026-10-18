import { TRACKS } from '@/lib/onboardingTrack';

/**
 * The three explainer slides shown after a track is picked.
 *
 * Copy and pictures only — no analytics, no side effects, no writes. These
 * screens describe the EXISTING flow; they never publish a task or complete a
 * worker profile.
 *
 * Every screen is the same four things and nothing else: a headline, one line of
 * explanation, one illustration, and the continue button. There are deliberately
 * no labels above the headline and no tags anywhere — the headline alone says
 * what the screen is.
 *
 * ── TRANSLATED ──────────────────────────────────────────────────────────────
 * The copy is held as translation KEYS, never as literal Hebrew, so all six
 * screens — and their buttons — render in the visitor's own language. The
 * strings live in @/lib/i18n-onboarding (merged into `translations`), and the
 * components resolve them with t().
 *
 * `visual` names the illustration: the app's OWN components, laid out statically
 * at their real logical width, so each screen shows exactly the interface the
 * visitor is about to meet and follows Light/Dark automatically.
 */
const SLIDES = {
  [TRACKS.PUBLISH]: [
    {
      titleKey: 'onb_pub_s1_title',
      bodyKey: 'onb_pub_s1_body',
      visual: 'task-draft',
    },
    {
      titleKey: 'onb_pub_s2_title',
      bodyKey: 'onb_pub_s2_body',
      visual: 'price',
    },
    {
      titleKey: 'onb_pub_s3_title',
      bodyKey: 'onb_pub_s3_body',
      visual: 'applicants',
    },
  ],
  [TRACKS.WORKER]: [
    {
      titleKey: 'onb_wrk_s1_title',
      bodyKey: 'onb_wrk_s1_body',
      visual: 'worker-profile',
    },
    {
      titleKey: 'onb_wrk_s2_title',
      bodyKey: 'onb_wrk_s2_body',
      visual: 'feed',
    },
    {
      titleKey: 'onb_wrk_s3_title',
      bodyKey: 'onb_wrk_s3_body',
      visual: 'task-detail',
    },
  ],
};

/** The closing call to action for each track — as a translation key. */
export const FINAL_CTA_KEY = {
  [TRACKS.PUBLISH]: 'onb_cta_publish',
  [TRACKS.WORKER]: 'onb_cta_worker',
};

export function explainerSlides(track) {
  return SLIDES[track] || SLIDES[TRACKS.PUBLISH];
}