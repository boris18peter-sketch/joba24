/**
 * brandResolver — פענוח טהור של hostname → מזהה מותג (brand slug).
 *
 * ⚠️ PHASE 1 — לא מחובר לשום מקום. שום קובץ לא מייבא את המודול הזה.
 * הוא נוסף כתשתית בלבד (ראה בלופרינט §AD) ואינו משפיע על התנהגות האפליקציה.
 *
 * סדר הפענוח (לפי §R בבלופרינט):
 *   1. מיפוי דומיינים מוכרים
 *   2. תת-דומיין בפורמט <slug>.joba24.com
 *   3. נפילה למותג ברירת המחדל
 *
 * מיפוי הדומיינים מבוסס-הנתונים (BrandDomain) יגיע בשלב 6.
 * עד אז הפונקציה טהורה, דטרמיניסטית וניתנת לבדיקה — ואינה קוראת לרשת.
 */

export const DEFAULT_BRAND_SLUG = 'joba24';

const BASE_DOMAIN = 'joba24.com';

const KNOWN_DOMAINS = {
  'joba24.com': 'joba24',
  'www.joba24.com': 'joba24',
  'joba24.base44.app': 'joba24',
};

/**
 * resolveBrandSlug — מחזיר את מזהה המותג עבור hostname נתון.
 * לעולם לא נכשל: כל קלט לא מזוהה מוחזר כברירת מחדל.
 *
 * @param {string} hostname — לדוגמה: 'events.joba24.com' או 'joba24.com:443'
 * @returns {string} brand slug
 */
export function resolveBrandSlug(hostname) {
  if (!hostname || typeof hostname !== 'string') return DEFAULT_BRAND_SLUG;

  const host = hostname.toLowerCase().split(':')[0].trim();
  if (!host) return DEFAULT_BRAND_SLUG;

  if (KNOWN_DOMAINS[host]) return KNOWN_DOMAINS[host];

  // תת-דומיין: <slug>.joba24.com  (רמה אחת בלבד)
  if (host.endsWith('.' + BASE_DOMAIN)) {
    const sub = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (sub && !sub.includes('.') && sub !== 'www') return sub;
  }

  return DEFAULT_BRAND_SLUG;
}

/**
 * resolveBrandSlugFromLocation — עטיפה נוחה לדפדפן. אינה נקראת באף מקום בשלב 1.
 */
export function resolveBrandSlugFromLocation() {
  if (typeof window === 'undefined') return DEFAULT_BRAND_SLUG;
  return resolveBrandSlug(window.location?.hostname);
}