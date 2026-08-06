/**
 * Joba24 — Internationalization system
 * Supports: Hebrew (he), Arabic (ar), English (en), Spanish (es), French (fr), Russian (ru)
 * RTL: he, ar  |  LTR: en, es, fr, ru
 * he and en live in separate files (i18n-he.js, i18n-en.js) to keep this file manageable.
 */

import { he } from '@/lib/i18n-he';
import { en } from '@/lib/i18n-en';
import { ar } from '@/lib/i18n-ar';
import { es } from '@/lib/i18n-es';
import { fr } from '@/lib/i18n-fr';
import { ru } from '@/lib/i18n-ru';
import { fil } from '@/lib/i18n-fil';
import { hi } from '@/lib/i18n-hi';
import { zh } from '@/lib/i18n-zh';

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

export const translations = {
  he,
  en,
  ar: {
    ...ar,
    notif_permission_title: 'تفعيل الإخطارات؟',
    notif_permission_body: 'احصل على تنبيهات فورية عند توافق مهام جديدة، أو رد أحد على دردشتك، أو جهوزية دفعتك.',
    notif_permission_allow: 'نعم، فعّل',
    maybe_later: 'ربما لاحقاً',
    location: 'الموقع',
    notifications: 'الإخطارات',
  },
  es: {
    ...es,
    notif_permission_title: '¿Habilitar notificaciones?',
    notif_permission_body: 'Recibe alertas instantáneas cuando se asigne una tarea, alguien responda tu chat, o tu pago esté listo.',
    notif_permission_allow: 'Sí, Habilitar',
    maybe_later: 'Quizás Después',
    location: 'Ubicación',
    notifications: 'Notificaciones',
  },
  fr: {
    ...fr,
    notif_permission_title: 'Activer les notifications ?',
    notif_permission_body: 'Recevez des alertes instantanées quand une tâche vous correspond, quelqu\'un répond à votre chat, ou votre paiement est prêt.',
    notif_permission_allow: 'Oui, Activer',
    maybe_later: 'Peut-être Plus Tard',
    location: 'Localisation',
    notifications: 'Notifications',
  },
  ru: {
    ...ru,
    notif_permission_title: 'Включить уведомления?',
    notif_permission_body: 'Получайте мгновенные оповещения, когда вам подходит задача, кто-то отвечает в чате или платеж готов.',
    notif_permission_allow: 'Да, Включить',
    maybe_later: 'Может быть Позже',
    location: 'Местоположение',
    notifications: 'Уведомления',
  },
  fil: { ...fil },
  hi: { ...hi },
  zh: { ...zh },
};

/** Detect language from IP (uses free ipapi.co), fallback to browser/localStorage */
export async function detectLanguage() {
  const saved = localStorage.getItem('joba24_lang');
  if (saved && translations[saved]) return saved;

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
    if (lang && translations[lang]) return lang;
  } catch (_) {}

  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && translations[browserLang]) return browserLang;

  return 'he';
}