/**
 * Joba24 — Internationalization system
 * Supports: Hebrew (he), Arabic (ar), English (en), Spanish (es), French (fr),
 * Russian (ru), Filipino (fil), Hindi (hi), Chinese (zh)
 * RTL: he, ar  |  LTR: everything else
 *
 * ── HEBREW IS COMPILED IN, THE OTHER EIGHT LOAD ON DEMAND ───────────────────
 * Every dictionary used to be imported here, so all nine were parsed and kept
 * in memory on every launch — roughly 700 KB of source, of which a visitor ever
 * reads one. Hebrew alone is now a static import; the rest are dynamic chunks
 * fetched by loadLanguage() the moment a language is actually needed.
 *
 * Hebrew stays static on purpose. It is the default, it is the fallback every
 * other language falls back to (see t() in LanguageContext), and it is the
 * language of the overwhelming majority of launches — so the default cold start
 * touches no network for translations at all and cannot regress.
 */

import { he } from '@/lib/i18n-he';
import { onboardingI18n } from '@/lib/i18n-onboarding';
// Keys that exist in Hebrew but were never propagated to the other eight
// languages, plus the newer strings (subscription card, review tags, invoices,
// chat, price suggestions). Kept in one data file so a missing-key audit stays
// a single place to look, and merged below exactly like the onboarding copy.
import extraI18n from './i18n-extra.json';

export const LANGUAGES = [
  { code: 'he', label: 'עברית',   flag: '🇮🇱', rtl: true  },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true  },
  { code: 'en', label: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', label: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'fr', label: 'Français',flag: '🇫🇷', rtl: false },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', rtl: false },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭', rtl: false },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'zh', label: '中文', flag: '🇨🇳', rtl: false },
];

export const RTL_LANGS = new Set(['he', 'ar']);

/** Every language code the app ships. */
export const LANG_CODES = new Set(LANGUAGES.map((l) => l.code));

// Per-language copy that belongs to the app shell rather than to a translation
// file (the notification-permission prompt). Declared here so it survives the
// move to on-demand dictionaries.
const OVERRIDES = {
  ar: {
    notif_permission_title: 'تفعيل الإخطارات؟',
    notif_permission_body: 'احصل على تنبيهات فورية عند توافق مهام جديدة، أو رد أحد على دردشتك، أو جهوزية دفعتك.',
    notif_permission_allow: 'نعم، فعّل',
    maybe_later: 'ربما لاحقاً',
    location: 'الموقع',
    notifications: 'الإخطارات',
  },
  es: {
    notif_permission_title: '¿Habilitar notificaciones?',
    notif_permission_body: 'Recibe alertas instantáneas cuando se asigne una tarea, alguien responda tu chat, o tu pago esté listo.',
    notif_permission_allow: 'Sí, Habilitar',
    maybe_later: 'Quizás Después',
    location: 'Ubicación',
    notifications: 'Notificaciones',
  },
  fr: {
    notif_permission_title: 'Activer les notifications ?',
    notif_permission_body: 'Recevez des alertes instantanées quand une tâche vous correspond, quelqu\'un répond à votre chat, ou votre paiement est prêt.',
    notif_permission_allow: 'Oui, Activer',
    maybe_later: 'Peut-être Plus Tard',
    location: 'Localisation',
    notifications: 'Notifications',
  },
  ru: {
    notif_permission_title: 'Включить уведомления?',
    notif_permission_body: 'Получайте мгновенные оповещения, когда вам подходит задача, кто-то отвечает в чате или платеж готов.',
    notif_permission_allow: 'Да, Включить',
    maybe_later: 'Может быть Позже',
    location: 'Местоположение',
    notifications: 'Уведомления',
  },
};

/**
 * The loaded dictionaries. Hebrew is the only one present at boot; every other
 * entry is added by loadLanguage() the first time that language is used.
 *
 * The first-run flow's copy is merged in from its own module (i18n-onboarding),
 * so its screens are translated in every language without nine more edits here.
 */
export const translations = {
  he: { ...he, ...onboardingI18n.he, ...extraI18n.he },
};

/**
 * One explicit loader per language. Written out rather than assembled from the
 * code so the bundler can see each import and emit a real chunk for it.
 */
const LOADERS = {
  en: () => import('@/lib/i18n-en'),
  ar: () => import('@/lib/i18n-ar'),
  es: () => import('@/lib/i18n-es'),
  fr: () => import('@/lib/i18n-fr'),
  ru: () => import('@/lib/i18n-ru'),
  fil: () => import('@/lib/i18n-fil'),
  hi: () => import('@/lib/i18n-hi'),
  zh: () => import('@/lib/i18n-zh'),
};

/** True when this language's dictionary is already in memory. */
export const isLanguageLoaded = (code) => !!translations[code];

/**
 * Load a language's dictionary into `translations`.
 *
 * NEVER REJECTS. The caller waits on this before painting, so a rejection would
 * have to be handled at every call site — and a stalled fetch would leave the
 * app on a loading screen with no way out. Instead it retries once (the common
 * failures are a transient dropped connection, or a stale chunk right after a
 * deploy) and then gives up silently, leaving the Hebrew fallback in place. The
 * app always renders; it simply renders Hebrew if the dictionary could not be
 * fetched.
 *
 * @returns the code that is actually usable — 'he' when the load failed
 */
export async function loadLanguage(code) {
  if (!LOADERS[code]) return code;     // Hebrew, or an unknown code — nothing to fetch
  if (translations[code]) return code; // already in memory

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const mod = await LOADERS[code]();
      const base = mod[code];
      if (!base) break;
      translations[code] = {
        ...base,
        ...onboardingI18n[code],
        ...extraI18n[code],
        ...(OVERRIDES[code] || {}),
      };
      return code;
    } catch (_) {
      /* first failure — fall through and try once more */
    }
  }
  return 'he';
}

/** Detect language from IP (uses free ipapi.co), fallback to browser/localStorage */
export async function detectLanguage() {
  const saved = localStorage.getItem('joba24_lang');
  // Validated against the shipped language list, NOT against `translations`:
  // that object now holds only the dictionaries already loaded, so checking it
  // would make a saved 'en' look like an unsupported language and re-detect the
  // language from scratch on every launch.
  if (saved && LANG_CODES.has(saved)) return saved;

  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const countryLangMap = {
      IL: 'he', PS: 'ar', SA: 'ar', AE: 'ar', JO: 'ar', EG: 'ar', LB: 'ar',
      IQ: 'ar', SY: 'ar', KW: 'ar', QA: 'ar', BH: 'ar', OM: 'ar', YE: 'ar',
      ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
      FR: 'fr', BE: 'fr', CH: 'fr', CA: 'fr',
      RU: 'ru', UA: 'ru', BY: 'ru', KZ: 'ru',
      PH: 'fil', IN: 'hi', CN: 'zh',
    };
    const lang = countryLangMap[data.country_code];
    if (lang && LANG_CODES.has(lang)) return lang;
  } catch (_) {}

  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && LANG_CODES.has(browserLang)) return browserLang;

  return 'he';
}