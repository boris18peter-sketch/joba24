import { MapPin } from 'lucide-react';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { formatClock } from '@/lib/time';
import { roleStyle } from '@/lib/scheduleUi';

/**
 * ScheduleJobRow — one OCCURRENCE of an existing Task.
 *
 * Tapping it opens the SAME Task sheet the rest of the app uses, so a job in the
 * calendar is the task itself and never a parallel copy. The role accent and
 * badge carry the same blue/orange language as the calendar and the hero card.
 */
export default function ScheduleJobRow({ entry, showDay = false, dayLabel = '', compact = false }) {
  const { openTaskSheet } = useTaskSheet();
  const { task, occurrence, role } = entry;
  const style = roleStyle(role);

  const startClock = occurrence.startClock || formatClock(occurrence.start);
  const endClock = occurrence.endClock || '';

  return (
    <button
      onClick={() => openTaskSheet(task.id)}
      dir="rtl"
      style={{
        width: '100%', textAlign: 'start', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        background: 'var(--brand-card-bg, var(--surface-2))',
        border: '1px solid var(--border-1)',
        borderRadius: 15,
        padding: compact ? '9px 12px' : '12px 12px 12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Role accent — the colour language, at the edge of the card */}
      <span style={{
        position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
        width: 3.5, background: style.accent,
      }} />

      {/* Time */}
      <div style={{ flexShrink: 0, width: 54, textAlign: 'center' }}>
        <div style={{ fontSize: compact ? 14 : 15.5, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1 }}>
          {startClock}
        </div>
        {endClock && (
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, marginTop: 1 }}>{endClock}</div>
        )}
      </div>

      <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-1)', flexShrink: 0 }} />

      {/* Job */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showDay && dayLabel && (
          <div style={{ fontSize: 10.5, fontWeight: 900, color: style.text, marginBottom: 2 }}>{dayLabel}</div>
        )}
        <div style={{
          fontSize: compact ? 13.5 : 14.5, fontWeight: 800, color: 'var(--text-1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
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

      {/* Role badge */}
      <span style={{
        flexShrink: 0, padding: '4px 10px', borderRadius: 99,
        fontSize: 10.5, fontWeight: 900,
        background: style.tint, border: `1px solid ${style.border}`, color: style.text,
      }}>
        {style.label}
      </span>
    </button>
  );
}