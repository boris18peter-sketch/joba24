import PhoneFrame from '@/components/onboarding/PhoneFrame';
import ScreenshotScreen from '@/components/onboarding/visuals/ScreenshotScreen';
import DemoTaskScreen from '@/components/onboarding/visuals/DemoTaskScreen';
import TrustScreen from '@/components/storekit/screens/TrustScreen';

/**
 * The picture half of one explainer slide.
 *
 * Three kinds, all inside the same phone frame:
 *   screenshot — a real capture of the Joba24 screen for that step
 *   task-card  — the real task card component, with the apply button highlighted
 *   profile    — the real profile screen, with ratings and verification
 */
export default function OnboardingSlideVisual({ slide }) {
  return (
    <PhoneFrame statusBar={slide.visual !== 'screenshot'}>
      {slide.visual === 'task-card' ? (
        <DemoTaskScreen />
      ) : slide.visual === 'profile' ? (
        <TrustScreen />
      ) : (
        <ScreenshotScreen src={slide.shot} insetSrc={slide.insetShot} />
      )}
    </PhoneFrame>
  );
}