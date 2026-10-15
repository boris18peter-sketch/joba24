/**
 * Joba24 advertising-consent state — the single source of truth for the
 * visitor's choice about advertising and analytics measurement.
 *
 * index.html reads this same key synchronously before the Google tag is
 * configured, so a returning visitor's choice is applied before any hit leaves
 * the page. This module is what the banner writes and what the rest of the app
 * reads; the two must always agree on CONSENT_STORAGE_KEY.
 *
 * Scope: Google Consent Mode v2 signals only. Nothing here enables Enhanced
 * Conversions, and no personal data is collected, stored or transmitted —
 * the choice is a single word.
 */

export const CONSENT_STORAGE_KEY = 'joba24_ads_consent';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';

/** The stored choice, or null when the visitor has not decided yet. */
export function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : null;
  } catch {
    // Storage unavailable (private mode / hardened browser): treat as undecided
    // so the banner still offers a choice for this page view.
    return null;
  }
}

/** True once the visitor has made an explicit choice on this device. */
export function hasConsentChoice() {
  return readConsent() !== null;
}

/**
 * Record the visitor's choice and push it to Google Consent Mode v2.
 *
 * Safe to call when no tag is present (ad blocker, native shell without the
 * web tag): the choice is still stored and applied on the next load.
 *
 * @param {'granted'|'denied'} choice
 * @returns {'granted'|'denied'} the value actually applied
 */
export function applyConsent(choice) {
  const value = choice === CONSENT_GRANTED ? CONSENT_GRANTED : CONSENT_DENIED;

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage unavailable — the choice still applies to this page view.
  }

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }

  return value;
}