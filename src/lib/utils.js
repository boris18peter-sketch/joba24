import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/**
 * isUserVerified — Single source of truth for whether a user is verified.
 *
 * The platform does not allow `is_verified` to be set back to `false` once it
 * is `true` (it silently ignores the update). Therefore `kyc_status` is the
 * authoritative field: only 'approved' means verified. `is_verified` is used
 * only as a legacy fallback for users who were verified before kyc_status existed.
 */
export function isUserVerified(user) {
  if (!user) return false;
  if (user.kyc_status === 'approved') return true;
  if (user.kyc_status === 'rejected' || user.kyc_status === 'pending') return false;
  return !!user.is_verified;
}