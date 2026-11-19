import VerifiedCheckMark from '@/components/VerifiedCheckMark';

/**
 * VerifiedBadge — מוצג ליד שם משתמש מאומת.
 *
 * The mark itself now comes from the ONE shared component (VerifiedCheckMark),
 * so the tick beside a name, the tick on the verification banner and the tick
 * inside the verification popup are the same drawing at three sizes.
 *
 * Props:
 *   size: 'sm' | 'md' (default 'sm')
 */
export default function VerifiedBadge({ size = 'sm' }) {
  return <VerifiedCheckMark size={size === 'md' ? 20 : 15} />;
}