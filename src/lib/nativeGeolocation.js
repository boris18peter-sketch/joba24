import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { isNativeLike } from '@/lib/nativeEnv';
import { trackEvent } from '@/lib/analytics';

/**
 * Drop-in replacement for navigator.geolocation.getCurrentPosition.
 *
 * On native platforms (iOS/Android with Capacitor bridge), uses
 * @capacitor/geolocation which triggers the NATIVE permission dialog
 * via Geolocation.requestPermissions().
 *
 * On Android WebView WITHOUT the Capacitor bridge (server.url mode),
 * falls back to navigator.geolocation (Web API) — the WebView's
 * WebChromeClient handles the permission prompt natively.
 *
 * On web (browser/PWA), falls back to navigator.geolocation (Web API).
 *
 * Usage is identical to navigator.geolocation.getCurrentPosition:
 *   getCurrentPosition(success, error, options)
 */

// True when the Capacitor JS bridge is actually available — NOT just when
// we're inside a native WebView. Capacitor.isNativePlatform() returns false
// on Android when content loads from a remote server.url (no bridge injected).
// We check the bridge directly so we only attempt plugin calls when they'll work.
function hasCapacitorBridge() {
  return Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' && !!window.Capacitor?.Plugins?.Geolocation);
}

// ── Runtime-permission sequencing (Android) ───────────────────────────────
// Android shows only ONE runtime-permission dialog at a time. The location
// dialog is requested on startup (HomeFeed), so when the notification prompt
// asked for POST_NOTIFICATIONS at the same moment, the system silently dropped
// the second request — which is why the notification dialog only appeared on
// the SECOND app launch. These flags let the notification prompt wait until the
// location dialog has been answered before it opens its own.
let locationRequestStarted = false;
let locationPermissionSettled = false;
let resolveLocationSettled = null;
const locationSettledPromise = new Promise((resolve) => { resolveLocationSettled = resolve; });

function markLocationPermissionSettled() {
  if (locationPermissionSettled) return;
  locationPermissionSettled = true;
  resolveLocationSettled();
}

/**
 * Resolves once it is safe to show ANOTHER runtime-permission dialog — i.e.
 * after the location dialog (if one is pending) has been answered.
 *
 * - Permission already settled → resolves immediately.
 * - A location request is in flight → waits for the user's answer (up to maxWaitMs).
 * - No location request started → waits a short grace period for the mount-time
 *   request to begin, then resolves so notifications are never blocked.
 */
export function waitForLocationPermissionSettled(maxWaitMs = 20000) {
  if (!hasCapacitorBridge() || locationPermissionSettled) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(grace);
      clearTimeout(cap);
      resolve();
    };
    const grace = setTimeout(() => { if (!locationRequestStarted) finish(); }, 1200);
    const cap = setTimeout(finish, maxWaitMs);
    locationSettledPromise.then(finish);
  });
}

/**
 * Checks the current geolocation permission status WITHOUT prompting the user.
 * Returns 'granted', 'denied', or 'default' (not yet asked).
 */
export function checkLocationPermission() {
  return new Promise((resolve) => {
    if (hasCapacitorBridge()) {
      Geolocation.checkPermissions()
        .then((status) => {
          const s = status.location; // 'granted' | 'denied' | 'prompt'
          resolve(s === 'prompt' ? 'default' : s);
        })
        .catch(() => {
          // Bridge exists but plugin call failed — fall through to web API
          if (typeof navigator !== 'undefined' && navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' })
              .then((result) => resolve(result.state === 'prompt' ? 'default' : result.state))
              .catch(() => resolve('default'));
          } else {
            resolve('default');
          }
        });
    } else if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          resolve(result.state === 'prompt' ? 'default' : result.state);
        })
        .catch(() => resolve('default'));
    } else {
      resolve('default');
    }
  });
}

export function getCurrentPosition(successCallback, errorCallback, options) {
  if (hasCapacitorBridge()) {
    locationRequestStarted = true;
    Geolocation.requestPermissions()
      .then((status) => {
        markLocationPermissionSettled();
        if (status.location !== 'granted') {
          if (errorCallback) {
            errorCallback({ code: 1, message: 'Location permission denied' });
          }
          return;
        }
        Geolocation.getCurrentPosition(options || {})
          .then((pos) => {
            trackEvent('location_enabled', {}, { dedupeKey: localStorage.getItem('joba24_device_id') });
            successCallback({
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
              },
              timestamp: pos.timestamp,
            });
          })
          .catch((err) => {
            // Plugin call failed — fall back to Web API
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
            } else if (errorCallback) {
              errorCallback(err);
            }
          });
      })
      .catch((err) => {
        markLocationPermissionSettled();
        // requestPermissions failed — fall back to Web API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        } else if (errorCallback) {
          errorCallback(err);
        }
      });
  } else if (navigator.geolocation) {
   navigator.geolocation.getCurrentPosition(
     (pos) => {
       trackEvent('location_enabled', {}, { dedupeKey: localStorage.getItem('joba24_device_id') });
       successCallback(pos);
     },
     errorCallback,
     options
   );
  } else if (errorCallback) {
    errorCallback({ code: 2, message: 'Geolocation not available' });
  }
}