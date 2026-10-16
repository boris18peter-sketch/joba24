import { ClipboardList, Coins, MapPin, Send, Star, Users } from 'lucide-react';
import { TRACKS } from '@/lib/onboardingTrack';

/**
 * Real Joba24 screens, captured on a device. Each explainer step shows the
 * actual screen the visitor will meet — never a drawing of one.
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
      title: 'ספרו מה צריך לעשות',
      body: 'מתארים את העבודה במילים שלכם — אפשר גם בהקלטה. הכותרת והקטגוריה נוצרות אוטומטית.',
      visual: 'screenshot',
      shot: SHOTS.description,
    },
    {
      icon: Coins,
      badge: 'מחיר ומיקום',
      title: 'קובעים מחיר ומקום',
      body: 'מציעים תשלום הוגן ומציינים את הכתובת המדויקת. בעלי מקצוע באזור רואים את המשימה מיד.',
      visual: 'screenshot',
      shot: SHOTS.price,
      insetShot: SHOTS.location,
    },
    {
      icon: Users,
      badge: 'התאמה',
      title: 'בוחרים מי יבצע',
      body: 'רואים כל בקשה עם דירוג, מספר משימות ואימות זהות — ומאשרים את מי שמתאים לכם.',
      visual: 'screenshot',
      shot: SHOTS.applicants,
    },
  ],
  [TRACKS.WORKER]: [
    {
      icon: MapPin,
      badge: 'חיפוש',
      title: 'משימות קרוב אליכם',
      body: 'כל המשימות באזור שלכם על המפה, עם המחיר על כל סיכה — בלי לחפש בכל מקום.',
      visual: 'screenshot',
      shot: SHOTS.map,
    },
    {
      icon: Send,
      badge: 'הגשה',
      title: 'מגישים בקשה בקליק',
      body: "שולחים הודעה קצרה למי שפרסם. הגשה צורכת ג'ובות — ואם לא נבחרתם, הן מוחזרות אליכם.",
      visual: 'task-card',
    },
    {
      icon: Star,
      badge: 'מוניטין',
      title: 'בונים דירוג וביטחון',
      body: 'ככל שתשלימו יותר משימות ותקבלו דירוג גבוה, כך ייפתחו לכם הזדמנויות טובות יותר.',
      visual: 'profile',
    },
  ],
};

export function explainerSlides(track) {
  return SLIDES[track] || SLIDES[TRACKS.PUBLISH];
}