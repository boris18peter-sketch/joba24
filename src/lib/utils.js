import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/**
 * isUserVerified — Single source of truth for whether a user is verified (KYC).
 *
 * IMPORTANT: `is_verified` is a PLATFORM-LEVEL field (email verification), NOT
 * app-level KYC verification. Base44 automatically sets `is_verified = true`
 * when a user verifies their email (via OTP or OAuth provider like Google/Apple).
 * It must NOT be used to determine KYC verification — only `kyc_status === 'approved'`
 * means the user passed identity verification.
 */
export function isUserVerified(user) {
  if (!user) return false;
  return user.kyc_status === 'approved';
}

/**
 * hasSocialVerified — true when the user has at least one verified social network.
 * Used to decide whether to show the GoldBadge instead of the green VerifiedBadge.
 */
export function hasSocialVerified(user) {
  if (!user) return false;
  return !!(user.instagram_verified || user.facebook_verified || user.tiktok_verified);
}