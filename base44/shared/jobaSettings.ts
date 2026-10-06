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
  pre_launch_gate_active: true,
  pre_launch_release_mode: 'all',
  pre_launch_release_at: '',
  facebook_auto_post_enabled: false,
};

/**
 * Fetch the active JobaSettings record, merged over defaults.
 * Falls back to DEFAULT_SETTINGS if no record exists or on error,
 * so functions never break even before the admin creates a record.
 */
export async function getJobaSettings(base44) {
  try {
    const records = await base44.asServiceRole.entities.JobaSettings.list('-updated_date', 1);
    if (records && records.length > 0) {
      const rec = records[0];
      return {
        ...DEFAULT_SETTINGS,
        signup_bonus: num(rec.signup_bonus, DEFAULT_SETTINGS.signup_bonus),
        referral_signup_bonus: num(rec.referral_signup_bonus, DEFAULT_SETTINGS.referral_signup_bonus),
        profile_completion_bonus: num(rec.profile_completion_bonus, DEFAULT_SETTINGS.profile_completion_bonus),
        application_fee_percent: num(rec.application_fee_percent, DEFAULT_SETTINGS.application_fee_percent),
        application_fee_min: num(rec.application_fee_min, DEFAULT_SETTINGS.application_fee_min),
        story_cost: num(rec.story_cost, DEFAULT_SETTINGS.story_cost),
        boost_cost: num(rec.boost_cost, DEFAULT_SETTINGS.boost_cost),
        loyalty_reward_percent: num(rec.loyalty_reward_percent, DEFAULT_SETTINGS.loyalty_reward_percent),
        loyalty_reward_min: num(rec.loyalty_reward_min, DEFAULT_SETTINGS.loyalty_reward_min),
        upcoming_visibility_hours: num(rec.upcoming_visibility_hours, DEFAULT_SETTINGS.upcoming_visibility_hours),
        execution_activation_hours: num(rec.execution_activation_hours, DEFAULT_SETTINGS.execution_activation_hours),
        starting_soon_reminder_hours: num(rec.starting_soon_reminder_hours, DEFAULT_SETTINGS.starting_soon_reminder_hours),
        pre_launch_gate_active: rec.pre_launch_gate_active !== false,
        pre_launch_release_mode: rec.pre_launch_release_mode === 'new_only' ? 'new_only' : 'all',
        pre_launch_release_at: rec.pre_launch_release_at || '',
        facebook_page_id: rec.facebook_page_id || null,
        facebook_page_name: rec.facebook_page_name || null,
        facebook_auto_post_enabled: rec.facebook_auto_post_enabled === true,
      };
    }
  } catch (e) {
    console.error('getJobaSettings error:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}