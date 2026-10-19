// ── JobaSettings shared helper ──────────────────────────────────────────
// Single source of truth for configurable credit costs & bonuses.
// Backend functions import this instead of hardcoding constants, so the
// admin "הגדרות ג'ובות" tab can change values live with no code deploy.

export const DEFAULT_SETTINGS = {
  signup_bonus: 60,
  referral_signup_bonus: 40,
  profile_completion_bonus: 0,
  application_fee_percent: 5,
  application_fee_min: 1,
  // Never charge more than this for an application, however expensive the task.
  // A ₪5,000 job at 5% would otherwise cost 250 Jobas; the cap is what keeps a
  // big job postable. 0 = no cap. A category may override it (GlobalCategory.fee).
  application_fee_max: 100,
  story_cost: 10,
  boost_cost: 5,
  loyalty_reward_percent: 10,
  loyalty_reward_min: 1,
  // ── Scheduling windows (hours) ──
  // The single source of truth for calendar → upcoming → active. These defaults
  // are a FALLBACK only: the live values are the admin's, read below.
  upcoming_visibility_hours: 48,
  execution_activation_hours: 3,
  starting_soon_reminder_hours: 2,
  // The assumed length of an occurrence with no explicit end, used to detect
  // overlaps between jobs. A warning signal only — it never blocks anything.
  default_occurrence_minutes: 60,
  pre_launch_gate_active: true,
  pre_launch_release_mode: 'all',
  pre_launch_release_at: '',
  facebook_auto_post_enabled: false,
};

/**
 * Fetch the active JobaSettings record, merged over defaults.
 * Falls back to DEFAULT_SETTINGS if no record exists, so functions never break
 * even before the admin creates a record.
 *
 * The returned object carries `settings_source`:
 *   'record' — the admin's real values (the normal case)
 *   'empty'  — no record exists yet; the defaults are the documented behaviour
 *   'error'  — the read failed; the values are hardcoded fallbacks and a caller
 *              that moves credits must refuse to act on them
 */
export async function getJobaSettings(base44) {
  // TWO ATTEMPTS, AND A FLAG SAYING WHERE THE NUMBERS CAME FROM.
  //
  // A single transient read failure used to fall straight through to
  // DEFAULT_SETTINGS — the hardcoded 60/40 — so the app quietly used values the
  // admin never configured, and nothing anywhere reported a problem. That is how
  // a new account was granted the built-in 60 Jobas while the live setting
  // said 25. Retrying absorbs the blip; `settings_source` lets a money-critical
  // caller tell "the admin's real values" apart from "we could not read them".
  let readFailed = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const records = await base44.asServiceRole.entities.JobaSettings.list('-updated_date', 1);
      if (records && records.length > 0) {
        const rec = records[0];
        return {
          ...DEFAULT_SETTINGS,
          settings_source: 'record',
          signup_bonus: num(rec.signup_bonus, DEFAULT_SETTINGS.signup_bonus),
          referral_signup_bonus: num(rec.referral_signup_bonus, DEFAULT_SETTINGS.referral_signup_bonus),
          profile_completion_bonus: num(rec.profile_completion_bonus, DEFAULT_SETTINGS.profile_completion_bonus),
          application_fee_percent: num(rec.application_fee_percent, DEFAULT_SETTINGS.application_fee_percent),
          application_fee_min: num(rec.application_fee_min, DEFAULT_SETTINGS.application_fee_min),
          application_fee_max: num(rec.application_fee_max, DEFAULT_SETTINGS.application_fee_max),
          story_cost: num(rec.story_cost, DEFAULT_SETTINGS.story_cost),
          boost_cost: num(rec.boost_cost, DEFAULT_SETTINGS.boost_cost),
          loyalty_reward_percent: num(rec.loyalty_reward_percent, DEFAULT_SETTINGS.loyalty_reward_percent),
          loyalty_reward_min: num(rec.loyalty_reward_min, DEFAULT_SETTINGS.loyalty_reward_min),
          upcoming_visibility_hours: num(rec.upcoming_visibility_hours, DEFAULT_SETTINGS.upcoming_visibility_hours),
          execution_activation_hours: num(rec.execution_activation_hours, DEFAULT_SETTINGS.execution_activation_hours),
          starting_soon_reminder_hours: num(rec.starting_soon_reminder_hours, DEFAULT_SETTINGS.starting_soon_reminder_hours),
          default_occurrence_minutes: num(rec.default_occurrence_minutes, DEFAULT_SETTINGS.default_occurrence_minutes),
          pre_launch_gate_active: rec.pre_launch_gate_active !== false,
          pre_launch_release_mode: rec.pre_launch_release_mode === 'new_only' ? 'new_only' : 'all',
          pre_launch_release_at: rec.pre_launch_release_at || '',
          facebook_page_id: rec.facebook_page_id || null,
          facebook_page_name: rec.facebook_page_name || null,
          facebook_auto_post_enabled: rec.facebook_auto_post_enabled === true,
        };
      }
      // No record exists at all — the defaults ARE the documented behaviour here.
      return { ...DEFAULT_SETTINGS, settings_source: 'empty' };
    } catch (e) {
      readFailed = true;
      console.error(`getJobaSettings error (attempt ${attempt + 1}):`, e);
    }
  }
  // The read genuinely failed. Every number below is a hardcoded fallback, NOT
  // the admin's configuration, and callers that move credits must not trust it.
  console.error('getJobaSettings: falling back to defaults after', readFailed ? 'a failed read' : 'no record');
  return { ...DEFAULT_SETTINGS, settings_source: 'error' };
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}