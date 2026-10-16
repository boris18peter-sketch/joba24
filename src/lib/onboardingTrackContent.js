import { ClipboardList, Coins, MapPin, Send, Star, Users } from 'lucide-react';
import { TRACKS } from '@/lib/onboardingTrack';

/**
 * The three explainer slides shown after a track is picked.
 *
 * Copy only — no analytics, no side effects, no writes. These screens describe
 * the EXISTING flow; they never publish a task or complete a worker profile.
 */
const SLIDES = {
  [TRACKS.PUBLISH]: [
    {
      icon: ClipboardList,
      badge: 'המשימה',
      title: 'ספרו מה צריך לעשות',
      body: 'מתארים את העבודה בכמה מילים, מצרפים תמונה אם יש, ומציינים מתי זה צריך להיעשות.',
    },
    {
      icon: Coins,
      badge: 'מחיר',
      title: 'קובעים מחיר ומקום',
      body: 'מציעים תשלום הוגן ומציינים את הכתובת. עובדים באזור שלכם רואים את המשימה מיד.',
    },
    {
      icon: Users,
      badge: 'התאמה',
      title: 'בוחרים מי יבצע',
      body: 'מקבלים בקשות מעובדים מתאימים, רואים דירוג ותגובות, ומאשרים את מי שמתאים לכם.',
    },
  ],
  [TRACKS.WORKER]: [
    {
      icon: MapPin,
      badge: 'חיפוש',
      title: 'משימות קרוב אליכם',
      body: 'כל המשימות באזור שלכם, מסודרות לפי מרחק, מחיר ומועד — בלי לחפש בכל מקום.',
    },
    {
      icon: Send,
      badge: 'הגשה',
      title: 'מגישים בקשה בקליק',
      body: "שולחים הודעה קצרה למי שפרסם. הגשה צורכת ג'ובות — ואם לא נבחרתם, הן מוחזרות אליכם.",
    },
    {
      icon: Star,
      badge: 'מוניטין',
      title: 'בונים דירוג וביטחון',
      body: 'ככל שתשלימו יותר משימות ותקבלו דירוג גבוה, כך ייפתחו לכם הזדמנויות טובות יותר.',
    },
  ],
};

export function explainerSlides(track) {
  return SLIDES[track] || SLIDES[TRACKS.PUBLISH];
}