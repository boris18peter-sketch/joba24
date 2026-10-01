/**
 * brandResolver — פענוח טהור של hostname → מפתח חיפוש של מותג (brand slug).
 *
 * ⚠️ המודול אינו מחובר לשום מקום. שום קובץ לא מייבא אותו.
 * הוא תשתית בלבד ואינו משפיע על התנהגות האפליקציה.
 *
 * ── חוזה (ADR-23) ─────────────────────────────────────────────────────
 * הזהות המקשרת הקנונית של מותג היא **Brand.id**
 * (המזהה מוגדר פעם אחת בכל runtime — ראו src/lib/jobaBrand.js).
 *
 * ה-slug (לדוגמה: "joba24") הוא **מפתח חיפוש / ניתוב בלבד**. הוא
 * אינו זהות המותג, ואינו נשמר בשדה בשם:
 *   brand_id · origin_brand_id · surface_brand_id
 *
 * שרשרת הפענוח המלאה (תמומש רק בחבילת Brand Runtime עתידית ומאושרת):
 *
 *   hostname
 *     → slug / domain lookup key        ← הצעד שהמודול הזה אחראי לו
 *     → Brand record (חיפוש לפי slug)
 *     → Brand.id                        ← הזהות הקנונית
 *     → BrandContext
 *
 * המודול הזה אחראי על הצעד הראשון בלבד. הוא **מודול טהור**:
 * אין בו קריאת רשת, אין בו גישה למסד נתונים ואין בו תלות ב-Base44.
 * המרת ה-slug ל-Brand.id תתבצע בשכבת Brand Runtime — לא כאן.
 *
 * סדר הפענוח:
 *   1. מיפוי דומיינים מוכרים
 *   2. תת-דומיין בפורמט <slug>.joba24.com
 *   3. נפילה ל-slug ברירת המחדל
 */

export const DEFAULT_BRAND_SLUG = 'joba24';

const BASE_DOMAIN = 'joba24.com';

const KNOWN_DOMAINS = {
  'joba24.com': 'joba24',
  'www.joba24.com': 'joba24',
  'joba24.base44.app': 'joba24',
};

/**
 * resolveBrandSlug — מחזיר את מפתח החיפוש (slug) של המותג עבור hostname נתון.
 * לעולם לא נכשל: כל קלט לא מזוהה מוחזר כברירת מחדל.
 *
 * ⚠️ הערך המוחזר הוא מפתח חיפוש בלבד — אינו Brand.id ואינו זהות מותג (ADR-23).
 *
 * @param {string} hostname — לדוגמה: 'events.joba24.com' או 'joba24.com:443'
 * @returns {string} brand slug (מפתח חיפוש בלבד)
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
 * resolveBrandSlugFromLocation — עטיפה נוחה לדפדפן. אינה נקראת באף מקום.
 * מחזירה מפתח חיפוש בלבד — לא Brand.id (ADR-23).
 */
export function resolveBrandSlugFromLocation() {
  if (typeof window === 'undefined') return DEFAULT_BRAND_SLUG;
  return resolveBrandSlug(window.location?.hostname);
}