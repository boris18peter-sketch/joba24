import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  getOnboardingTrack,
  setOnboardingTrack,
  isExplainerDone,
  markExplainerDone,
  destinationForTrack,
} from '@/lib/onboardingTrack';
import { explainerSlides } from '@/lib/onboardingTrackContent';
import TrackChoice from '@/components/onboarding/TrackChoice';
import TrackExplainer from '@/components/onboarding/TrackExplainer';

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
 * The ONE exception is a deliberate re-open: the side menu links here with
 * `?switch=1`, because switching your journey is a thing the user asks for on
 * purpose. That path is honoured for anyone.
 *
 * A visitor with no account is unaffected and still gets the flow, resuming a
 * saved track whose explainer screens were not finished yet.
 */
export default function OnboardingTrackWelcome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // The route is rendered only after auth has resolved (the app shows its splash
  // until then), so `isAuthenticated` is already accurate here.
  const deliberate = new URLSearchParams(window.location.search).get('switch') === '1';
  const skipFirstRun = isAuthenticated && !deliberate;

  const [track, setTrack] = useState(() => {
    const saved = getOnboardingTrack();
    return saved && !isExplainerDone(saved) ? saved : null;
  });

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
    navigate(destinationForTrack(current), { replace: true });
  };

  if (skipFirstRun) return null;

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