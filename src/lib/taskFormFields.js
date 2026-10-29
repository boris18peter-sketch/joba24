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

const FIELD = Object.fromEntries(TASK_FORM_FIELDS.map(f => [f.key, f]));

/**
 * The blocks the form renders as SEPARATE sections, in their default order —
 * which is the order the form has always had, so a task form nobody reordered
 * looks exactly as it did before.
 *
 * Only a block that is its own section can be moved. A question that lives
 * INSIDE another one — the building/floor details inside the address, the
 * auto-bump inside the price — is listed as that section's `child`: it moves
 * with its parent and stays switchable in the dashboard, but it is not a
 * section of its own.
 *
 * `schedule` is the one section with no switch of its own: it is the card that
 * holds the three timing questions, and it disappears when all three are off.
 */
const SECTIONS = [
  { key: 'category_form' },
  // The photos belong to the description, not to a screen of their own: a
  // publisher describing a job is also showing it. One step, one card — and one
  // less screen between "I said what I need" and "published".
  { key: 'description', children: ['media'] },
  {
    key: 'schedule',
    label: 'מועד',
    desc: 'התוקף, הדחיפות והתאריך המדויק — כל אחד מהם נשלט בנפרד בתוך הסעיף.',
    containerOnly: true,
    children: ['expiry', 'urgency', 'exact_datetime'],
  },
  { key: 'story' },
  { key: 'location_name', children: ['address_details'] },
  { key: 'requirements' },
  { key: 'verification' },
  { key: 'price', children: ['auto_bump'] },
  { key: 'payment_method' },
  { key: 'contactPhone' },
];

export const TASK_FORM_SECTIONS = SECTIONS.map(s => ({
  ...s,
  label: s.label || FIELD[s.key]?.label || s.key,
  desc: s.desc || FIELD[s.key]?.desc || '',
  core: !!FIELD[s.key]?.core,
  children: (s.children || []).map(k => FIELD[k]).filter(Boolean),
}));

export const TASK_FORM_SECTION_KEYS = TASK_FORM_SECTIONS.map(s => s.key);

/**
 * The order the form's sections render in.
 *
 * The admin's saved order wins. A section that was added to the form AFTER the
 * order was saved still has to appear — so it is appended in its default place
 * rather than silently dropped from the form.
 */
export function taskFormSectionOrder(settings) {
  const stored = settings?.task_form_order;
  if (!Array.isArray(stored) || stored.length === 0) return TASK_FORM_SECTION_KEYS;
  const known = stored.filter(k => TASK_FORM_SECTION_KEYS.includes(k));
  const missing = TASK_FORM_SECTION_KEYS.filter(k => !known.includes(k));
  return [...known, ...missing];
}

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