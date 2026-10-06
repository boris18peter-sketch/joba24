import { ChevronRight, ChevronLeft } from 'lucide-react';
import { dateKey } from '@/lib/scheduleEntries';
import { roleStyle } from '@/lib/scheduleUi';
import ScheduleDayCell from '@/components/schedule/ScheduleDayCell';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const NAV_BTN = {
  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
  background: 'var(--surface-3)', border: '1px solid var(--border-1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

/**
 * ScheduleCalendar — the month view, and the hero of this screen.
 *
 * Purely presentational: it receives entries already projected from Tasks and
 * reports which day the user picked. It owns no data of its own, and reads no
 * scheduling rule — the phase each entry carries was decided upstream.
 *
 * The month itself is the reward: a busy month reads denser through tint and
 * counts alone, with no gamification layered on top.
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

  // How full the month is, at a glance.
  let monthJobs = 0;
  let monthDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const count = (entriesByDay.get(dateKey(new Date(year, month, day))) || []).length;
    if (count > 0) {
      monthJobs += count;
      monthDays += 1;
    }
  }

  const shiftMonth = (delta) => onMonthChange(new Date(year, month + delta, 1));

  return (
    <div dir="rtl" style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      border: '1px solid var(--border-1)', borderRadius: 20,
      padding: '14px 12px 12px', boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Month navigation — clear, but deliberately secondary to the content */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
        <button onClick={() => shiftMonth(-1)} aria-label="חודש קודם" className="j-icon-btn" style={NAV_BTN}>
          <ChevronRight size={17} color="var(--text-2)" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1 }}>
            {MONTHS[month]} {year}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginTop: 2 }}>
            {monthJobs === 0 ? 'אין עבודות החודש' : `${monthJobs} עבודות · ${monthDays} ימים`}
          </div>
        </div>

        <button onClick={() => shiftMonth(1)} aria-label="חודש הבא" className="j-icon-btn" style={NAV_BTN}>
          <ChevronLeft size={17} color="var(--text-2)" />
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 5 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty_${idx}`} style={{ height: 46 }} />;
          const key = dateKey(date);
          return (
            <ScheduleDayCell
              key={key}
              date={date}
              entries={entriesByDay.get(key) || []}
              isToday={key === todayKey}
              isSelected={key === selectedDay}
              onSelect={() => onSelectDay(key)}
            />
          );
        })}
      </div>

      {/* Legend — the same two colours the whole screen uses */}
      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center',
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-1)',
      }}>
        {['worker', 'client'].map((role) => (
          <span key={role} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, color: 'var(--text-2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: roleStyle(role).accent }} />
            {roleStyle(role).label}
          </span>
        ))}
      </div>
    </div>
  );
}