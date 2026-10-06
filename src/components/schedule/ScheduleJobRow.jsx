import { Briefcase, User, MapPin } from 'lucide-react';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { formatClock } from '@/lib/time';

/**
 * ScheduleJobRow — one OCCURRENCE of an existing Task.
 *
 * Tapping it opens the SAME Task sheet the rest of the app uses, so a job in the
 * calendar is the task itself and never a parallel copy.
 */
export default function ScheduleJobRow({ entry, showDay = false, dayLabel = '' }) {
  const { openTaskSheet } = useTaskSheet();
  const { task, occurrence, role, phase } = entry;

  const isClient = role === 'client';
  const startClock = occurrence.startClock || formatClock(occurrence.start);
  const endClock = occurrence.endClock || '';

  return (
    <button
      onClick={() => openTaskSheet(task.id)}
      dir="rtl"
      style={{
        width: '100%', textAlign: 'start', cursor: 'pointer',
        background: 'var(--brand-card-bg, var(--surface-2))',
        border: '1px solid var(--border-1)',
        borderRadius: 14, padding: '11px 12px',
        display: 'flex', alignItems: 'center', gap: 11,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Time column */}
      <div style={{
        flexShrink: 0, width: 54, textAlign: 'center',
        background: phase === 'active' ? 'var(--color-success-bg)' : 'var(--surface-3)',
        border: `1px solid ${phase === 'active' ? 'var(--color-success-border)' : 'var(--border-1)'}`,
        borderRadius: 11, padding: '6px 0',
      }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1 }}>{startClock}</div>
        {endClock && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{endClock}</div>}
      </div>

      {/* Job */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showDay && dayLabel && (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 2 }}>{dayLabel}</div>
        )}
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontSize: 11, color: 'var(--text-2)' }}>
          <span style={{ fontWeight: 800 }}>₪{task.price}</span>
          {task.location_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
              <MapPin size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Role indicator — the same calendar serves both sides */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', borderRadius: 99, fontSize: 10.5, fontWeight: 800,
        background: isClient ? 'var(--color-warning-bg)' : 'var(--brand-primary-light)',
        border: `1px solid ${isClient ? 'var(--color-warning-border)' : 'var(--border-2)'}`,
        color: isClient ? 'var(--color-warning)' : 'var(--brand-primary)',
      }}>
        {isClient ? <User size={11} /> : <Briefcase size={11} />}
        {isClient ? 'מפרסם' : 'עובד'}
      </div>
    </button>
  );
}