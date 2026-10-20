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
 * Raised by the publish flow at the moment the publisher leaves the "searching
 * for workers" screen. FirstTaskPublishedFlow is mounted once for the whole
 * session, so it cannot discover a flag that is set later — it is told by event.
 * Same contract as @/lib/appOffer, for the same reason.
 */
const EVENT = 'joba24:first-task-flow';

/** Raise the flow. The component decides whether it may show (see its guard). */
export function raiseFirstTaskFlow() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* no window — nothing to raise */ }
}

/** Listen for the raise. Returns the unsubscribe function. */
export function onFirstTaskFlow(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}