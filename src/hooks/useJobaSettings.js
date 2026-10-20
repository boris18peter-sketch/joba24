import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import { useBrand } from '@/lib/brand/BrandProvider';

/**
 * Default values used when no JobaSettings record exists yet.
 * These mirror the backend DEFAULT_SETTINGS (base44/shared/jobaSettings.ts)
 * so the frontend and backend stay in sync before the admin creates a record.
 */
export const DEFAULT_JOBA_SETTINGS = {
  signup_bonus: 60,
  referral_signup_bonus: 40,
  profile_completion_bonus: 0,
  application_fee_percent: 5,
  application_fee_min: 1,
  story_cost: 10,
  boost_cost: 5,
  loyalty_reward_percent: 10,
  loyalty_reward_min: 1,
  // ── Scheduling windows (hours) — fallback only; the live values are the admin's ──
  upcoming_visibility_hours: 48,
  execution_activation_hours: 3,
  starting_soon_reminder_hours: 2,
  pre_launch_gate_active: true,
  pre_launch_release_mode: 'all',
  pre_launch_release_at: '',
  app_store_url: '',
  google_play_url: '',
  store_buttons_enabled: true,
  guest_access_enabled: true,
  // Admin control over the publish form. An empty map means every field is ON,
  // so the full form is the default until the admin turns something off.
  task_form_fields: {},
  // The order the form's sections render in. Empty = the form's own default
  // order, so a settings record written before this existed is unchanged.
  task_form_order: [],
};

/** Pricing keys a Brand is allowed to override (mirrors base44/shared/brandSettings.ts). */
const BRAND_OVERRIDABLE_KEYS = [
  'application_fee_percent', 'application_fee_min', 'story_cost',
  'boost_cost', 'loyalty_reward_percent', 'loyalty_reward_min',
];

// ── ONE live subscription for the whole app ─────────────────────────────────
// The admin's own tab invalidates its own cache, so the admin watched a change
// take effect while every OTHER open app kept the old values. The query is
// cached for a minute and never refetches on focus, and this is a long-lived
// SPA — so a signup bonus, a story price, a scheduling window or the launch gate
// could stay stale for an entire session.
//
// Eighteen components read these settings, so this is deliberately ONE shared
// subscription rather than one per consumer.
let settingsUnsub = null;
function ensureSettingsSync() {
  if (settingsUnsub) return;
  settingsUnsub = base44.entities.JobaSettings.subscribe(() => {
    queryClientInstance.invalidateQueries({ queryKey: ['jobaSettings'] });
  });
}

/**
 * useJobaSettings — single hook for reading the admin-configured Joba settings.
 * Returns settings merged over defaults, so every field is always defined.
 * Used across banners/popups so UI text stays in sync with the dashboard values.
 */
export function useJobaSettings() {
  // An edit in the dashboard reaches every open app the moment it is saved.
  useEffect(() => { ensureSettingsSync(); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: async () => {
      const list = await base44.entities.JobaSettings.list('-updated_date', 1);
      return list[0] || null;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // A Brand may override a small, explicitly listed subset of pricing keys.
  // Applied here so displayed prices match what the server actually charges.
  const { effective } = useBrand();
  const overrides = effective?.marketplace || {};
  const applied = {};
  for (const key of BRAND_OVERRIDABLE_KEYS) {
    const value = Number(overrides[key]);
    if (Number.isFinite(value) && value >= 0) applied[key] = value;
  }

  const settings = { ...DEFAULT_JOBA_SETTINGS, ...(data || {}), ...applied };
  return { settings, isLoading };
}