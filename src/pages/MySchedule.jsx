import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyScheduleTasks } from '@/hooks/useMyScheduleTasks';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { scheduleWindows } from '@/lib/scheduling';
import { buildScheduleEntries, upcomingEntries, groupByDay, dateKey } from '@/lib/scheduleEntries';
import { useScheduleClock } from '@/hooks/useScheduleClock';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import ScheduleJobRow from '@/components/schedule/ScheduleJobRow';
import ScheduleNextJob from '@/components/schedule/ScheduleNextJob';
import { useLanguage } from '@/lib/LanguageContext';

const WEEKDAYS_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
const MONTHS_HE = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];

/** Short label for a row that already shows its own time: 'היום' / 'מחר' / 'יום שישי, 9 באוקטובר'. */
function dayTitle(dayKey, todayKey, tomorrowKey) {
  if (dayKey === todayKey) return 'היום';
  if (dayKey === tomorrowKey) return 'מחר';
  const d = new Date(`${dayKey}T00:00:00`);
  if (isNaN(d.getTime())) return dayKey;
  return `${WEEKDAYS_HE[d.getDay()]}, ${d.getDate()} ${MONTHS_HE[d.getMonth()]}`;
}

/** The agenda's heading — always dated, with the relative word when there is one. */
function agendaTitle(dayKey, todayKey, tomorrowKey) {
  const d = new Date(`${dayKey}T00:00:00`);
  if (isNaN(d.getTime())) return dayKey;
  const datePart = `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`;
  if (dayKey === todayKey) return `היום · ${datePart}`;
  if (dayKey === tomorrowKey) return `מחר · ${datePart}`;
  return `${WEEKDAYS_HE[d.getDay()]}, ${datePart}`;
}

/**
 * MySchedule — the Job Calendar.
 *
 * One calendar for BOTH sides of the marketplace: the jobs the user published
 * and the jobs they were hired for, each with a clear role indicator. Everything
 * shown is a projection of existing Tasks — there is no CalendarTask.
 *
 * The screen reads top-to-bottom as one story: the month (where the work is),
 * what's next (what is imminent), and the selected day (what it holds).
 */
export default function MySchedule() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
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

  // Live clock — re-renders exactly when a job crosses into the upcoming or
  // execution window. No polling, no manual reload.
  const now = useScheduleClock(tasks, windows);

  const entries = useMemo(() => buildScheduleEntries(tasks, meId, now), [tasks, meId, now]);
  const entriesByDay = useMemo(() => groupByDay(entries), [entries]);
  const upcoming = useMemo(
    () => upcomingEntries(entries, now, windows),
    [entries, now, horizonHours]
  );

  const selectedEntries = entriesByDay.get(selectedDay) || [];

  const labelFor = useCallback(
    (dayKey) => dayTitle(dayKey, todayKey, tomorrowKey),
    [todayKey, tomorrowKey]
  );

  const jumpToToday = () => {
    const nowDate = new Date();
    setMonthCursor(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1));
    setSelectedDay(todayKey);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--surface-1)', minHeight: '100%', paddingBottom: 28 }}>
      {/* Slim page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px 8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.15 }}>יומן עבודות</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>העבודות שאתה מפרסם ואתה מבצע</div>
        </div>
        <button
          onClick={jumpToToday}
          style={{
            height: 32, padding: '0 13px', borderRadius: 99, cursor: 'pointer', flexShrink: 0,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            color: 'var(--text-2)', fontSize: 12, fontWeight: 900,
          }}
        >
          היום
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 320, borderRadius: 20, background: 'var(--surface-3)', opacity: 0.55 }} />
          <div style={{ height: 76, borderRadius: 18, background: 'var(--surface-3)', opacity: 0.55 }} />
          <div style={{ height: 66, borderRadius: 15, background: 'var(--surface-3)', opacity: 0.55 }} />
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── The month — the hero ── */}
          <ScheduleCalendar
            monthCursor={monthCursor}
            onMonthChange={setMonthCursor}
            entriesByDay={entriesByDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />

          {/* ── What's next — the near-term window, not the whole future ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8, padding: '0 2px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--text-1)' }}>
                {upcoming.length > 0 ? 'העבודה הבאה שלך' : 'בקרוב'}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)' }}>
                {horizonHours} השעות הקרובות
              </span>
            </div>

            {upcoming.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                background: 'var(--brand-card-bg, var(--surface-2))',
                border: '1px solid var(--border-1)', borderRadius: 14, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600 }}>אין עבודות קרובות כרגע</span>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    height: 30, padding: '0 12px', borderRadius: 99, cursor: 'pointer', flexShrink: 0,
                    background: 'var(--brand-primary-light)', border: 'none',
                    color: 'var(--brand-primary)', fontSize: 11.5, fontWeight: 900,
                  }}
                >
                  מצא עבודה
                </button>
              </div>
            ) : (
              <ScheduleNextJob entries={upcoming} labelFor={labelFor} now={now} />
            )}
          </section>

          {/* ── The selected day ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, padding: '0 2px' }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>
                {agendaTitle(selectedDay, todayKey, tomorrowKey)}
              </span>
              {selectedEntries.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {selectedEntries.length} עבודות
                </span>
              )}
            </div>

            {selectedEntries.length === 0 ? (
              <div style={{
                background: 'var(--brand-card-bg, var(--surface-2))',
                border: '1px solid var(--border-1)', borderRadius: 14,
                padding: '12px 14px', textAlign: 'center',
                fontSize: 12, color: 'var(--text-3)', fontWeight: 600,
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