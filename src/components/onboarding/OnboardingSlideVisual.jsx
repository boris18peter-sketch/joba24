import UiStage from '@/components/onboarding/UiStage';
import TaskDraftScreen from '@/components/onboarding/visuals/TaskDraftScreen';
import PricePreviewScreen from '@/components/onboarding/visuals/PricePreviewScreen';
import ApplicantsScreen from '@/components/onboarding/visuals/ApplicantsScreen';
import WorkerProfileScreen from '@/components/onboarding/visuals/WorkerProfileScreen';
import FeedScreen from '@/components/onboarding/visuals/FeedScreen';
import TaskDetailScreen from '@/components/onboarding/visuals/TaskDetailScreen';

/**
 * The picture half of one explainer slide.
 *
 * Everything here is the app's OWN design: the real components laid out
 * statically at the app's real logical width, so every screen shows exactly the
 * interface the visitor is about to use — same fields, same colours, same
 * typography. All of it is rendered inside the same preview frame, so the six
 * screens keep one look, and all of it follows Light/Dark mode the way the live
 * interface does.
 *
 * Every illustration is laid out at the SAME logical width (360 — the most
 * common real phone width), so the type inside them ends up the same size on
 * every screen and the six read as one flow.
 *
 *   task-draft      the publish form's description + location, filled in
 *   price           the price field with the AI recommendation
 *   applicants      the applicants list, with the choose-performer decision
 *   worker-profile  the real profession + city selection
 *   feed            the real task feed with the app's own task notification
 *   task-detail     the real task screen, with the apply button
 */
const WIDTH = 360;

export default function OnboardingSlideVisual({ slide }) {
  switch (slide.visual) {
    case 'price':
      return <UiStage width={WIDTH}><PricePreviewScreen /></UiStage>;
    case 'applicants':
      return <UiStage width={WIDTH}><ApplicantsScreen /></UiStage>;
    case 'worker-profile':
      return <UiStage width={WIDTH}><WorkerProfileScreen /></UiStage>;
    case 'feed':
      return <UiStage width={WIDTH}><FeedScreen /></UiStage>;
    case 'task-detail':
      return <UiStage width={WIDTH}><TaskDetailScreen /></UiStage>;
    default:
      return <UiStage width={WIDTH}><TaskDraftScreen /></UiStage>;
  }
}