import { translations } from '@/lib/i18n';

/**
 * The app's OWN translator, for Hebrew.
 *
 * This is a transcription of `t` in src/lib/LanguageContext.jsx (same lookup,
 * same fallback, same `{placeholder}` interpolation) pinned to the Hebrew
 * dictionary — the language whose strings the Live Activity contract must
 * reproduce. Nothing here is a copy of any UI string: every label is read out of
 * the shipped dictionary, so a wording change in the app fails these tests
 * instead of silently drifting from the Lock Screen.
 */
export const he = translations.he;

export function t(key, paramsOrFallback) {
  const val = he[key];
  if (val === undefined) {
    return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
  }
  if (paramsOrFallback && typeof paramsOrFallback === 'object') {
    return val.replace(/\{(\w+)\}/g, (_, k) => (
      paramsOrFallback[k] != null ? String(paramsOrFallback[k]) : `{${k}}`
    ));
  }
  return val;
}

/** Every key the contract reads. Listed so a missing key fails loudly. */
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
];