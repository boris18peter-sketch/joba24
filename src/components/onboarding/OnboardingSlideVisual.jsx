import PhoneFrame from '@/components/onboarding/PhoneFrame';
import ScreenshotScreen from '@/components/onboarding/visuals/ScreenshotScreen';
import DemoTaskScreen from '@/components/onboarding/visuals/DemoTaskScreen';
import WorkerProfileScreen from '@/components/onboarding/visuals/WorkerProfileScreen';
import FeedScreen from '@/components/onboarding/visuals/FeedScreen';
import TrustScreen from '@/components/storekit/screens/TrustScreen';

/**
 * The picture half of one explainer slide — always the same phone, always a
 * real Joba24 screen inside it:
 *
 *   screenshot      a real capture of the app, at its own aspect ratio
 *   worker-profile  the real profession + city selection
 *   feed            the real task feed with a real task notification
 *   task-card       the real task card, with the apply button highlighted
 *   profile         the real profile screen, with ratings and verification
 */
export default function OnboardingSlideVisual({ slide }) {
  const kind = slide.visual;

  return (
    <PhoneFrame statusBar={kind !== 'screenshot'}>
      {kind === 'worker-profile' ? (
        <WorkerProfileScreen />
      ) : kind === 'feed' ? (
        <FeedScreen />
      ) : kind === 'task-card' ? (
        <DemoTaskScreen />
      ) : kind === 'profile' ? (
        <TrustScreen />
      ) : (
        <ScreenshotScreen src={slide.shot} insetSrc={slide.insetShot} align={slide.align} />
      )}
    </PhoneFrame>
  );
}