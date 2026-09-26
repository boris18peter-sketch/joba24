/**
 * Device-permission helpers for the two permissions the app asks for:
 * location and notifications.
 *
 * Both are normalised to 'granted' | 'denied' | 'prompt' so the UI can treat
 * them identically, on native (Capacitor) and on the web.
 */
import { base44 } from '@/api/base44Client';
import { checkLocationPermission, getCurrentPosition } from '@/lib/nativeGeolocation';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { hasCapacitorBridge } from '@/lib/nativeEnv';

export { checkLocationPermission };

/** The app's Android package id — needed to deep-link to its settings screen. */
const ANDROID_PACKAGE = 'com.base69e6bdb4986a04a256653a23.app';

/** Current notification permission: 'granted' | 'denied' | 'prompt'. */
export async function getNotificationStatus() {
  if (hasCapacitorBridge()) {
    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const { receive } = await FirebaseMessaging.checkPermissions();
      if (receive === 'granted') return 'granted';
      if (receive === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }
  if (typeof Notification === 'undefined') return 'denied';
  const perm = Notification.permission; // 'default' | 'granted' | 'denied'
  return perm === 'default' ? 'prompt' : perm;
}

/** Asks for notification permission (shows the OS dialog when undetermined). */
export async function requestNotifications() {
  const result = await requestNotificationPermission();
  if (result === 'granted') return 'granted';
  if (result === 'denied') return 'denied';
  return 'prompt';
}

/**
 * Asks for location permission. The position call is what triggers the OS
 * dialog; the returned value is then read back from the authoritative
 * permission status, so a GPS timeout is never mistaken for a denial.
 */
export async function requestLocation() {
  await new Promise((resolve) => {
    getCurrentPosition(() => resolve(), () => resolve(), {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
  const status = await checkLocationPermission();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'prompt';
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