/**
 * Meta App Events provider.
 *
 * Thin adapter over the EXISTING Meta bridge (src/lib/metaAppEvents.js) — the
 * native SDK integration, plugin registration, activateApp, ATT and SKAdNetwork
 * configuration are untouched. This only forwards the already-mapped event name
 * and the sanitised parameters.
 */
import { trackMetaEvent, setMetaUserId } from '@/lib/metaAppEvents';

export const metaProvider = {
  id: 'meta',

  async dispatch({ providerEvent, params, valueToSum }) {
    await trackMetaEvent(providerEvent, params, valueToSum ?? null);
  },

  async setUserId(userId) {
    await setMetaUserId(userId || '');
  },

  async clearUser() {
    await setMetaUserId('');
  },
};