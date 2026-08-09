import { useEffect, useState } from 'react';

/**
 * useVerificationCelebration — detects when the current user becomes verified
 * (green or gold) and triggers the VerificationApprovedPopup once per user.
 *
 * Reliable in-app fallback: works even if the push notification was missed
 * (no FCM token, app closed, etc.). The user sees the celebration the next
 * time they open the app while verified.
 *
 * Trigger logic: show once per user when `is_verified === true` and the
 * per-user localStorage flag isn't set. Set the flag after showing so it
 * never repeats.
 *
 * Returns: { celebration: 'green' | 'gold' | null, clearCelebration }
 */
export function useVerificationCelebration(user) {
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    // Only celebrate an explicit staff approval (kyc_status === 'approved').
    // `is_verified` alone can be auto-granted without staff review, which used to
    // fire the popup for unverified users. Now the popup only fires once per user,
    // in the first session after the staff actually approves verification.
    const isApproved = user.kyc_status === 'approved';
    if (!isApproved) return;

    const flagKey = `joba24_verified_celebration_${user.id}`;
    if (localStorage.getItem(flagKey)) return; // already celebrated for this user

    // Determine gold vs green
    const hasSocial = !!(user.instagram_verified || user.facebook_verified || user.tiktok_verified);
    const variant = hasSocial ? 'gold' : 'green';

    setCelebration(variant);
    // Persist synchronously so a rapid second effect run doesn't double-fire
    localStorage.setItem(flagKey, '1');
  }, [user?.id, user?.is_verified, user?.instagram_verified, user?.facebook_verified, user?.tiktok_verified]);

  const clearCelebration = () => setCelebration(null);
  return { celebration, clearCelebration };
}