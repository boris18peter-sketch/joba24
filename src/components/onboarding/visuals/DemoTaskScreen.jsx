import AppTopBar from '@/components/storekit/AppTopBar';
import TaskCard from '@/components/TaskCard';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

/**
 * The real task card, rendered with a demo task, with the apply button pulsing —
 * the one action this step teaches.
 *
 * The pulse is applied to the button ELEMENT itself (TaskCard tags it
 * `#onboarding-apply-btn` for the first card), not to a ring drawn at guessed
 * coordinates: that is what keeps the highlight exactly on the button at every
 * screen size and every magnification, and it scales with the illustration.
 *
 * The card is inert (pointer events off): it is an illustration, so tapping it
 * must never open the task sheet or start a real application.
 */
export default function DemoTaskScreen() {
  const task = { ...DEMO_TASKS[0], _isFirstCard: true };

  return (
    <div className="onb-demo">
      <AppTopBar />

      <div style={{ background: 'var(--surface-1)', padding: '12px 12px 16px', pointerEvents: 'none' }}>
        <TaskCard task={task} currentUserId="onboarding-viewer" />
      </div>

      <style>{`
        .onb-demo #onboarding-apply-btn {
          animation: onbApplyPulse 1.9s ease-out infinite;
        }
        @keyframes onbApplyPulse {
          0%   { box-shadow: 0 0 0 0 rgba(26,111,212,0.55), 0 0 0 0 rgba(26,111,212,0.28); }
          70%  { box-shadow: 0 0 0 12px rgba(26,111,212,0), 0 0 0 22px rgba(26,111,212,0); }
          100% { box-shadow: 0 0 0 0 rgba(26,111,212,0), 0 0 0 0 rgba(26,111,212,0); }
        }
      `}</style>
    </div>
  );
}