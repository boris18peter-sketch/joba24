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