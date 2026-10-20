/**
 * "This session is publishing, not job-hunting."
 *
 * Joba24 lets one person be BOTH a publisher and a worker, so the welcome-bonus
 * celebration can never be suppressed for everyone who has ever posted a task —
 * it is decided by the CONTEXT the visitor is in. Someone who opened the publish
 * form is here as a publisher, and the signup celebration is not part of that
 * journey; a visitor who came to find work keeps it exactly as it was.
 *
 * Kept in sessionStorage rather than in memory because a guest who signs in
 * half-way through the publish form leaves the page for the OAuth round-trip —
 * the context has to outlive it. It never touches eligibility, balances or the
 * granting of any bonus: it decides one thing only, whether that POPUP is shown.
 */
const KEY = 'joba24_publisher_context';
let memory = false;

/** The visitor has entered the publish flow (or posted) in this session. */
export function markPublisherContext() {
  memory = true;
  try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
}

/** True while this session belongs to the publishing journey. */
export function isPublisherContext() {
  if (memory) return true;
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}