/**
 * The first-task-published flow — ONE continuous popup with two steps:
 *
 *   step 1 — "your task is live". Shown on WEB and in the APP, once per USER:
 *            the flag lives on the User record, so the explanation is seen once
 *            per person, not once per browser or device.
 *   step 2 — the app download. WEB only, and only while a store link exists.
 *            Its completion is remembered separately (see @/lib/appOffer), so
 *            answering one step never depends on the other.
 *
 * ── REQUESTED, THEN RELEASED ─────────────────────────────────────────────────
 * The publisher leaves the publish screen long before the feed exists, and the
 * feed is busy for several seconds showing the new task's highlight. So the flow
 * is REQUESTED at publish time and only RELEASED once that highlight has
 * finished — the publisher must see their task on the feed first. The request
 * has to survive the navigation, which is why it lives here and not in a
 * component; the release consumes it, so it can never happen twice.
 */
const EVENT = 'joba24:first-task-flow';

let pending = false;

/** The publisher just posted: ask for the flow. Does NOT open it yet. */
export function requestFirstTaskFlow() {
  pending = true;
}

/** Whether a flow is waiting for the highlight to finish. */
export function isFirstTaskFlowPending() {
  return pending;
}

/**
 * The highlight phase has finished and the task is on screen — open the flow.
 * Consumes the request, so a re-render, a navigation or a data refresh can never
 * open it a second time.
 */
export function releaseFirstTaskFlow() {
  if (!pending) return false;
  pending = false;
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* no window — nothing to open */ }
  return true;
}

/** Listen for the release. Returns the unsubscribe function. */
export function onFirstTaskFlow(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}