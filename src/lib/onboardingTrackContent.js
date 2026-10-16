import { ClipboardList, Coins, MapPin, Send, Star, Users } from 'lucide-react';
import { TRACKS } from '@/lib/onboardingTrack';

/**
 * One real Joba24 capture, kept for the step where a genuine screenshot says
 * more than any redraw: the applicant list, with real candidates and the
 * approve/reject decision the publisher actually makes.
 *
 * It is shown whole (`contain`) inside the shared preview frame — never cropped,
 * never stretched — and the frame is inert, so its buttons cannot be tapped.
 */
const SHOTS = {
  applicants: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/1d3942496_WhatsAppImage2026-10-16at130127.jpeg',
};

/**
 * The three explainer slides shown after a track is picked.
 *
 * Copy and pictures only — no analytics, no side effects, no writes. These
 * screens describe the EXISTING flow; they never publish a task or complete a
 * worker profile.
 *
 * A slide names its illustration with `visual` (the app's own components, laid
 * out statically at their real width, so it matches the interface and follows
 * Light/Dark automatically) or with `shots` (real captures). Both render inside
 * the same preview frame, so every screen keeps one design language.
 */
const SLIDES = {
  [TRACKS.PUBLISH]: [
    {
      icon: ClipboardList,
      badge: 'המשימה',
      title: 'תאר את המשימה ואת המיקום',
      body: 'ספר מה צריך לעשות, איפה ומתי. הפרסום בחינם!',
      visual: 'task-draft',
    },
    {
      icon: Coins,
      badge: 'המחיר',
      title: 'אתה קובע כמה לשלם',
      body: 'ה־AI מציע מחיר לפי המשימה ומחירי השוק. ההחלטה שלך.',
      visual: 'price',
    },
    {
      icon: Users,
      badge: 'בקשות',
      title: 'קבל בקשות ובחר מי יעזור לך',
      body: 'אנשים מתאימים יכולים להגיש בקשה תוך דקות. אתה בוחר מי יבצע את המשימה.',
      shots: [SHOTS.applicants],
    },
  ],
  [TRACKS.WORKER]: [
    {
      icon: MapPin,
      badge: 'הפרופיל',
      title: 'בחר מה אתה יודע לעשות',
      body: 'מלא פרופיל ובחר תחומים ואזורים שמתאימים לך.',
      visual: 'worker-profile',
    },
    {
      icon: Send,
      badge: 'חיפוש',
      title: 'מצא משימות שמתאימות לך',
      body: 'קבל התראות על משימות חדשות או חפש בעצמך בפיד.',
      visual: 'feed',
    },
    {
      icon: Star,
      badge: 'הגשה',
      title: 'הגש בקשה והתחל להרוויח',
      body: 'המפרסם בוחר מי יבצע את המשימה. נבחרת? יוצאים לבצע ומרוויחים!',
      visual: 'task-card',
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