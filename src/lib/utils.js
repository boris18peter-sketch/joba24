import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/**
 * isStandaloneApp — true when running as an installed PWA / wrapped app
 * (display-mode: standalone or iOS Safari navigator.standalone).
 * Used to hide "download the app" CTAs that are pointless inside the app itself.
 */
export const isStandaloneApp =
  (typeof window !== 'undefined' && window.matchMedia)
    ? (window.matchMedia('(display-mode: standalone)').matches ||
       window.navigator?.standalone === true)
    : false;

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