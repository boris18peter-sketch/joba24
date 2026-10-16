import ScreenshotShowcase from '@/components/onboarding/ScreenshotShowcase';
import UiStage from '@/components/onboarding/UiStage';
import DemoTaskScreen from '@/components/onboarding/visuals/DemoTaskScreen';
import WorkerProfileScreen from '@/components/onboarding/visuals/WorkerProfileScreen';
import FeedScreen from '@/components/onboarding/visuals/FeedScreen';

/**
 * The picture half of one explainer slide — always real Joba24 UI, always at the
 * largest size the slide can give it:
 *
 *   shots           real captures of the app, at their own aspect ratio
 *   worker-profile  the real profession + city selection, magnified
 *   feed            the real task feed with a real task notification, magnified
 *   task-card       the real task card, with the apply button highlighted
 */
export default function OnboardingSlideVisual({ slide }) {
  if (slide.shots?.length) {
    return <ScreenshotShowcase shots={slide.shots} />;
  }

  if (slide.visual === 'worker-profile') {
    return (
      <UiStage width={393} maxScale={1.7}>
        <WorkerProfileScreen />
      </UiStage>
    );
  }

  if (slide.visual === 'feed') {
    return (
      <UiStage width={440} maxScale={1.5}>
        <FeedScreen />
      </UiStage>
    );
  }

  return (
    <UiStage width={393} maxScale={1.75}>
      <DemoTaskScreen />
    </UiStage>
  );
}