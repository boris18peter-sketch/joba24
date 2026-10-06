import { roleStyle, densityTint } from '@/lib/scheduleUi';

/**
 * ScheduleDayCell — one day of the month grid.
 *
 * The calendar is the hero of this screen, so a day says three things at a
 * glance without any noise:
 *   · how busy it is  — the tint deepens with the count, and 2+ jobs get a badge
 *   · who it is for   — a blue dot for work the user performs, orange for work
 *                       they published; both dots when the day carries both
 *   · where "now" is  — today is ringed, the selected day is filled
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

  return (
    <button
      onClick={onSelect}
      aria-label={`${date.getDate()}${count ? ` · ${count} עבודות` : ''}`}
      style={{
        height: 46, minWidth: 0, borderRadius: 13, cursor: 'pointer', position: 'relative',
        border: isSelected
          ? '1.5px solid transparent'
          : isToday
            ? '1.5px solid var(--brand-primary)'
            : '1.5px solid transparent',
        background: isSelected
          ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'
          : densityTint(count),
        boxShadow: isSelected ? '0 4px 14px rgba(26,111,212,0.32)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        transition: 'background 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Exact count — three jobs must read heavier than one */}
      {count >= 2 && (
        <span style={{
          position: 'absolute', top: 3, insetInlineEnd: 3,
          minWidth: 15, height: 15, padding: '0 3px', borderRadius: 99,
          background: isSelected ? 'rgba(255,255,255,0.95)' : 'var(--brand-primary)',
          color: isSelected ? 'var(--brand-primary)' : '#ffffff',
          fontSize: 9.5, fontWeight: 900, lineHeight: '15px', textAlign: 'center',
        }}>
          {count}
        </span>
      )}

      <span style={{
        fontSize: 14, lineHeight: 1,
        fontWeight: isToday || isSelected || count > 0 ? 900 : 500,
        color: numberColor,
      }}>
        {date.getDate()}
      </span>

      <span style={{ display: 'flex', gap: 3, height: 5, alignItems: 'center' }}>
        {hasWorker && (
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isSelected ? '#ffffff' : roleStyle('worker').accent,
          }} />
        )}
        {hasClient && (
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isSelected ? '#ffffff' : roleStyle('client').accent,
          }} />
        )}
      </span>
    </button>
  );
}