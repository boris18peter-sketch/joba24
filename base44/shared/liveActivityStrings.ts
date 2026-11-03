/**
 * liveActivityStrings — the exact Hebrew copy a Live Activity may display.
 *
 * ── WHY A BACKEND COPY EXISTS AT ALL ───────────────────────────────────────
 * The app's translator lives in `src/`, which backend functions can never
 * import. Rather than invent new wording (which would break the promise that
 * the Lock Screen says exactly what the app says), this module carries the
 * VALUES of the very same keys, read out of the shipped dictionaries:
 *
 *   src/lib/i18n-he.js       → applications, click_to_view_approve,
 *                              scanning_texts, task_exposed
 *   src/lib/i18n-ui-he.json  → every atb_* string
 *
 * `test/liveActivity/strings.test.js` compares every value below against the
 * app's real merged `translations.he`. If someone rewrites a Hebrew string in
 * the app, that test fails and names the key, so the two copies cannot drift.
 *
 * Nothing here is new copy and nothing is translated by a machine.
 */

export const STRING_SOURCE_FILES = ['src/lib/i18n-he.js', 'src/lib/i18n-ui-he.json'];

/** Every key the snapshot contract reads. A missing key fails the parity test. */
export const REQUIRED_KEYS = [
  'applications',
  'click_to_view_approve',
  'scanning_texts',
  'task_exposed',
  'atb_planned_worker',
  'atb_planned_owner',
  'atb_planned_worker_sub',
  'atb_planned_owner_sub',
  'atb_set_out',
  'atb_on_way',
  'atb_working',
  'atb_done_wait',
  'atb_await_worker',
  'atb_worker_coming',
  'atb_worker_here',
  'atb_worker_done',
  'atb_sub_btn_start',
  'atb_sub_btn_arrive',
  'atb_sub_btn_finish',
  'atb_sub_update_status',
  'atb_sub_keep_going',
  'atb_sub_work_in_progress',
  'atb_sub_publisher_approves',
  'atb_sub_tap_approve',
  'atb_sub_worker_updates',
  'atb_sub_youll_know',
  // The publisher's approval button — ActiveTaskBanner's own label.
  'confirm_done_work',
];

export const HE = {
  applications: 'מועמדויות',
  click_to_view_approve: 'לחץ לצפייה ואישור',
  scanning_texts: ['מאותת לעובדים', 'סורק עובדים', 'מחפש התאמות', 'מגביר חשיפה', 'מפיץ את המשימה', 'מרחיב חשיפה'],
  task_exposed: 'המשימה נחשפת לעובדים באזור',

  atb_planned_worker: 'מועד מתוכנן',
  atb_planned_owner: 'המשימה מתוכננת',
  atb_planned_worker_sub: 'הביצוע ייפתח סמוך ל-{when}',
  atb_planned_owner_sub: 'העובד יגיע ב-{when}',

  atb_set_out: 'יצאת לדרך',
  atb_on_way: 'אתה בדרך למשימה',
  atb_working: 'בעבודה',
  atb_done_wait: 'סיימת — ממתין לאישור',

  atb_await_worker: 'ממתין לעדכון העובד',
  atb_worker_coming: 'העובד בדרך אליך',
  atb_worker_here: 'העובד הגיע ומבצע',
  atb_worker_done: 'העובד סיים — אשר/י סיום',

  atb_sub_btn_start: 'לחץ/י "{btn}" כדי להתחיל',
  atb_sub_btn_arrive: 'לחץ/י "{btn}" כשתגיע',
  atb_sub_btn_finish: 'לחץ/י "{btn}" בסיום',
  atb_sub_update_status: 'עדכן/י את הסטטוס שלך',
  atb_sub_keep_going: 'המשך/י בדרך',
  atb_sub_work_in_progress: 'העבודה בעיצומה',
  atb_sub_publisher_approves: 'המפרסם יאשר את הסיום',
  atb_sub_tap_approve: 'לחץ/י על אישור הסיום',
  atb_sub_worker_updates: 'העובד יעדכן את הסטטוס בקרוב',
  atb_sub_youll_know: 'תקבל/י עדכון כשיגיע',

  // The publisher's completion button, verbatim from i18n-he.js.
  confirm_done_work: 'אשר סיום עבודה',
};

/**
 * The app's `t()` contract, restricted to the keys above: same lookup, same
 * `{placeholder}` interpolation, same behaviour when a key is absent (return the
 * key, or a string fallback). Arrays are returned as arrays, exactly as the
 * component receives them.
 */
export function t(key, paramsOrFallback?) {
  const val = HE[key];
  if (val === undefined) {
    return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
  }
  if (paramsOrFallback && typeof paramsOrFallback === 'object') {
    if (Array.isArray(val)) return val;
    return String(val).replace(/\{(\w+)\}/g, (_, k) => (
      paramsOrFallback[k] != null ? String(paramsOrFallback[k]) : `{${k}}`
    ));
  }
  return val;
}