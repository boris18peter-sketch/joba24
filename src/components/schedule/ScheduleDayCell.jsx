import { roleStyle, densityTint } from '@/lib/scheduleUi';

/**
 * ScheduleDayCell — one day of the month grid.
 *
 * The calendar is the hero of this screen, so a day says three things at a
 * glance without any noise:
 *   · who it is for — a blue dot for work the user performs, orange for work
 *                     they published; both dots when the day carries both
 *   · how busy it is — the tint deepens with the count, and from two jobs on,
 *                      the exact number sits beside the dots
 *   · where "now" is — today is ringed, the selected day is filled
 *
 * Three jobs therefore read visibly heavier than one, without a single badge
 * fighting the date for space on a narrow phone.
 *
 * Purely presentational: it receives the day's already-projected entries.
 */
export default function ScheduleDayCell({ date, entries, isToday, isSelected, onSelect }) {
  const count = entries.length;
  const hasWorker = entries.some((e) => e.role === 'worker');
  const hasClient = entries.some((e) => e.role === 'client');

  const numberColor = isSelected
    ? '#ffffff'
    : isToday
      ? 'var(--brand-primary)'
      : count > 0
        ? 'var(--text-1)'
        : 'var(--text-3)';

  const dot = (role) => (
    <span style={{
      width: 5, height: 5, borderRadius: '50%',
      background: isSelected ? '#ffffff' : roleStyle(role).accent,
    }} />
  );

  return (
    <button
      onClick={onSelect}
      aria-label={`${date.getDate()}${count ? ` · ${count} עבודות` : ''}`}
      style={{
        height: 48, minWidth: 0, borderRadius: 13, cursor: 'pointer',
        border: isSelected
          ? '1.5px solid transparent'
          : isToday
            ? '1.5px solid var(--brand-primary)'
            : '1.5px solid transparent',
        background: isSelected
          ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'
          : densityTint(count),
        boxShadow: isSelected ? '0 4px 14px rgba(26,111,212,0.32)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        transition: 'background 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <span style={{
        fontSize: 14.5, lineHeight: 1,
        fontWeight: isToday || isSelected || count > 0 ? 900 : 500,
        color: numberColor,
      }}>
        {date.getDate()}
      </span>

      <span style={{ display: 'flex', gap: 3, height: 7, alignItems: 'center' }}>
        {hasWorker && dot('worker')}
        {hasClient && dot('client')}
        {count >= 2 && (
          <span style={{
            fontSize: 9.5, fontWeight: 900, lineHeight: 1, marginInlineStart: 1,
            color: isSelected ? '#ffffff' : 'var(--text-2)',
          }}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
}