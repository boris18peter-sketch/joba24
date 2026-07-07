/**
 * verificationLevel.js — Joba24 User Verification System
 *
 * Levels:
 *   'gold'   — KYC verified (is_verified + id_number)
 *   'green'  — Profile complete (bio + categories + media + ≥1 verified social network)
 *   null     — Not verified
 *
 * Green badge criteria (as specified by product):
 *   1. Bio (non-empty)
 *   2. Preferred categories (≥1)
 *   3. Media (≥1 photo/video OR intro_video_url)
 *   4. At least one verified social network (instagram/facebook/tiktok)
 *
 * Gold badge = KYC completed (overrides green — gold is the highest level).
 */

export function getVerificationLevel(user) {
  if (!user) return null;

  // Gold: KYC verified
  if (user.is_verified && user.id_number) return 'gold';

  // Green: profile complete
  const hasBio = !!(user.bio && user.bio.trim().length > 0);
  const hasCategories = !!(user.preferred_categories && user.preferred_categories.length > 0);
  const hasMedia = !!(
    (user.profile_media && user.profile_media.length > 0) ||
    user.intro_video_url
  );
  const hasSocial = !!(
    user.instagram_verified ||
    user.facebook_verified ||
    user.tiktok_verified
  );

  if (hasBio && hasCategories && hasMedia && hasSocial) return 'green';

  return null;
}

export function getVerificationLabel(level) {
  if (level === 'gold') return 'מאומר (KYC)';
  if (level === 'green') return 'פרופיל מלא';
  return 'לא מאומת';
}

/**
 * Returns profile completion steps with their status.
 * Steps 1-4 = green badge, step 5 = gold badge (KYC).
 */
export function getProfileCompletionSteps(user) {
  if (!user) return [];

  return [
    {
      key: 'bio',
      label: 'ביו / אודות',
      done: !!(user.bio && user.bio.trim().length > 0),
      icon: '📝',
      link: '/worker-profile',
    },
    {
      key: 'categories',
      label: 'קטגוריות / תחומים',
      done: !!(user.preferred_categories && user.preferred_categories.length > 0),
      icon: '🏷️',
      link: '/worker-profile',
    },
    {
      key: 'media',
      label: 'מדיה (תמונות / סרטונים)',
      done: !!((user.profile_media && user.profile_media.length > 0) || user.intro_video_url),
      icon: '📸',
      link: '/worker-profile',
    },
    {
      key: 'social',
      label: 'רשת חברתית מאומתת',
      done: !!(user.instagram_verified || user.facebook_verified || user.tiktok_verified),
      icon: '🔗',
      link: '/worker-profile',
    },
    {
      key: 'kyc',
      label: 'אימות זהות (KYC)',
      done: !!(user.is_verified && user.id_number),
      icon: '🪪',
      link: 'kyc',
    },
  ];
}

export function getProfileCompletionPercent(user) {
  const steps = getProfileCompletionSteps(user);
  if (steps.length === 0) return 0;
  const completed = steps.filter(s => s.done).length;
  return Math.round((completed / steps.length) * 100);
}