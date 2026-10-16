import AppTopBar from '@/components/storekit/AppTopBar';
import TaskCard from '@/components/TaskCard';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

/**
 * The real task card, rendered with a demo task, with a pulsing highlight on the
 * "הגש מועמדות" button — the one action this step teaches.
 *
 * The card is inert (pointer events off): it is an illustration, so tapping it
 * must never open the task sheet or start a real application.
 */
export default function DemoTaskScreen() {
  return (
    <>
      <AppTopBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: '12px 12px 0' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ pointerEvents: 'none' }}>
            <TaskCard task={DEMO_TASKS[0]} currentUserId="onboarding-viewer" />
          </div>

          {/* Highlight ring over the apply button */}
          <span
            style={{
              position: 'absolute',
              left: 12,
              bottom: 34,
              width: 136,
              height: 46,
              borderRadius: 14,
              border: '2.5px solid var(--brand-primary)',
              pointerEvents: 'none',
              animation: 'onbApplyPulse 1.9s ease-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes onbApplyPulse {
          0%   { box-shadow: 0 0 0 0 rgba(26,111,212,0.50), 0 0 0 0 rgba(26,111,212,0.30); }
          70%  { box-shadow: 0 0 0 13px rgba(26,111,212,0), 0 0 0 24px rgba(26,111,212,0); }
          100% { box-shadow: 0 0 0 0 rgba(26,111,212,0), 0 0 0 0 rgba(26,111,212,0); }
        }
      `}</style>
    </>
  );
}