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

/**
 * copyToClipboard — robust across native WebViews where the async Clipboard API
 * (navigator.clipboard) is unavailable or blocked. Falls back to a hidden
 * textarea + document.execCommand('copy'), which works in iOS/Android WebViews.
 * Returns true on success.
 */
export async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.contentEditable = 'true';
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * downloadHtmlInvoice — saves an HTML invoice. In native iOS WKWebView the
 * <a download> attribute is ignored, so we prefer the Web Share API with a
 * File (native share sheet → "Save to Files" / AirDrop), falling back to a
 * blob download link (desktop / Android WebView).
 */
export async function downloadHtmlInvoice(filename, html) {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`;
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([fullHtml], filename, { type: 'text/html' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return true;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return true;
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([fullHtml], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {}
  return false;
}