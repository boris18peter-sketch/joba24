import { ClipboardList, Coins, MapPin, Send, Star, Users } from 'lucide-react';
import { TRACKS } from '@/lib/onboardingTrack';

/**
 * Real Joba24 captures. Most are already focused slices of a single form
 * section; `description` is a whole phone screen, so the slide that uses it
 * shows only the band of the form the step is about — a full screen shrunk to
 * fit a slide is unreadable, and the brief is explicit that a focused view beats
 * it. Nothing is ever stretched, and the crop is vertical only.
 */
const SHOTS = {
  description: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/427e287bb_WhatsAppImage2026-10-16at125311.jpeg',
  price: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/0118f28dc_WhatsAppImage2026-10-16at125310.jpeg',
  location: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/4df36ac24_WhatsAppImage2026-10-16at1253101.jpeg',
  applicants: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/1d3942496_WhatsAppImage2026-10-16at130127.jpeg',
  map: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/6c8dfed26_WhatsAppImage2026-10-16at130736.jpeg',
};

/**
 * The three explainer slides shown after a track is picked.
 *
 * Copy and pictures only — no analytics, no side effects, no writes. These
 * screens describe the EXISTING flow; they never publish a task or complete a
 * worker profile.
 */
const SLIDES = {
  [TRACKS.PUBLISH]: [
    {
      icon: ClipboardList,
      badge: 'המשימה',
      title: 'תאר את המשימה ואת המיקום',
      body: 'ספר מה צריך לעשות, איפה ומתי. הפרסום בחינם!',
      shots: [
        { src: SHOTS.description, ratio: 1.15, focus: 'center 50%' },
        SHOTS.location,
      ],
    },
    {
      icon: Coins,
      badge: 'המחיר',
      title: 'אתה קובע כמה לשלם',
      body: 'ה־AI מציע מחיר לפי המשימה ומחירי השוק. ההחלטה שלך.',
      shots: [SHOTS.price],
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