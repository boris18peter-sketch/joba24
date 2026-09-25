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
async function sdk() {
  const mod = await import('@capacitor-firebase/analytics');
  return mod.FirebaseAnalytics;
}

export const firebaseProvider = {
  id: 'firebase',

  async dispatch({ providerEvent, params }) {
    const FirebaseAnalytics = await sdk();
    await FirebaseAnalytics.logEvent({ name: providerEvent, params });
  },

  async setUserId(userId) {
    const FirebaseAnalytics = await sdk();
    await FirebaseAnalytics.setUserId({ userId: userId || null });
  },

  async clearUser() {
    const FirebaseAnalytics = await sdk();
    await FirebaseAnalytics.setUserId({ userId: null });
  },
};