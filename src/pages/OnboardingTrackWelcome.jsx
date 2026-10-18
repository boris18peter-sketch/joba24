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
  const { isAuthenticated, enterGuestMode } = useAuth();

  // The route is rendered only after auth has resolved (the app shows its splash
  // until then), so `isAuthenticated` is already accurate here.
  const skipFirstRun = isAuthenticated;

  const [track, setTrack] = useState(() => {
    const saved = getOnboardingTrack();
    return saved && !isExplainerDone(saved) ? saved : null;
  });

  // The worker journey's LAST screen: the join screen, rendered in place.
  const [showJoin, setShowJoin] = useState(false);

  // Which explainer screen the visitor is on. Held HERE, not inside
  // TrackExplainer, because the join step replaces the explainer inside this
  // same flow — and a slide index owned by a component that unmounts would
  // reset to the first screen, so pressing Back from the join step returned the
  // visitor to the start of the journey instead of the screen they left.
  const [slideIndex, setSlideIndex] = useState(0);

  // A signed-in visitor is never shown the first-run screens — but WHERE they
  // go next must be the same decision the /join page makes, not a shortcut past
  // it. This matters for the sign-in that happens INSIDE the worker flow: OAuth
  // returns to this URL, so the effect below is what decides the destination.
  //
  // A worker-track visitor is therefore sent to /join itself, which applies the
  // existing rule: a user who already has a profile is dropped into the feed, a
  // user who has not is walked through the profile steps. Letting that page own
  // the decision is the only way the two entry points cannot drift apart.
  const savedTrack = getOnboardingTrack();

  useEffect(() => {
    if (!skipFirstRun) return;
    const workerTrack = savedTrack === TRACKS.WORKER && isExplainerDone(savedTrack);
    navigate(workerTrack ? '/join' : '/', { replace: true });
  }, [skipFirstRun, savedTrack, navigate]);

  // ── ROOT CAUSE OF "the form only opens on the SECOND launch" ─────────────
  //
  // The publish form is a lazily-loaded route: its code is fetched the first
  // time the route is opened. That fetch happened at the exact moment the
  // visitor finished the last explainer screen — the one moment where a delay
  // is fatal, because the app had nothing to show yet and the route swap, the
  // bundle download and the brand/auth bootstrap all had to land together.
  // On a cold start the visitor was left without the form; on the next launch
  // the bundle was already on the device, so the form appeared.
  //
  // The fix is to stop fetching at that moment at all: the form's code is
  // warmed while the visitor is still READING the explainer screens, which
  // takes several seconds. By the time they tap through, the form is already
  // in memory and opens instantly — on the FIRST launch, with no reload, no
  // timeout and no second start.
  useEffect(() => {
    if (track !== TRACKS.PUBLISH) return;
    // A warm-up only: if the chunk cannot be fetched right now, the rejection is
    // swallowed here and the form loads normally when it is opened. Uncaught, it
    // surfaced as "TypeError: Importing a module script failed." on the
    // explainer screen, which was otherwise working.
    import('@/pages/CreateTask').catch(() => {});
  }, [track]);

  const choose = (next) => {
    setOnboardingTrack(next);
    setTrack(next);
    setSlideIndex(0);
  };

  const switchTrack = () => {
    setTrack(null);
    setSlideIndex(0);
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

    // The publish journey IS a guest journey — "fill the task, sign in only when
    // you actually publish". Entering guest mode HERE, before the form opens,
    // is what makes that true from the very first launch: the visitor arrives
    // at the form already identified as a guest, so the feed renders for them
    // the moment they close the form, and the guest gate has nothing to bounce.
    enterGuestMode();

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
      index={slideIndex}
      onIndexChange={setSlideIndex}
      onFinish={finish}
      onSwitchTrack={switchTrack}
    />
  );
}