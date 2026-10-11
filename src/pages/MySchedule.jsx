import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useMyScheduleTasks } from '@/hooks/useMyScheduleTasks';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { scheduleWindows } from '@/lib/scheduling';
import { buildScheduleEntries, groupByDay, dateKey } from '@/lib/scheduleEntries';
import { useScheduleClock } from '@/hooks/useScheduleClock';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import ScheduleJobRow from '@/components/schedule/ScheduleJobRow';
import { useLanguage } from '@/lib/LanguageContext';

const WEEKDAYS_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
const MONTHS_HE = ['בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני', 'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'];

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
 * The screen is deliberately ONE scroll: the month on top, then a single
 * chronological agenda from today onward. There is no second list duplicating
 * the first, so nothing is ever out of reach — and tapping a day in the month
 * simply jumps to that day inside the same list.
 */
export default function MySchedule() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { tasks, meId, isLoading } = useMyScheduleTasks();
  const { settings } = useJobaSettings();
  const windows = scheduleWindows(settings);

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

  // Every day from today onward that holds work, earliest first. Past days stay
  // off the agenda — the month grid already shows them.
  const agendaDays = useMemo(
    () => [...entriesByDay.keys()].filter((key) => key >= todayKey).sort(),
    [entriesByDay, todayKey]
  );

  const agendaCount = useMemo(
    () => agendaDays.reduce((total, key) => total + (entriesByDay.get(key)?.length || 0), 0),
    [agendaDays, entriesByDay]
  );

  // Refs to each day block so tapping a calendar day can bring it into view
  // inside the page's own scroll container.
  const dayRefs = useRef({});
  const jumpToDay = useCallback((key) => {
    setSelectedDay(key);
    const el = dayRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const jumpToToday = () => {
    const nowDate = new Date();
    setMonthCursor(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1));
    jumpToDay(todayKey);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ background: 'var(--surface-1)', flexShrink: 0, paddingBottom: 28 }}
    >
      {/* Slim page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(26,111,212,0.3)',
          }}>
            <CalendarDays size={18} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.15 }}>יומן עבודות</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>מה שאתה מפרסם ומה שאתה מבצע</div>
          </div>
        </div>
        <button
          onClick={jumpToToday}
          style={{
            height: 32, padding: '0 14px', borderRadius: 99, cursor: 'pointer', flexShrink: 0,
            background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)',
            color: 'var(--brand-primary)', fontSize: 12, fontWeight: 900,
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
            onSelectDay={jumpToDay}
          />

          {/* ── The agenda — one continuous list from today forward ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10, padding: '0 2px' }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>העבודות שלי</span>
              {agendaCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {agendaCount} עבודות מתוכננות
                </span>
              )}
            </div>

            {agendaDays.length === 0 ? (
              <div style={{
                background: 'var(--brand-card-bg, var(--surface-2))',
                border: '1px solid var(--border-1)', borderRadius: 16,
                padding: '22px 18px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>📅</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 }}>
                  אין עבודות מתוכננות
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                  עבודות שתפרסם או שתבצע יופיעו כאן
                </div>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    height: 34, padding: '0 16px', borderRadius: 99, cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
                    border: 'none', color: '#ffffff', fontSize: 12.5, fontWeight: 900,
                    boxShadow: '0 4px 14px rgba(26,111,212,0.28)',
                  }}
                >
                  מצא עבודה
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {agendaDays.map((dayKey) => {
                  const dayEntries = entriesByDay.get(dayKey) || [];
                  const isToday = dayKey === todayKey;
                  return (
                    <div
                      key={dayKey}
                      ref={(el) => { dayRefs.current[dayKey] = el; }}
                      style={{ scrollMarginTop: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, padding: '0 2px' }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                          background: isToday ? 'var(--brand-primary)' : 'var(--border-2)',
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 900, color: isToday ? 'var(--brand-primary)' : 'var(--text-1)' }}>
                          {agendaTitle(dayKey, todayKey, tomorrowKey)}
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)' }}>
                          {dayEntries.length === 1 ? 'עבודה אחת' : `${dayEntries.length} עבודות`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {dayEntries.map((entry) => (
                          <ScheduleJobRow key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}