/**
 * Idempotency guards for analytics dispatch.
 *
 * React rerenders, Capacitor lifecycle changes, navigation, app resume,
 * realtime listeners, duplicate backend callbacks, payment retries and
 * re-delivered webhooks can all re-fire the same business event. Every
 * state-transition event therefore claims its key BEFORE dispatching, so a
 * second identical trigger is a no-op.
 *
 * Keys live in one bounded map rather than one localStorage entry per event —
 * thousands of task ids would otherwise grow storage without limit.
 */

const STORE_KEY = 'joba24_analytics_dedup_v1';
const SESSION_KEY = 'joba24_analytics_dedup_session_v1';
const MAX_ENTRIES = 400;

function readMap(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(storage, key, map) {
  try {
    // Keep only the newest MAX_ENTRIES so storage can never grow unbounded.
    const entries = Object.entries(map);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
      map = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    }
    storage.setItem(key, JSON.stringify(map));
  } catch {
    // Storage unavailable/full — dedup degrades to best-effort, never throws.
  }
}

/**
 * Returns true when this event has not been seen before and should dispatch.
 * Claims the key as a side effect.
 *
 * @param {string} eventName   canonical event name
 * @param {string} [strategy]  'once' | 'session' | 'id' | undefined
 * @param {string} [dedupeKey] the user / task / application / transaction id
 */
export function shouldDispatch(eventName, strategy, dedupeKey) {
  if (!strategy) return true;
  if (!dedupeKey) return true;                 // no key → nothing to compare against

  const composite = `${eventName}:${dedupeKey}`;

  try {
    if (strategy === 'session') {
      const session = readMap(sessionStorage, SESSION_KEY);
      if (session[composite]) return false;
      session[composite] = Date.now();
      writeMap(sessionStorage, SESSION_KEY, session);
      return true;
    }

    // 'once' (per user) and 'id' (per entity) both persist across sessions.
    const map = readMap(localStorage, STORE_KEY);
    if (map[composite]) return false;
    map[composite] = Date.now();
    writeMap(localStorage, STORE_KEY, map);
    return true;
  } catch {
    return true;
  }
}