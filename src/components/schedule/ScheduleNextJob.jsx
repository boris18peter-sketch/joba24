import { MapPin } from 'lucide-react';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { actionableCategoryKey } from '@/lib/brand/categoryRegistry';
import { roleStyle, countdownLabel } from '@/lib/scheduleUi';
import { formatClock } from '@/lib/time';
import ScheduleJobRow from '@/components/schedule/ScheduleJobRow';

/** How many further occurrences follow the hero before they collapse into a count. */
const MAX_COMPACT = 2;

/**
 * ScheduleNextJob — "what's next".
 *
 * The nearest occurrence inside the Upcoming window is promoted to a hero card:
 * when it starts, what it is, where, and which side of the marketplace the user
 * is on. Anything else in the same window follows as compact rows, so the section
 * stays a glance rather than a list.
 *
 * A projection of the entries the page already built — it reads no scheduling
 * rule and invents no data.
 */
export default function ScheduleNextJob({ entries, labelFor, now }) {
  const { openTaskSheet } = useTaskSheet();
  const { map } = useGlobalCategories();

  const next = entries[0];
  const rest = entries.slice(1);
  const shown = rest.slice(0, MAX_COMPACT);
  const hidden = rest.length - shown.length;

  const style = roleStyle(next.role);
  const { task, occurrence } = next;
  const startClock = occurrence.startClock || formatClock(occurrence.start);
  const endClock = occurrence.endClock || '';
  const countdown = countdownLabel(occurrence.start, now);
  const catRow = map?.[actionableCategoryKey(task)] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── Hero: the next job ── */}
      <button
        onClick={() => openTaskSheet(task.id)}
        dir="rtl"
        style={{
          width: '100%', textAlign: 'start', cursor: 'pointer',
          position: 'relative', overflow: 'hidden',
          background: 'var(--brand-card-bg, var(--surface-2))',
          border: '1px solid var(--border-1)', borderRadius: 18,
          padding: '14px 14px 14px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span style={{
          position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
          width: 4, background: style.accent,
        }} />

        {/* When */}
        <div style={{ flexShrink: 0, width: 66, textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, fontWeight: 900, color: style.text, lineHeight: 1.2 }}>
            {countdown || labelFor(next.day)}
          </div>
          <div style={{ fontSize: 23, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1, letterSpacing: '-0.5px', marginTop: 1 }}>
            {startClock}
          </div>
          {endClock && (
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, marginTop: 1 }}>עד {endClock}</div>
          )}
        </div>

        <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-1)', flexShrink: 0 }} />

        {/* What */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 15.5, fontWeight: 900, color: 'var(--text-1)', flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {task.title}
            </span>
            <span style={{
              flexShrink: 0, padding: '3px 9px', borderRadius: 99,
              fontSize: 10, fontWeight: 900,
              background: style.tint, border: `1px solid ${style.border}`, color: style.text,
            }}>
              {style.label}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 5,
            fontSize: 11.5, color: 'var(--text-2)', minWidth: 0,
          }}>
            {catRow && (
              <span style={{ flexShrink: 0 }}>{catRow.icon} {catRow.label}</span>
            )}
            {task.location_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                <MapPin size={11} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
              </span>
            )}
            <span style={{ fontWeight: 800, flexShrink: 0 }}>₪{task.price}</span>
          </div>
        </div>
      </button>

      {/* ── Everything else in the window ── */}
      {shown.map((entry) => (
        <ScheduleJobRow
          key={entry.id}
          entry={entry}
          showDay
          compact
          dayLabel={labelFor(entry.day)}
        />
      ))}

      {hidden > 0 && (
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-3)', padding: '2px 0' }}>
          ועוד {hidden} עבודות קרובות
        </div>
      )}
    </div>
  );
}