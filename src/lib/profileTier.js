import { isUserVerified, hasSocialVerified } from '@/lib/utils';

/**
 * profileTier — the visual rank a profile carries, derived from verification.
 *
 *   'gold'    identity verified (KYC) AND a social network verified
 *   'green'   identity verified (KYC) only
 *   'default' not verified
 *
 * The profile surface is tinted by this rank, so a verified profile reads as a
 * higher standing at a glance — the same hierarchy the badges already express,
 * carried into the surface itself.
 */
export function getProfileTier(user) {
  if (!isUserVerified(user)) return 'default';
  return hasSocialVerified(user) ? 'gold' : 'green';
}

/**
 * The profile surface per rank.
 *
 * Both colours come STRAIGHT from the badge the rank is shown with — the green
 * from VerifiedBadge, the amber from GoldBadge — so the profile background and
 * the tick beside the name are literally the same two colours. Before this the
 * green surface was a much darker teal (#064e3b) than the badge it was supposed
 * to echo, which is exactly the mismatch that read as "the profile is a
 * different colour from the verification".
 *
 * `bar` is the gradient's FIRST colour: the sticky header sits directly above
 * the hero, so starting both on the same colour is what makes the header look
 * like the top of the profile rather than a separate blue bar bolted onto it.
 * It is also the darker of the two stops, which is what keeps the white header
 * title and back button legible.
 */
export const PROFILE_TIER_SURFACES = {
  gold:  { bar: '#d97706', gradient: 'linear-gradient(160deg, #d97706 0%, #f59e0b 55%, #fbbf24 100%)' },
  green: { bar: '#059669', gradient: 'linear-gradient(160deg, #059669 0%, #10b981 55%, #16a34a 100%)' },
};

/**
 * The hero background for a user — the rank gradient when verified, otherwise
 * the caller's own fallback (the Brand-aware default blue).
 */
export function profileHeroBackground(user, fallback) {
  const tier = getProfileTier(user);
  return PROFILE_TIER_SURFACES[tier]?.gradient || fallback;
}

/**
 * The sticky header background for a user — the same rank colour the hero
 * starts on, so the two always match, whatever the rank is. Falls back to the
 * caller's own bar colour for an unverified profile.
 */
export function profileBarBackground(user, fallback) {
  const tier = getProfileTier(user);
  return PROFILE_TIER_SURFACES[tier]?.bar || fallback;
}