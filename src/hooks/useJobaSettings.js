import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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
  pre_launch_gate_active: true,
};

/**
 * useJobaSettings — single hook for reading the admin-configured Joba settings.
 * Returns settings merged over defaults, so every field is always defined.
 * Used across banners/popups so UI text stays in sync with the dashboard values.
 */
export function useJobaSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: async () => {
      const list = await base44.entities.JobaSettings.list('-updated_date', 1);
      return list[0] || null;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const settings = { ...DEFAULT_JOBA_SETTINGS, ...(data || {}) };
  return { settings, isLoading };
}