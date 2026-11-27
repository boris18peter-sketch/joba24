import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasSeenFirstRun, campaignTrackFromUrl } from '@/lib/onboardingTrack';
import { readPendingTask, hasTaskLinkLaunch } from '@/lib/pendingTask';
import { shouldEnterFirstRun } from '@/lib/entryGate';

/**
 * RootEntry — the app's FIRST screen, decided while it renders.
 *
 * ── WHY THIS IS NOT LEFT TO A REDIRECT EFFECT ────────────────────────────────
 * The home route used to render the feed and then, a moment later, an effect in
 * the shared layout decided whether the visitor belonged in the first-run flow
 * instead. That decision sat behind several early returns and async flags — and
 * when ANY of them was not what that effect expected at the instant it ran, the
 * visitor was left on the feed. On Android that is exactly what happened: a
 * fresh install opened onto the feed and the Welcome screen was never reached,
 * while the same build on iOS showed it normally.
 *
 * Here the rule is evaluated during the render of "/" itself: a visitor with no
 * account who has never finished the first run is sent to Welcome by the router,
 * before the feed exists to be mistaken for the destination.
 *
 * The two cases that are genuinely NOT the first run keep the feed:
 *   · a campaign link (?track=publish|worker) already names the journey;
 *   · a shared task link is a task to open, not an onboarding to run.
 *
 * ── THE TASK LINK IS READ FROM THE URL, NOT ONLY FROM STORAGE ───────────────
 * This is what kept sending people to /welcome. A share link is
 * `/?open_task=ID`, and the id is parked in storage by an effect — which runs
 * AFTER this render. So on a cold open from Facebook the parked id did not
 * exist yet, the gate concluded "first run", and the router left for /welcome
 * before the task was ever recorded. The URL is present at this exact moment,
 * so `shouldEnterFirstRun` reads it (see @/lib/entryGate).
 *
 * Everything else about the feed is untouched: a signed-in user, a guest, and a
 * returning visitor who finished the flow all render it exactly as before.
 */
export default function RootEntry({ children }) {
  const { isAuthenticated, isGuest, isLoadingAuth } = useAuth();

  const firstRun = shouldEnterFirstRun({
    search: typeof window !== 'undefined' ? window.location.search : '',
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    pendingTaskId: readPendingTask(),
    linkMarker: hasTaskLinkLaunch(),
    campaignTrack: campaignTrackFromUrl(),
    hasSeenFirstRun: hasSeenFirstRun(),
    isLoadingAuth,
    isAuthenticated,
    isGuest,
  });

  if (firstRun) return <Navigate to="/welcome" replace />;

  return children;
}