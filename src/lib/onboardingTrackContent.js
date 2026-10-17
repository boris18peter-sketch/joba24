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
 * `visual` names the illustration: the app's OWN components, laid out statically
 * at their real logical width, so each screen shows exactly the interface the
 * visitor is about to meet and follows Light/Dark automatically.
 */
const SLIDES = {
  [TRACKS.PUBLISH]: [
    {
      title: 'צריכים עזרה? פשוט מפרסמים!',
      body: 'תארו מה צריך לעשות, איפה ומתי. הפרסום בחינם.',
      visual: 'task-draft',
    },
    {
      title: 'נמאס לכם ממחירים מוגזמים?',
      body: 'אתם קובעים את המחיר. העובדים רואים אותו, ומי שהמחיר מתאים לו מגיש מועמדות.',
      visual: 'price',
    },
    {
      title: 'פרסמו עכשיו, קבלו מועמדויות תוך דקות!',
      body: 'אנשים שמעוניינים לבצע את המשימה יכולים להגיש בקשה. אתם בוחרים מי יגיע.',
      visual: 'applicants',
    },
  ],
  [TRACKS.WORKER]: [
    {
      title: 'יש לכם כישורים? תהפכו אותם להכנסה!',
      body: 'בחרו מה אתם יודעים לעשות ובאילו אזורים תרצו לעבוד.',
      visual: 'worker-profile',
    },
    {
      title: 'המשימות מגיעות גם אליכם!',
      body: 'קבלו התראות על משימות מתאימות או מצאו אותן בעצמכם בפיד.',
      visual: 'feed',
    },
    {
      title: 'מצאתם משימה? הגישו בקשה!',
      body: 'המפרסם בוחר מי יבצע. נבחרתם? צאו לבצע והרוויחו.',
      visual: 'task-detail',
    },
  ],
};

/** The closing call to action for each track. */
export const FINAL_CTA = {
  [TRACKS.PUBLISH]: 'פרסם משימה בחינם',
  [TRACKS.WORKER]: 'בוא נתחיל להרוויח',
};

export function explainerSlides(track) {
  return SLIDES[track] || SLIDES[TRACKS.PUBLISH];
}