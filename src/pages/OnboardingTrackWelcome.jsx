import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
 * A saved track whose explainer screens were not seen yet resumes there;
 * otherwise the choice screen is shown — including when someone opens it again
 * deliberately to switch tracks.
 */
export default function OnboardingTrackWelcome() {
  const navigate = useNavigate();
  const [track, setTrack] = useState(() => {
    const saved = getOnboardingTrack();
    return saved && !isExplainerDone(saved) ? saved : null;
  });

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