/**
 * taskFlowI18nLoader — the single loader for the task-flow dictionaries.
 *
 * Both callers go through here: the language system, which fetches them for a
 * non-Hebrew visitor as part of the load that already holds the first paint, and
 * the components that read them. Sharing one cached promise is what keeps this to
 * ONE request per session — a second caller joins the request already in flight
 * instead of starting another.
 *
 * The dictionaries stay a dynamic chunk. They are never imported statically, so
 * they never re-enter the entry bundle.
 *
 * NEVER REJECTS. A caller must be able to carry on with the Hebrew fallback
 * rather than lose a screen to a translation chunk, so a failure resolves to
 * null. A failed attempt is NOT cached — the promise is dropped so the next
 * caller may try again — and the whole session is bounded to MAX_ATTEMPTS. That
 * bound is what rules out both an endless retry loop and a permanently degraded
 * session.
 */
const MAX_ATTEMPTS = 2;

let attempts = 0;
let inFlight = null;
let loaded = null;

/**
 * The dictionaries, if they are already in memory.
 *
 * Read during render so a caller can be correct on its FIRST pass instead of
 * painting the Hebrew fallback and correcting on a later one.
 */
export function getLoadedTaskFlowI18n() {
  return loaded;
}

export function loadTaskFlowI18n() {
  if (loaded) return Promise.resolve(loaded);
  if (!inFlight && attempts < MAX_ATTEMPTS) {
    attempts += 1;
    inFlight = import('@/lib/taskFlowI18n')
      .then((mod) => {
        loaded = mod;
        return mod;
      })
      .catch(() => {
        // Drop the failed attempt so a later caller may retry.
        inFlight = null;
        return null;
      });
  }
  return inFlight || Promise.resolve(null);
}