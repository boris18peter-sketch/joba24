import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronLeft } from 'lucide-react';
import { useMyScheduleTasks } from '@/hooks/useMyScheduleTasks';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { scheduleWindows } from '@/lib/scheduling';
import { buildScheduleEntries, upcomingEntries } from '@/lib/scheduleEntries';
import { formatWhen } from '@/lib/time';

/**
 * ScheduleUpcomingCard — the small "coming up" strip on the Home feed.
 *
 * Deliberately SEPARATE from the Active Task banner: the active banner is a job
 * in execution, this is only a heads-up that something is planned. It renders
 * nothing when there is nothing inside the Upcoming window, so a user with no
 * near-term jobs never sees an empty box.
 */
export default function ScheduleUpcomingCard() {
  const navigate = useNavigate();
  const { tasks, meId } = useMyScheduleTasks();
  const { settings } = useJobaSettings();
  const windows = scheduleWindows(settings);
  const horizonHours = windows.upcoming_visibility_hours;

  const upcoming = useMemo(
    () => upcomingEntries(buildScheduleEntries(tasks, meId), Date.now(), scheduleWindows(settings)),
    [tasks, meId, horizonHours]
  );

  if (!upcoming.length) return null;

  const next = upcoming[0];
  const isClient = next.role === 'client';

  return (
    <div style={{ padding: '10px 16px 0' }}>
    <button
      onClick={() => navigate('/schedule')}
      dir="rtl"
      style={{
        width: '100%', textAlign: 'start', cursor: 'pointer',
        background: 'var(--brand-card-bg, var(--surface-2))',
        border: '1px solid var(--border-1)',
        borderRadius: 14, padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CalendarClock size={17} color="var(--brand-primary)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', marginBottom: 1 }}>
          בקרוב · {isClient ? 'כמפרסם' : 'כעובד'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {next.task.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>
          {formatWhen(next.occurrence.start)}
          {upcoming.length > 1 && ` · ועוד ${upcoming.length - 1}`}
        </div>
      </div>

      <ChevronLeft size={16} color="var(--text-3)" style={{ flexShrink: 0 }} />
    </button>
    </div>
  );
}