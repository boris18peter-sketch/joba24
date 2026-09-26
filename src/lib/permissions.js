/**
 * Device-permission helpers for the two permissions the app asks for:
 * location and notifications.
 *
 * Every function returns one of a shared, normalised vocabulary so the UI can
 * treat both permissions identically, on native (Capacitor) and on the web:
 *
 *   'granted'     — the OS reports the permission as allowed
 *   'denied'      — the user refused it; the OS will not ask again
 *   'prompt'      — not decided yet; the OS dialog can still be shown
 *   'unavailable' — this environment cannot open the OS dialog at all (no native
 *                   bridge, plugin not installed, or the browser blocks it in an
 *                   embedded frame). The user must change it in device settings.
 *
 * 'unavailable' exists so a permission request is NEVER reported as a silent
 * denial: that made the toggles look like they did nothing at all when the OS
 * dialog could not be opened.
 */
import { base44 } from '@/api/base44Client';
import { checkLocationPermission, getCurrentPosition } from '@/lib/nativeGeolocation';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { hasCapacitorBridge } from '@/lib/nativeEnv';

export { checkLocationPermission };

/** The app's Android package id — needed to deep-link to its settings screen. */
const ANDROID_PACKAGE = 'com.base69e6bdb4986a04a256653a23.app';

/** True when we are rendered inside an embedded frame (the in-app preview). */
function isEmbeddedFrame() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true; // cross-origin access threw — definitely framed
  }
}

/** Current location permission, without prompting. */
export async function getLocationStatus() {
  const raw = await checkLocationPermission(); // 'granted' | 'denied' | 'default'
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'prompt';
}

/** Current notification permission, without prompting. */
export async function getNotificationStatus() {
  if (hasCapacitorBridge()) {
    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const { receive } = await FirebaseMessaging.checkPermissions();
      if (receive === 'granted') return 'granted';
      if (receive === 'denied') return 'denied';
      return 'prompt';
    } catch {
      // The native plugin is unreachable, so the OS dialog cannot be opened.
      return 'unavailable';
    }
  }
  if (typeof Notification === 'undefined') return 'unavailable';
  const perm = Notification.permission; // 'default' | 'granted' | 'denied'
  return perm === 'default' ? 'prompt' : perm;
}

/** Asks for notification permission — opens the OS dialog while undetermined. */
export async function requestNotifications() {
  if (!hasCapacitorBridge() && isEmbeddedFrame()) return 'unavailable';
  return requestNotificationPermission(); // 'granted' | 'denied' | 'prompt' | 'unavailable'
}

/**
 * Asks for location permission. The position call is what opens the OS dialog;
 * the result is then read back from the authoritative permission status, so a
 * GPS timeout is never mistaken for a denial.
 */
export async function requestLocation() {
  if (!hasCapacitorBridge() && isEmbeddedFrame()) return 'unavailable';

  await new Promise((resolve) => {
    getCurrentPosition(() => resolve(), () => resolve(), {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
  return getLocationStatus();
}

/**
 * Stores this device's push token on the user so notifications can reach it.
 * Safe to call repeatedly — the token is only added once.
 */
export async function registerPushToken() {
  try {
    const token = await getFCMToken();
    if (!token) return;
    const me = await base44.auth.me();
    if (!me) return;
    const existing = me.fcm_tokens || [];
    if (existing.includes(token)) return;
    await base44.auth.updateMe({ fcm_tokens: [...existing, token] });
    window.dispatchEvent(new Event('notif_permission_changed'));
  } catch (err) {
    console.error('[permissions] push token registration failed:', err?.message);
  }
}

/**
 * A URL that opens this app's settings screen on Android, so the user can
 * change a permission the OS will no longer prompt for. Returns null when the
 * platform has no such deep link (iOS) — callers then show written steps.
 */
export function getAppSettingsIntent(kind = 'notifications') {
  if (typeof navigator === 'undefined') return null;
  if (!/Android/i.test(navigator.userAgent || '')) return null;
  if (kind === 'location') {
    return `intent://#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${ANDROID_PACKAGE};end`;
  }
  return `intent://#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.app.extra.APP_PACKAGE=${ANDROID_PACKAGE};end`;
}