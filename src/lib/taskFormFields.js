/**
 * taskFormFields.js — the admin's control panel over the task form.
 *
 * Every question the publish form asks is listed here ONCE, so the dashboard
 * tab and the form itself can never disagree about what a "task form field" is.
 * The admin turns a field off and the form stops rendering it, stops validating
 * it, and stops counting it towards the "ready to publish" indicators — which is
 * the whole point: a field the admin removed must never be the reason someone
 * cannot publish.
 *
 * `core: true` marks a field the task itself is built from. Those are still
 * toggleable (the admin may want the simplest possible form for a launch), but
 * they are the ones whose validation must follow the switch.
 */

export const TASK_FORM_FIELDS = [
  // ── Core ────────────────────────────────────────────────────────────────
  {
    key: 'description',
    core: true,
    label: 'תיאור המשימה',
    desc: 'השדה המרכזי — ממנו נגזרים הכותרת והקטגוריה של המשימה.',
  },
  {
    key: 'category_form',
    core: true,
    label: 'שאלון הקטגוריה',
    desc: 'השאלות הנוספות של השירות הנבחר (למשל "מה הבעיה?" באינסטלציה).',
  },
  {
    key: 'price',
    core: true,
    label: 'מחיר',
    desc: 'המחיר שהמפרסם מציע, כולל הצעת המחיר החכמה והעלאה אוטומטית.',
  },
  {
    key: 'location_name',
    core: true,
    label: 'כתובת / מיקום',
    desc: 'הכתובת שבה מתבצעת העבודה.',
  },
  {
    key: 'payment_method',
    core: true,
    label: 'אמצעי תשלום',
    desc: 'איך ישולם לעובד — מזומן, ביט, PayBox ועוד.',
  },
  {
    key: 'contactPhone',
    core: true,
    label: 'טלפון ליצירת קשר',
    desc: 'מספר הטלפון שנחשף לעובד המאושר בלבד.',
  },

  // ── תוכן ────────────────────────────────────────────────────────────────
  {
    key: 'media',
    label: 'תמונות וסרטון',
    desc: 'העלאת תמונות וסרטון למשימה.',
  },

  // ── מועד ────────────────────────────────────────────────────────────────
  {
    key: 'expiry',
    label: 'תוקף המשימה',
    desc: 'אחרי כמה זמן המשימה פגה. כיבוי = המשימה נשארת פתוחה ללא תוקף.',
  },
  {
    key: 'urgency',
    label: 'דחיפות (מתי צריך עובד)',
    desc: 'התגים של "דחוף / שעות הקרובות / ערב / גמיש".',
  },
  {
    key: 'exact_datetime',
    label: 'תאריך ושעה מדויקים',
    desc: 'בחירת מועד מדויק למשימה. כיבוי = נשאר רק חלון התוקף.',
  },

  // ── תוספות ──────────────────────────────────────────────────────────────
  {
    key: 'story',
    label: 'סטורי',
    desc: 'פרסום המשימה כסטורי עם חשיפה מוגברת.',
  },
  {
    key: 'requirements',
    label: 'דרישות מהעובד',
    desc: 'רכב, כלים, ניסיון, חשבונית ועוד.',
  },
  {
    key: 'verification',
    label: 'אימות עובדים',
    desc: 'דרישה שעובדים מאומתים בלבד יוכלו להגיש בקשה.',
  },
  {
    key: 'auto_bump',
    label: 'העלאת מחיר אוטומטית',
    desc: 'המחיר עולה בהדרגה עד תקרה שנקבעת מראש.',
  },
  {
    key: 'address_details',
    label: 'פרטי כתובת מורחבים',
    desc: 'בניין, קומה, דירה והערות ניווט.',
  },
];

export const TASK_FORM_FIELD_KEYS = TASK_FORM_FIELDS.map(f => f.key);

/** The sections the dashboard groups the switches into, in order. */
export const TASK_FORM_GROUPS = [
  { key: 'core', label: 'שדות חובה', note: 'כיבוי שדה כאן משנה מה נדרש כדי לפרסם משימה.' },
  { key: 'content', label: 'תוכן' },
  { key: 'schedule', label: 'מועד' },
  { key: 'extras', label: 'תוספות' },
];

const GROUP_OF = {
  description: 'core', category_form: 'core', price: 'core',
  location_name: 'core', payment_method: 'core', contactPhone: 'core',
  media: 'content',
  expiry: 'schedule', urgency: 'schedule', exact_datetime: 'schedule',
  story: 'extras', requirements: 'extras', verification: 'extras',
  auto_bump: 'extras', address_details: 'extras',
};

/** The fields belonging to a group, in the order they are declared above. */
export const taskFormFieldsInGroup = (groupKey) =>
  TASK_FORM_FIELDS.filter(f => GROUP_OF[f.key] === groupKey);

/**
 * Is a field currently ON? A field the admin never touched is ON — so a settings
 * record written before this feature existed, or one missing the map entirely,
 * keeps the full form rather than silently hiding half of it.
 */
export function isTaskFormFieldOn(settings, key) {
  const map = settings?.task_form_fields;
  if (!map || typeof map !== 'object') return true;
  return map[key] !== false;
}

/**
 * The core fields that are currently ON. The single source of truth for
 * "what must be filled in order to publish", shared by the form's readiness
 * indicators and its required-field validation — so removing a field in the
 * dashboard can never leave a rule behind that blocks publishing.
 */
export function enabledCoreFields(settings) {
  return TASK_FORM_FIELDS.filter(f => f.core && isTaskFormFieldOn(settings, f.key)).map(f => f.key);
}

/** Default map for a fresh record — everything ON. */
export const DEFAULT_TASK_FORM_FIELDS = Object.fromEntries(TASK_FORM_FIELD_KEYS.map(k => [k, true]));