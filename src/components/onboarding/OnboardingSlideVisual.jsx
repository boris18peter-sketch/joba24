import ScreenshotShowcase from '@/components/onboarding/ScreenshotShowcase';
import UiStage from '@/components/onboarding/UiStage';
import TaskDraftScreen from '@/components/onboarding/visuals/TaskDraftScreen';
import PricePreviewScreen from '@/components/onboarding/visuals/PricePreviewScreen';
import WorkerProfileScreen from '@/components/onboarding/visuals/WorkerProfileScreen';
import FeedScreen from '@/components/onboarding/visuals/FeedScreen';
import DemoTaskScreen from '@/components/onboarding/visuals/DemoTaskScreen';

/**
 * The picture half of one explainer slide.
 *
 * Everything here is the app's OWN design — either a real capture of it, or the
 * real components laid out statically at the app's real logical width. Both are
 * rendered inside the same preview frame, so every slide keeps one look, and
 * both follow Light/Dark mode the way the live interface does.
 *
 *   shots           real captures of the app, shown whole
 *   task-draft      the publish form, filled in
 *   price           the price step, with the AI suggestion
 *   worker-profile  the real profession + city selection
 *   feed            the real task feed with the app's own task notification
 *   task-card       the real task card, with the apply button highlighted
 */
export default function OnboardingSlideVisual({ slide }) {
  if (slide.shots?.length) {
    return <ScreenshotShowcase shots={slide.shots} />;
  }

  switch (slide.visual) {
    case 'task-draft':
      return (
        <UiStage width={393}>
          <TaskDraftScreen />
        </UiStage>
      );
    case 'price':
      return (
        <UiStage width={393}>
          <PricePreviewScreen />
        </UiStage>
      );
    case 'worker-profile':
      return (
        <UiStage width={393}>
          <WorkerProfileScreen />
        </UiStage>
      );
    case 'feed':
      return (
        <UiStage width={440}>
          <FeedScreen />
        </UiStage>
      );
    default:
      return (
        <UiStage width={393}>
          <DemoTaskScreen />
        </UiStage>
      );
  }
}