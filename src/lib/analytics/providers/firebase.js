/**
 * Firebase Analytics / Google Analytics provider.
 *
 * Uses the official Capacitor Firebase Analytics plugin
 * (@capacitor-firebase/analytics), which wraps the native Firebase Analytics
 * SDK on Android and iOS. FirebaseApp is configured by the plugin itself from
 * google-services.json (Android) / GoogleService-Info.plist (iOS).
 *
 * Events logged here are what Google Ads imports as conversion actions.
 */

// Imported lazily so a platform without the plugin (e.g. a plain web build)
// can never break the app bundle.
//
// The loader resolves to a PLAIN object holding the plugin — never to the
// plugin itself. A Capacitor plugin is a Proxy that answers every property
// lookup with a callable wrapper, so it also looks like a thenable: returning
// it from an async function makes the promise machinery call `.then()` on it,
// and Capacitor answers that by creating an orphan promise that rejects with
// `"FirebaseAnalytics.then()" is not implemented on web` — an unhandled
// rejection on every analytics event.
let sdkPromise = null;
function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = import('@capacitor-firebase/analytics').then((mod) => ({
      FirebaseAnalytics: mod.FirebaseAnalytics,
    }));
  }
  return sdkPromise;
}

export const firebaseProvider = {
  id: 'firebase',

  async dispatch({ providerEvent, params }) {
    const { FirebaseAnalytics } = await loadSdk();
    await FirebaseAnalytics.logEvent({ name: providerEvent, params });
  },

  async setUserId(userId) {
    const { FirebaseAnalytics } = await loadSdk();
    await FirebaseAnalytics.setUserId({ userId: userId || null });
  },

  async clearUser() {
    const { FirebaseAnalytics } = await loadSdk();
    await FirebaseAnalytics.setUserId({ userId: null });
  },
};