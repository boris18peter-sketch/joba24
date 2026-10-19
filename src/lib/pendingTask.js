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
 */
const KEY = 'joba24_pending_task';

export function setPendingTask(taskId) {
  if (!taskId) return;
  try { sessionStorage.setItem(KEY, taskId); } catch { /* storage blocked */ }
  try { localStorage.setItem(KEY, taskId); } catch { /* storage blocked */ }
}

export function readPendingTask() {
  try {
    const fromSession = sessionStorage.getItem(KEY);
    if (fromSession) return fromSession;
  } catch { /* storage blocked */ }
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearPendingTask() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}