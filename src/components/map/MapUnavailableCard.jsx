import TaskNavButtons from '@/components/map/TaskNavButtons';

/**
 * MapUnavailableCard — a task's location when there is no map to draw.
 *
 * It shows the navigation bar and NOTHING ELSE: the same two buttons, in the
 * same bar, in the same place, as the map's own bottom row. No icon, no title,
 * no address line, no explanatory note — the buttons are the whole answer, and
 * they must look exactly like the ones the user already knows from the map.
 */
export default function MapUnavailableCard({ task, height = 220, fullScreen = false }) {
  const address = [task?.location_name, task?.city].filter(Boolean).join(', ');

  return (
    <div style={{
      minHeight: fullScreen ? '100dvh' : height,
      background: 'var(--surface-2)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      boxSizing: 'border-box',
      paddingBottom: fullScreen ? 'env(safe-area-inset-bottom)' : 0,
    }}>
      <div style={{ borderTop: '1px solid var(--border-1)', padding: '8px 10px' }}>
        <TaskNavButtons lat={task?.lat} lng={task?.lng} locationName={address} />
      </div>
    </div>
  );
}