import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasSeenFirstRun, campaignTrackFromUrl } from '@/lib/onboardingTrack';
import { readPendingTask } from '@/lib/pendingTask';

/**
 * RootEntry — the app's FIRST screen, decided while it renders.
 *
 * ── WHY THIS IS NOT LEFT TO A REDIRECT EFFECT ────────────────────────────────
 * The home route used to render the feed and then, a moment later, an effect in
 * the shared layout decided whether the visitor belonged in the first-run flow
 * instead. That decision sat behind four early returns (an authenticated user, a
 * campaign link, a shared task link, a guest, a pending task) and several async
 * flags — and when ANY of them was not what that effect expected at the instant
 * it ran, the visitor was left on the feed. On Android that is exactly what
 * happened: a fresh install opened onto the feed and the Welcome screen was
 * never reached, while the same build on iOS showed it normally.
 *
 * Here the rule is evaluated during the render of "/" itself: a visitor with no
 * account who has never finished the first run is sent to Welcome by the router,
 * before the feed exists to be mistaken for the destination. No timer, no flag
 * that may still be loading, no branch that can be skipped.
 *
 * The two cases that are genuinely NOT the first run keep the feed:
 *   · a campaign link (?track=publish|worker) already names the journey — it
 *     goes straight into that journey, which is what the link is for;
 *   · a shared task link is a task to open, not an onboarding to run.
 * Both are the same exceptions the layout applies, read the same way.
 *
 * Everything else about the feed is untouched: a signed-in user, a guest, and a
 * returning visitor who finished the flow all render it exactly as before.
 */
export default function RootEntry({ children }) {
  const { isAuthenticated, isGuest, isLoadingAuth } = useAuth();

  if (!isLoadingAuth && !isAuthenticated && !isGuest && !hasSeenFirstRun()) {
    const campaignTrack = campaignTrackFromUrl();
    if (!campaignTrack && !readPendingTask()) {
      return <Navigate to="/welcome" replace />;
    }
  }

  return children;
}