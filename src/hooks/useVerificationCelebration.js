import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useVerificationCelebration — detects when the current user becomes verified
 * (green or gold) and triggers the VerificationApprovedPopup ONCE per user.
 *
 * The "shown" guard is persisted BOTH client-side (localStorage — fast, prevents
 * double-fire within a session) AND server-side on the User entity
 * (`verified_celebration_shown` — survives logout, storage wipes and device
 * switches). The server flag is the source of truth: once true, the popup
 * never repeats, even after the user logs out and back in.
 *
 * Trigger: show once, in the first session after `kyc_status === 'approved'`.
 *
 * Returns: { celebration: 'green' | 'gold' | null, clearCelebration }
 */
export function useVerificationCelebration(user) {
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    // Only celebrate an explicit staff approval (kyc_status === 'approved').
    const isApproved = user.kyc_status === 'approved';
    if (!isApproved) return;

    // Server-side flag — source of truth, survives logout/storage clears.
    if (user.verified_celebration_shown) return;

    // Client-side guard — prevents double-fire within the same session before
    // the server update propagates back to the user object.
    const flagKey = `joba24_verified_celebration_${user.id}`;
    if (localStorage.getItem(flagKey)) return;

    // Determine gold vs green
    const hasSocial = !!(user.instagram_verified || user.facebook_verified || user.tiktok_verified);
    const variant = hasSocial ? 'gold' : 'green';

    setCelebration(variant);
    // Persist immediately (both stores) so a rapid second effect run can't re-fire.
    localStorage.setItem(flagKey, '1');
    base44.auth.updateMe({ verified_celebration_shown: true }).catch(() => {});
  }, [
    user?.id,
    user?.kyc_status,
    user?.verified_celebration_shown,
    user?.instagram_verified,
    user?.facebook_verified,
    user?.tiktok_verified,
  ]);

  const clearCelebration = () => setCelebration(null);
  return { celebration, clearCelebration };
}