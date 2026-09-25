// Meta App Events bridge — JS → native (iOS/Android) via Capacitor plugin.
// No-op on web (Meta App Events SDK requires native iOS/Android).
import { Capacitor, registerPlugin } from '@capacitor/core';

const MetaAppEventsNative = registerPlugin('MetaAppEvents', {
  web: () => Promise.resolve({
    logEvent: () => {},
    setUserId: () => {},
    requestATT: () => Promise.resolve({ status: 3 }),
  }),
});

// Standard + custom event names for Joba24
export const MetaEvents = {
  CompleteRegistration: 'CompleteRegistration',
  WorkerProfileCompleted: 'WorkerProfileCompleted',
  LocationEnabled: 'LocationEnabled',
  NotificationsEnabled: 'NotificationsEnabled',
  KYCCompleted: 'KYCCompleted',
  Purchase: 'Purchase',
};

/**
 * Log a Meta App Event. No-op on web.
 * @param {string} eventName — standard or custom event name
 * @param {object} params — event parameters
 * @param {number|null} valueToSum — numeric value to sum (e.g. price)
 */
export async function trackMetaEvent(eventName, params = {}, valueToSum = null) {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    await MetaAppEventsNative.logEvent({ name: eventName, params, valueToSum });
  } catch {
    // Silent fail — events are non-critical, app must not break
  }
}

/**
 * Set the user ID for Meta attribution. Call after login, clear on logout.
 */
export async function setMetaUserId(userId) {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    await MetaAppEventsNative.setUserId({ userId: userId || '' });
  } catch {}
}

/**
 * Request ATT (App Tracking Transparency) permission on iOS.
 * No-op on Android. Returns { status: 0-3 }.
 */
export async function requestMetaATT() {
  if (Capacitor.getPlatform() !== 'ios') return { status: 3 };
  try {
    return await MetaAppEventsNative.requestATT();
  } catch {
    return { status: 0 };
  }
}

/**
 * Track an event only once per device (uses localStorage flag).
 * Used for permission-based events (Location, Notifications).
 */
export async function trackMetaEventOnce(eventName, flagKey, params = {}) {
  if (localStorage.getItem(flagKey)) return;
  localStorage.setItem(flagKey, '1');
  await trackMetaEvent(eventName, params);
}

// Dedup guard for real-money events. The same payment can legitimately be
// confirmed more than once — a retried browser callback, a re-delivered
// StoreKit transaction, a webhook arriving alongside the status poll — and Meta
// must see exactly ONE Purchase per transaction. Each transaction id is
// remembered the moment it is reported, so a second confirmation is a no-op.
const PURCHASE_DEDUP_PREFIX = 'meta_purchase_logged_';

/**
 * Report Meta's standard Purchase event for a payment that has ALREADY been
 * confirmed successful by the provider (Apple receipt verification or Tranzila
 * status). Never call this when checkout opens, when the payment starts, is
 * pending, fails or is cancelled.
 *
 * Only the amount, the currency and a non-sensitive content type are sent —
 * no card data, no tokens, no provider payloads.
 *
 * @param {object} o
 * @param {string} o.transactionId — unique payment id, used as the dedup key
 * @param {number} o.value         — the real amount paid
 * @param {string} [o.currency]    — ISO 4217 code, defaults to ILS
 * @param {object} [o.params]      — optional extra non-sensitive parameters
 */
export async function trackMetaPurchase({ transactionId, value, currency = 'ILS', params = {} }) {
  if (!transactionId) return;
  const key = PURCHASE_DEDUP_PREFIX + transactionId;
  try {
    if (localStorage.getItem(key)) return;
    // Claim the transaction BEFORE reporting, so two confirmations racing each
    // other can't both get through.
    localStorage.setItem(key, '1');
  } catch {
    // localStorage unavailable — still report, dedup is best-effort here
  }
  const amount = Number(value);
  await trackMetaEvent(
    MetaEvents.Purchase,
    { ...params, currency },
    Number.isFinite(amount) && amount > 0 ? amount : null
  );
}

export default MetaAppEventsNative;