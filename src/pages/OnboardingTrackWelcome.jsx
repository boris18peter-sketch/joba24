import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  TRACKS,
  getOnboardingTrack,
  setOnboardingTrack,
  isExplainerDone,
  markExplainerDone,
  destinationForTrack,
} from '@/lib/onboardingTrack';
import { explainerSlides } from '@/lib/onboardingTrackContent';
import TrackChoice from '@/components/onboarding/TrackChoice';
import TrackExplainer from '@/components/onboarding/TrackExplainer';
import WorkerJoinStep from '@/components/onboarding/WorkerJoinStep';

/**
 * First-run entry: pick a track, then read the three explainer screens.
 *
 * This page is presentation only. It stores the choice locally and then hands
 * the visitor to the flow that ALREADY exists for that track — the publish form
 * (which already allows guests) or the worker sign-up. It authenticates nobody,
 * touches no OAuth route, and creates neither a task nor a worker profile.
 *
 * ── Who may see it ──────────────────────────────────────────────────────────
 * First run belongs to a VISITOR, not to a signed-in account. So the decision is
 * made from the SERVER-BACKED auth state (`isAuthenticated` comes from
 * AuthContext, which validated the session against the server), never from
 * localStorage alone: a signed-in user who already has an account is sent
 * straight to the feed and never walks the first-run flow again — whether their
 * worker profile is complete, partial, or absent, and whether they publish tasks
 * or do them.
 *
 * Nothing about that user's account is read, written or reset here: the existing
 * worker-profile continuation, the in-app tutorial and every other gate are
 * untouched. Only the automatic first-run screen is skipped.
 *
 * There is no bypass. The screens are reached automatically, once, by a visitor
 * with no account — nothing in the app links here for a signed-in user.
 *
 * A visitor with no account is unaffected and still gets the flow, resuming a
 * saved track whose explainer screens were not finished yet.
 */
export default function OnboardingTrackWelcome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // The route is rendered only after auth has resolved (the app shows its splash
  // until then), so `isAuthenticated` is already accurate here.
  const skipFirstRun = isAuthenticated;

  const [track, setTrack] = useState(() => {
    const saved = getOnboardingTrack();
    return saved && !isExplainerDone(saved) ? saved : null;
  });

  // The worker journey's LAST screen: the join screen, rendered in place.
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (skipFirstRun) navigate('/', { replace: true });
  }, [skipFirstRun, navigate]);

  const choose = (next) => {
    setOnboardingTrack(next);
    setTrack(next);
  };

  const finish = () => {
    const current = track || getOnboardingTrack();
    if (!current) return;
    markExplainerDone(current);

    // The worker journey continues HERE. Sending the visitor to a separate
    // /join page broke the flow in two — it read as leaving one screen for
    // another instead of finishing the one they were on. The join screen is now
    // this flow's final step, and it keeps its own logic intact: signing in
    // there still hands the visitor to the worker profile setup, and
    // continue-as-guest still opens the app.
    if (current === TRACKS.WORKER) {
      setShowJoin(true);
      return;
    }

    // PUSH, never replace: leaving the first-run flow has to keep the flow in the
    // history stack, so pressing Back on the destination returns to these screens
    // instead of stepping past them — past the app itself — and out to whatever
    // page the visitor arrived from.
    navigate(destinationForTrack(current));
  };

  if (skipFirstRun) return null;

  if (showJoin) {
    return <WorkerJoinStep onBack={() => setShowJoin(false)} />;
  }

  if (!track) {
    return <TrackChoice currentTrack={getOnboardingTrack()} onChoose={choose} />;
  }

  return (
    <TrackExplainer
      track={track}
      slides={explainerSlides(track)}
      onFinish={finish}
      onSwitchTrack={() => setTrack(null)}
    />
  );
}