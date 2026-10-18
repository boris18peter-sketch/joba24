import { isUserVerified, hasSocialVerified } from '@/lib/utils';

/**
 * profileTier — the visual rank a profile carries, derived from verification.
 *
 *   'gold'    identity verified (KYC) AND a social network verified
 *   'green'   identity verified (KYC) only
 *   'default' not verified
 *
 * The profile hero is tinted by this rank, so a verified profile reads as a
 * higher standing at a glance — the same hierarchy the badges already express,
 * carried into the surface itself.
 */
export function getProfileTier(user) {
  if (!isUserVerified(user)) return 'default';
  return hasSocialVerified(user) ? 'gold' : 'green';
}

/**
 * The hero background per rank. Deep, saturated gradients so the white name,
 * badges and stats stay perfectly legible on top of them.
 */
export const PROFILE_HERO_GRADIENTS = {
  gold: 'linear-gradient(160deg, #92400e 0%, #b45309 45%, #d97706 100%)',
  green: 'linear-gradient(160deg, #064e3b 0%, #047857 50%, #059669 100%)',
};

/**
 * The hero background for a user — the rank gradient when verified, otherwise
 * the caller's own fallback (the Brand-aware default blue).
 */
export function profileHeroBackground(user, fallback) {
  const tier = getProfileTier(user);
  return PROFILE_HERO_GRADIENTS[tier] || fallback;
}