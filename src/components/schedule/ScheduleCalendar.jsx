import { ChevronRight, ChevronLeft } from 'lucide-react';
import { dateKey } from '@/lib/scheduleEntries';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/**
 * ScheduleCalendar — the month view of the Job Calendar.
 *
 * Purely presentational: it receives the entries already projected from Tasks
 * and reports which day the user picked. It owns no data of its own.
 */
export default function ScheduleCalendar({ monthCursor, onMonthChange, entriesByDay, selectedDay, onSelectDay }) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const todayKey = dateKey(new Date());

  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta) => onMonthChange(new Date(year, month + delta, 1));

  return (
    <div dir="rtl" style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      border: '1px solid var(--border-1)', borderRadius: 16,
      padding: '12px 10px 10px', boxShadow: 'var(--shadow-xs)',
    }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
        <button onClick={() => shiftMonth(-1)} aria-label="חודש קודם" className="j-icon-btn"
          style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={16} color="var(--text-2)" />
        </button>
        <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--text-1)' }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={() => shiftMonth(1)} aria-label="חודש הבא" className="j-icon-btn"
          style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={16} color="var(--text-2)" />
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty_${idx}`} style={{ height: 42 }} />;
          const key = dateKey(date);
          const dayEntries = entriesByDay.get(key) || [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;
          const hasClient = dayEntries.some((e) => e.role === 'client');
          const hasWorker = dayEntries.some((e) => e.role === 'worker');

          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              style={{
                height: 42, borderRadius: 11, cursor: 'pointer', position: 'relative',
                border: isSelected
                  ? '1.5px solid var(--brand-primary)'
                  : isToday ? '1.5px solid var(--border-2)' : '1.5px solid transparent',
                background: isSelected ? 'var(--brand-primary-light)' : 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: isToday || isSelected ? 900 : 600,
                color: isSelected ? 'var(--brand-primary)' : isToday ? 'var(--text-1)' : 'var(--text-2)',
                lineHeight: 1,
              }}>
                {date.getDate()}
              </span>
              {dayEntries.length > 0 && (
                <span style={{ display: 'flex', gap: 2, height: 5, alignItems: 'center' }}>
                  {hasWorker && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand-primary)' }} />}
                  {hasClient && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-warning)' }} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-primary)' }} /> עבודה שאני מבצע
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)' }} /> עבודה שפרסמתי
        </span>
      </div>
    </div>
  );
}