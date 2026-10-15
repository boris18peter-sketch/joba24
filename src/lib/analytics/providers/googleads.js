/**
 * Google Ads provider — the website conversion tag (gtag.js).
 *
 * The tag itself is loaded once from index.html. This adapter only reports a
 * completed business event to the Google Ads conversion action mapped for that
 * event in ./events.js, so no page or component ever talks to gtag directly.
 *
 * What this deliberately does NOT do:
 *   • No Enhanced Conversions and no personal data. The only values sent are the
 *     Google Ads destination and an opaque internal Joba24 task id — never a
 *     name, phone, email, ID number or address.
 *   • No user identity is attached, so setUserId/clearUser are no-ops.
 *
 * Duplicate protection is two-layered: the canonical event is already guarded by
 * ./dedup.js before it reaches any provider, and `transaction_id` carries the
 * same task id so Google discards a duplicate independently of our own guard.
 *
 * Never throws: a build with no tag (ad blocker, or a platform without gtag)
 * simply skips the call rather than failing the business action.
 */

const CONVERSION_EVENT = 'conversion';
const CURRENCY = 'ILS';

function hasGtag() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

export const googleadsProvider = {
  id: 'googleads',

  async dispatch({ providerEvent, eventId }) {
    // providerEvent is the Google Ads destination: "AW-<id>/<label>".
    // eventId is the canonical dedupe key — the persisted task id.
    if (!providerEvent || !eventId || !hasGtag()) return;

    window.gtag('event', CONVERSION_EVENT, {
      send_to: providerEvent,
      transaction_id: String(eventId),
      // The conversion action is configured without a value. To bid on real
      // task value later, replace this 0 with the task price — that is the only
      // line that needs to change.
      value: 0,
      currency: CURRENCY,
    });
  },

  async setUserId() {},

  async clearUser() {},
};