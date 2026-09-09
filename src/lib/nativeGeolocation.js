import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Drop-in replacement for navigator.geolocation.getCurrentPosition.
 *
 * On native platforms (iOS/Android with Capacitor bridge), uses
 * @capacitor/geolocation which triggers the NATIVE permission dialog
 * via Geolocation.requestPermissions().
 *
 * On web (browser/PWA), falls back to navigator.geolocation (Web API).
 *
 * Usage is identical to navigator.geolocation.getCurrentPosition:
 *   getCurrentPosition(success, error, options)
 */
/**
 * Checks the current geolocation permission status WITHOUT prompting the user.
 * Returns 'granted', 'denied', or 'default' (not yet asked).
 */
export function checkLocationPermission() {
  return new Promise((resolve) => {
    if (Capacitor.isNativePlatform()) {
      Geolocation.checkPermissions()
        .then((status) => {
          const s = status.location; // 'granted' | 'denied' | 'prompt'
          resolve(s === 'prompt' ? 'default' : s);
        })
        .catch(() => resolve('default'));
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
  if (Capacitor.isNativePlatform()) {
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
            if (errorCallback) errorCallback(err);
          });
      })
      .catch((err) => {
        if (errorCallback) errorCallback(err);
      });
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  } else if (errorCallback) {
    errorCallback({ code: 2, message: 'Geolocation not available' });
  }
}