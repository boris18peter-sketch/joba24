import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { isNativeLike } from '@/lib/nativeEnv';

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
    Geolocation.requestPermissions()
      .then((status) => {
        if (status.location !== 'granted') {
          if (errorCallback) {
            errorCallback({ code: 1, message: 'Location permission denied' });
          }
          return;
        }
        Geolocation.getCurrentPosition(options || {})
          .then((pos) => {
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
        // requestPermissions failed — fall back to Web API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        } else if (errorCallback) {
          errorCallback(err);
        }
      });
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  } else if (errorCallback) {
    errorCallback({ code: 2, message: 'Geolocation not available' });
  }
}