import AppTopBar from '@/components/storekit/AppTopBar';
import PublishTaskBanner from '@/components/PublishTaskBanner';
import TaskCard from '@/components/TaskCard';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

/**
 * FRAME 01 — "צריכים עזרה?"
 * The real publish-task entry: the live PublishTaskBanner (with the real
 * available-people count) sitting above a real task card from the feed.
 */
export default function NeedHelpScreen() {
  return (
    <>
      <AppTopBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)' }}>
        <PublishTaskBanner />
        <div style={{ padding: '0 12px' }}>
          <TaskCard task={DEMO_TASKS[0]} currentUserId="store-viewer" />
        </div>
      </div>
    </>
  );
}