import AppTopBar from '@/components/storekit/AppTopBar';
import TaskCard from '@/components/TaskCard';
import { CATEGORIES } from '@/lib/categories';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

const FEED_CHIPS = ['cleaning', 'moving', 'handyman', 'pets', 'delivery', 'tutoring'];

/**
 * FRAME 02 — "רוצים להרוויח?"
 * The real nearby-tasks feed: real category chips built from the app's own
 * category list, above real task cards showing real prices and distances.
 */
export default function FindTasksScreen() {
  return (
    <>
      <AppTopBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)' }}>
        <div
          style={{
            display: 'flex',
            gap: 7,
            overflow: 'hidden',
            padding: '10px 12px 8px',
            background: 'var(--surface-2)',
            boxShadow: '0 1px 0 var(--border-1)',
          }}
        >
          {FEED_CHIPS.map(value => {
            const cat = CATEGORIES.find(c => c.value === value);
            return (
              <span
                key={value}
                style={{
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: 'var(--surface-3)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border-1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat?.label || value}
              </span>
            );
          })}
        </div>

        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_TASKS.slice(0, 2).map(task => (
            <TaskCard key={task.id} task={task} currentUserId="store-viewer" />
          ))}
        </div>
      </div>
    </>
  );
}