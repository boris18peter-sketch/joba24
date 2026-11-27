import { taskLinkFromUrl } from '@/lib/pendingTask';

/**
 * entryGate — the ONE decision about whether a visitor belongs in the first-run
 * flow, shared by the route (RootEntry) and the layout.
 *
 * ── WHY THIS IS A PURE FUNCTION ─────────────────────────────────────────────
 * A shared task link is `/?open_task=ID`. The id reaches storage in an effect
 * (DeepLinkHandler's mount effect), and effects run AFTER the first render — so
 * a gate that asked only "is a task parked?" answered NO on a cold open, and the
 * visitor was redirected to /welcome before the task was ever recorded. Once on
 * /welcome the task waits, because the first-run flow owns the screen.
 *
 * The URL is available at the instant of that first render, so the URL itself is
 * evidence: a link that names a task is a task, whatever storage says. This
 * module exists so both gates apply that rule identically, and so the rule can
 * be tested directly instead of only through a browser.
 */

/** Does this launch carry a task to open? URL first, then the parked hand-off. */
export function launchHasTask({ search, pathname, pendingTaskId, linkMarker } = {}) {
  return !!(
    taskLinkFromUrl(search, pathname)
    || pendingTaskId
    || linkMarker
  );
}

/**
 * Should this visitor be sent to the first-run flow?
 *
 * Only a visitor with no account, who never finished the first run, with no
 * campaign link and no task to open. Everything else keeps the feed.
 */
export function shouldEnterFirstRun({
  search = '',
  pathname = '/',
  pendingTaskId = null,
  linkMarker = false,
  campaignTrack = null,
  hasSeenFirstRun = false,
  isLoadingAuth = false,
  isAuthenticated = false,
  isGuest = false,
} = {}) {
  if (isLoadingAuth || isAuthenticated || isGuest || hasSeenFirstRun) return false;
  if (campaignTrack) return false;
  return !launchHasTask({ search, pathname, pendingTaskId, linkMarker });
}