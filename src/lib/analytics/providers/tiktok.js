/**
 * TikTok App Events provider.
 *
 * Thin adapter over the native TikTok bridge (src/lib/tiktokAppEvents.js).
 *
 * The TikTok SDK is initialised natively at app start, and only when the
 * TikTok credentials were injected into the build — until then every call here
 * rejects and is reported as "not configured" rather than failing the app.
 */
import { TikTokAppEvents } from '@/lib/tiktokAppEvents';

export const tiktokProvider = {
  id: 'tiktok',

  async dispatch({ providerEvent, params, eventId }) {
    await TikTokAppEvents.logEvent({
      name: providerEvent,
      params,
      eventId: eventId || null,
    });
  },

  async setUserId(userId) {
    await TikTokAppEvents.setUserId({ userId: userId || '' });
  },

  async clearUser() {
    await TikTokAppEvents.logout();
  },
};