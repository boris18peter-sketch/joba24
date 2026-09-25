/**
 * TikTok App Events bridge — JS → native (iOS/Android) via a Capacitor plugin.
 *
 * The native plugin is injected at build time and only when the TikTok
 * credentials are present (see codemagic.yaml). When the plugin is absent the
 * calls reject, and the analytics layer reports TikTok as "not configured"
 * instead of failing the user's action.
 *
 * No-op on web — TikTok App Events requires the native SDK.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const TikTokAppEventsNative = registerPlugin('TikTokAppEvents', {
  web: () => Promise.resolve({
    logEvent: () => Promise.resolve(),
    setUserId: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    isAvailable: () => Promise.resolve({ available: false }),
  }),
});

export const TikTokAppEvents = TikTokAppEventsNative;

/**
 * Whether the native TikTok SDK is present AND initialised in this build.
 * Returns false on web and whenever the plugin was not injected.
 */
export async function isTikTokAvailable() {
  if (Capacitor.getPlatform() === 'web') return false;
  try {
    const res = await TikTokAppEventsNative.isAvailable();
    return !!res?.available;
  } catch {
    return false;
  }
}