/**
 * Joba24 centralized analytics service.
 *
 * Business logic fires ONE canonical Joba24 event:
 *
 *   trackEvent('task_published', { category, city, value, currency }, { dedupeKey: task.id })
 *
 * and this module distributes it to every enabled provider using the mapping in
 * ./events.js — Meta App Events, Firebase Analytics / Google, TikTok App Events.
 * No UI component talks to an advertising SDK directly.
 *
 * Guarantees:
 *   • trackEvent NEVER throws and NEVER rejects. A provider failure, a missing
 *     SDK or a broken network can never block registration, task publishing,
 *     applications, payments, login or any other business action.
 *   • Parameters are filtered through the safe schema before leaving the app.
 *   • State-transition events are idempotent (see ./dedup.js).
 *
 * Both acquisition funnels are supported with no user-type flag:
 *   WORKER    sign_up → worker_profile_completed → location_enabled →
 *             notifications_enabled → kyc_completed → task_viewed →
 *             application_submitted → task_completed
 *   PUBLISHER sign_up → task_creation_started → task_published →
 *             worker_selected → task_completed
 * An account may be both at once — every event is behavioural, never a
 * permanent "worker"/"publisher" classification of the account.
 *
 * Callers fire-and-forget — no `await` needed.
 */
import { EVENTS } from './events';
import { sanitizeParams, DEFAULT_CURRENCY } from './params';
import { shouldDispatch } from './dedup';
import { metaProvider } from './providers/meta';
import { firebaseProvider } from './providers/firebase';
import { tiktokProvider } from './providers/tiktok';

// Provider id must match the taxonomy column name in ./events.js
const PROVIDERS = [metaProvider, firebaseProvider, tiktokProvider];

/* ────────────────────────────── Debug / QA ────────────────────────────── */

// Debug is OFF in production. Enable on a test device with either:
//   localStorage.setItem('joba24_analytics_debug', '1')
//   window.__JOBA24_ANALYTICS_DEBUG__ = true
// then reload. Prints which canonical events fired and which providers received
// the dispatch attempt — never secrets, tokens, KYC data or PII.
const DEBUG_KEY = 'joba24_analytics_debug';

let debugEnabled = false;
try {
  debugEnabled =
    localStorage.getItem(DEBUG_KEY) === '1' ||
    (typeof window !== 'undefined' && window.__JOBA24_ANALYTICS_DEBUG__ === true);
} catch {
  debugEnabled = false;
}

export function setAnalyticsDebug(on) {
  debugEnabled = !!on;
  try {
    if (on) localStorage.setItem(DEBUG_KEY, '1');
    else localStorage.removeItem(DEBUG_KEY);
  } catch {
    // ignore — developer convenience only
  }
}

export function isAnalyticsDebug() {
  return debugEnabled;
}

function report(eventName, lines) {
  if (!debugEnabled) return;
  // eslint-disable-next-line no-console
  console.log(`[Analytics]\n${eventName}\n${lines.join('\n')}`);
}

/* ─────────────────────────── Dispatch internals ─────────────────────────── */

function safeCall(fn) {
  try {
    return Promise.resolve(fn()).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

async function dispatchToProvider(provider, ctx) {
  const providerEvent = ctx.def[provider.id];
  if (!providerEvent) return `${provider.id}: no mapping`;

  try {
    await provider.dispatch({
      providerEvent,
      params: ctx.params,
      valueToSum: ctx.valueToSum,
      eventId: ctx.dedupeKey,
    });
    return `${provider.id}: dispatched`;
  } catch (err) {
    const msg = String(err?.message || err || 'error');
    // A missing native SDK (e.g. TikTok before credentials are injected) is an
    // expected state, not a failure worth alarming about.
    const notConfigured = /not implemented|not available|unimplemented/i.test(msg);
    return `${provider.id}: ${notConfigured ? 'not configured' : `failed (${msg})`}`;
  }
}

/* ──────────────────────────── Public API ──────────────────────────── */

/**
 * Fire a canonical Joba24 event. Safe to call from anywhere, as often as a
 * rerender happens — dedup and the taxonomy handle the rest.
 *
 * @param {string} eventName  a key of EVENTS in ./events.js
 * @param {object} [params]   safe parameters (category, city, value, currency, …)
 * @param {object} [options]
 * @param {string} [options.dedupeKey] user / task / application / transaction id
 * @returns {Promise<object>} small status object; never rejects
 */
export function trackEvent(eventName, params = {}, options = {}) {
  try {
    const def = EVENTS[eventName];
    if (!def) {
      if (debugEnabled) {
        // eslint-disable-next-line no-console
        console.warn(`[Analytics] unknown event "${eventName}" — add it to src/lib/analytics/events.js first`);
      }
      return Promise.resolve({ unknown: true });
    }

    // Events the provider SDKs already log on app activation (app_open).
    if (def.auto) {
      report(eventName, PROVIDERS.map((p) => `${p.id}: automatic (SDK logs this on app open)`));
      return Promise.resolve({ auto: true });
    }

    const dedupeKey = options.dedupeKey || null;
    if (!shouldDispatch(eventName, def.dedup, dedupeKey)) {
      report(eventName, PROVIDERS.map((p) => `${p.id}: skipped (duplicate)`));
      return Promise.resolve({ duplicate: true });
    }

    const safe = sanitizeParams(params);

    // Money events always carry a real value and an ISO currency.
    if (eventName === 'purchase' && !safe.currency) safe.currency = DEFAULT_CURRENCY;

    const valueToSum = typeof safe.value === 'number' ? safe.value : null;

    return Promise.all(
      PROVIDERS.map((p) => dispatchToProvider(p, { def, params: safe, valueToSum, dedupeKey }))
    )
      .then((results) => {
        report(eventName, results);
        return {};
      })
      .catch(() => ({}));
  } catch {
    // Absolute last resort — analytics must never surface an error to the user.
    return Promise.resolve({});
  }
}

/**
 * Attach the stable internal Joba24 user id for attribution. Call after
 * authentication. The id is an opaque Joba24 identifier — never a name, phone
 * number, email, ID number or any other personal detail.
 */
export function setAnalyticsUser(userId) {
  if (!userId) return Promise.resolve();
  return Promise.allSettled(PROVIDERS.map((p) => safeCall(() => p.setUserId(userId))));
}

/** Clear the analytics identity on logout. */
export function clearAnalyticsUser() {
  return Promise.allSettled(PROVIDERS.map((p) => safeCall(() => p.clearUser())));
}

/** Developer/QA helper — resolves once, for on-device verification. */
export async function getAnalyticsStatus() {
  const { isTikTokAvailable } = await import('@/lib/tiktokAppEvents');
  const { Capacitor } = await import('@capacitor/core');
  return {
    platform: Capacitor.getPlatform(),
    debug: debugEnabled,
    meta: true,
    firebase: true,
    tiktok: await isTikTokAvailable(),
  };
}