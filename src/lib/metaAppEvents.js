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

export default MetaAppEventsNative;