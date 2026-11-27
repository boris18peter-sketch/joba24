/**
 * The hand-off for "a link asked for this task".
 *
 * A share link (a Facebook post, a notification, a forwarded URL) carries only a
 * task id, and the visitor is usually NOT signed in yet. This module is the one
 * place that parks that id while the app sorts out auth, onboarding and Brand
 * routing, so the task can still be opened afterwards.
 *
 * TWO STORES ON PURPOSE. The sign-in round-trip can hand the visitor to a fresh
 * WebView where sessionStorage no longer exists — and a Facebook link opens in
 * the in-app browser, unauthenticated. localStorage is what carries the task
 * across that gap; sessionStorage is the faster, session-scoped copy.
 *
 * Every access is guarded: an iOS WKWebView with storage blocked THROWS on
 * sessionStorage, and a lost task is far worse than a lost optimisation.
 *
 * ── IT EXPIRES, AND THAT IS WHAT UNBLOCKED THE FIRST-RUN FLOW ──────────────
 * A parked task is a MOMENT, not a preference: `?open_task=…`, a Universal Link
 * tap, a tap on a Live Update card. It was stored as a bare id with no time, so
 * one that was never consumed stayed in localStorage for ever — and the Layout
 * gate treats "a task is waiting" as "this launch came from a link", sending the
 * visitor to the feed as a guest instead of into the first-run flow. On Android
 * (where the app runs a bundled copy and deep links are configured) that left
 * the app opening on the feed launch after launch, never on Welcome.
 *
 * A hand-off is therefore stamped and ignored — and cleared — once it is older
 * than MAX_AGE_MS. Real links are consumed within seconds, or within a minute or
 * two across a sign-in; anything older is a leftover that no tap is waiting for.
 * A legacy bare id has no stamp at all and is likewise treated as spent.
 */
const KEY = 'joba24_pending_task';
const MAX_AGE_MS = 10 * 60 * 1000;

// ── THE LAUNCH ITSELF WAS A TASK LINK ──────────────────────────────────────
// The parked id is CONSUMED as soon as the sheet opens, but the fact that this
// launch came from a task link has to outlive it: once the id was cleared, the
// gate in Layout fell through to its "visitor with no account" branch and sent
// the visitor to /welcome — the task they tapped was replaced by the first-run
// screen. This marker is written whenever a task is parked and read by the
// gates, so a task link lands on the task for the whole launch, not for the few
// seconds the id is still in storage.
const LINK_KEY = 'joba24_task_link_at';
const LINK_MAX_AGE_MS = 30 * 60 * 1000;

// Fired whenever a task is parked. DeepLinkHandler listens for it so a link that
// arrives while the app is ALREADY open (a Universal Link tap, a second shared
// link) is opened too — its one-time mount check would otherwise ignore every
// link after the first.
export const PENDING_TASK_EVENT = 'joba24_pending_task';

function readRaw(store) {
  try { return store.getItem(KEY); } catch { return null; }
}

export function setPendingTask(taskId) {
  if (!taskId) return;
  markTaskLinkLaunch();
  const value = JSON.stringify({ id: taskId, at: Date.now() });
  try { sessionStorage.setItem(KEY, value); } catch { /* storage blocked */ }
  try { localStorage.setItem(KEY, value); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new Event(PENDING_TASK_EVENT)); } catch { /* no window */ }
}

export function readPendingTask() {
  let raw = null;
  try { raw = readRaw(sessionStorage); } catch { /* storage blocked */ }
  if (!raw) raw = readRaw(localStorage);
  if (!raw) return null;

  let entry = null;
  try { entry = JSON.parse(raw); } catch { /* legacy bare id — see above */ }

  const fresh = entry
    && typeof entry.id === 'string'
    && Number.isFinite(entry.at)
    && Date.now() - entry.at <= MAX_AGE_MS;

  if (!fresh) {
    clearPendingTask();
    return null;
  }
  return entry.id;
}

export function clearPendingTask() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

/** Record that this launch was opened by a task link. */
export function markTaskLinkLaunch() {
  const value = String(Date.now());
  try { sessionStorage.setItem(LINK_KEY, value); } catch { /* storage blocked */ }
  try { localStorage.setItem(LINK_KEY, value); } catch { /* storage blocked */ }
}

/** True while this launch is still the one a task link started. */
export function hasTaskLinkLaunch() {
  let raw = null;
  try { raw = sessionStorage.getItem(LINK_KEY); } catch { /* storage blocked */ }
  if (!raw) { try { raw = localStorage.getItem(LINK_KEY); } catch { /* storage blocked */ } }
  const at = Number(raw);
  if (!Number.isFinite(at) || !at) return false;
  if (Date.now() - at > LINK_MAX_AGE_MS) return false;
  return true;
}

/**
 * The task a URL itself asks for.
 *
 * `/?open_task=ID` is the app's share format (TaskCard and TaskDetail build it),
 * and `/task/ID` is the route form. Reading this is what lets the entry gate
 * decide correctly on the FIRST render, before any effect has run — the parked
 * id only reaches storage in an effect, which is a moment too late for a
 * render-time redirect.
 */
export function taskLinkFromUrl(search, pathname) {
  try {
    const id = new URLSearchParams(search || '').get('open_task');
    if (id) return id;
  } catch { /* malformed query string */ }
  const match = /^\/task\/([^/?#]+)/.exec(pathname || '');
  return match ? decodeURIComponent(match[1]) : null;
}