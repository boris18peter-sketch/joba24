import { useMemo, useState } from 'react';
import { CalendarDays, CalendarClock } from 'lucide-react';
import { useMyScheduleTasks } from '@/hooks/useMyScheduleTasks';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { scheduleWindows } from '@/lib/scheduling';
import { buildScheduleEntries, upcomingEntries, groupByDay, dateKey } from '@/lib/scheduleEntries';
import { formatWhen } from '@/lib/time';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import ScheduleJobRow from '@/components/schedule/ScheduleJobRow';
import { useLanguage } from '@/lib/LanguageContext';

const WEEKDAYS_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
const MONTHS_HE = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];

function dayTitle(dayKey, todayKey, tomorrowKey) {
  if (dayKey === todayKey) return 'היום';
  if (dayKey === tomorrowKey) return 'מחר';
  const d = new Date(`${dayKey}T00:00:00`);
  if (isNaN(d.getTime())) return dayKey;
  return `${WEEKDAYS_HE[d.getDay()]}, ${d.getDate()} ${MONTHS_HE[d.getMonth()]}`;
}

/**
 * MySchedule — the Job Calendar.
 *
 * One calendar for BOTH sides of the marketplace: the jobs the user published
 * and the jobs they were hired for, each with a clear role indicator. Everything
 * shown is a projection of existing Tasks — there is no CalendarTask.
 */
export default function MySchedule() {
  const { isRTL } = useLanguage();
  const { tasks, meId, isLoading } = useMyScheduleTasks();
  const { settings } = useJobaSettings();
  const windows = scheduleWindows(settings);
  const horizonHours = windows.upcoming_visibility_hours;

  const todayKey = dateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow);

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(todayKey);

  const entries = useMemo(() => buildScheduleEntries(tasks, meId), [tasks, meId]);
  const entriesByDay = useMemo(() => groupByDay(entries), [entries]);
  const upcoming = useMemo(
    () => upcomingEntries(entries, Date.now(), scheduleWindows(settings)),
    [entries, horizonHours]
  );

  const selectedEntries = entriesByDay.get(selectedDay) || [];

  const jumpToToday = () => {
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(todayKey);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', minHeight: '100%', paddingBottom: 24 }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 12px',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(26,111,212,0.3)',
        }}>
          <CalendarDays size={19} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.15 }}>יומן עבודות</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 1 }}>העבודות שאתה מפרסם ואתה מבצע</div>
        </div>
        <button onClick={jumpToToday} style={{
          height: 32, padding: '0 12px', borderRadius: 10, cursor: 'pointer',
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          color: 'var(--text-2)', fontSize: 12, fontWeight: 800, flexShrink: 0,
        }}>
          היום
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 62, borderRadius: 14, background: 'var(--surface-3)', opacity: 0.6 }} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Upcoming — the near-term window, not the whole future ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <CalendarClock size={14} color="var(--brand-primary)" />
              <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)' }}>
                בקרוב
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                · {windows.upcoming_visibility_hours} השעות הקרובות
              </span>
            </div>
            {upcoming.length === 0 ? (
              <div style={{
                background: 'var(--brand-card-bg, var(--surface-2))', border: '1px dashed var(--border-2)',
                borderRadius: 14, padding: '14px 16px', textAlign: 'center',
                fontSize: 12, color: 'var(--text-3)',
              }}>
                אין עבודות מתוכננות ב-{windows.upcoming_visibility_hours} השעות הקרובות
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map((entry) => (
                  <ScheduleJobRow
                    key={entry.id}
                    entry={entry}
                    showDay
                    dayLabel={dayTitle(entry.day, todayKey, tomorrowKey)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Calendar ── */}
          <section>
            <ScheduleCalendar
              monthCursor={monthCursor}
              onMonthChange={setMonthCursor}
              entriesByDay={entriesByDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </section>

          {/* ── The selected day ── */}
          <section>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>
              {dayTitle(selectedDay, todayKey, tomorrowKey)}
              {selectedEntries.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}> · {selectedEntries.length} עבודות</span>
              )}
            </div>
            {selectedEntries.length === 0 ? (
              <div style={{
                background: 'var(--brand-card-bg, var(--surface-2))', border: '1px dashed var(--border-2)',
                borderRadius: 14, padding: '14px 16px', textAlign: 'center',
                fontSize: 12, color: 'var(--text-3)',
              }}>
                אין עבודות ביום הזה
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedEntries.map((entry) => (
                  <ScheduleJobRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}