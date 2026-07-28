import GoldBadge from '@/components/GoldBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';

/**
 * UserVerificationBadge — unified badge that renders GoldBadge or VerifiedBadge
 * based on the user's verification status and social connection.
 * Use this everywhere a verification badge appears next to a user name.
 *
 * Props:
 *   user — user object (must contain kyc_status/is_verified + social fields)
 *   size — 'sm' | 'md' (default 'sm')
 */
export default function UserVerificationBadge({ user, size = 'sm' }) {
  if (!isUserVerified(user)) return null;
  if (hasSocialVerified(user)) return <GoldBadge size={size} />;
  return <VerifiedBadge size={size} />;
}