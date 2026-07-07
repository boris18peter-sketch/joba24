import { Calendar, Clock, Repeat, Moon, Zap, AlertTriangle } from 'lucide-react';
import {
  DEFAULT_SCHEDULE, getSchedulerConfig, calcDurationMinutes, addMinutesToTime,
  formatDuration, formatDateLabel, validateSchedule, WEEKDAYS_HE, DURATION_PRESETS,
} from '@/lib/taskFormLogic';

const inputStyle = {
  width: '100%', height: 46, borderRadius: 11,
  border: '1.5px solid var(--border-1)', background: 'var(--input-bg)',
  padding: '0 12px', fontSize: 15, color: 'var(--text-1)', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const modeBtn = (active) => ({
  flex: 1, height: 42, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
  background: active ? 'var(--surface-2)' : 'transparent',
  boxShadow: active ? 'var(--shadow-xs)' : 'none',
  fontSize: 13, fontWeight: active ? 800 : 600,
  color: active ? 'var(--brand-primary)' : 'var(--text-2)',
  transition: 'all 0.18s',
});

/**
 * SmartScheduler — the SINGLE scheduling source for the whole form.
 * Owns: date, start, end, duration (auto-synced both directions), flexible/exact, recurring, overnight.
 * Category-aware: recurring/overnight only appear for relevant categories.
 */
export default function SmartScheduler({ value, onChange, category }) {
  const schedule = { ...DEFAULT_SCHEDULE, ...(value || {}) };
  const cfg = getSchedulerConfig(category);
  const errors = validateSchedule(schedule);
  const duration = schedule.duration_minutes ?? calcDurationMinutes(schedule.start, schedule.end);

  const update = (patch) => onChange({ ...schedule, ...patch });

  // Changing start: keep end if set (recompute duration), else extend by existing duration
  const handleStart = (start) => {
    const patch = { start };
    if (start && schedule.end) {
      patch.duration_minutes = calcDurationMinutes(start, schedule.end);
    } else if (start && schedule.duration_minutes) {
      patch.end = addMinutesToTime(start, schedule.duration_minutes);
    }
    update(patch);
  };

  // Changing end: recompute duration from start
  const handleEnd = (end) => {
    update({
      end,
      duration_minutes: schedule.start ? calcDurationMinutes(schedule.start, end) : schedule.duration_minutes,
    });
  };

  // Changing duration: shift end time to keep everything synced
  const handleDuration = (mins) => {
    const patch = { duration_minutes: mins };
    if (schedule.start) patch.end = addMinutesToTime(schedule.start, mins);
    update(patch);
  };

  const toggleDay = (day) => {
    const days = schedule.recurring_days || [];
    update({
      recurring_days: days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort((a, b) => a - b),
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Calendar size={16} color="var(--brand-primary)" />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{cfg.label}</span>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 'var(--r-md)', padding: 4, gap: 4, marginBottom: 14 }}>
        <button type="button" onClick={() => update({ mode: 'exact' })} style={modeBtn(schedule.mode === 'exact')}>
          <Clock size={13} style={{ display: 'inline', marginLeft: 4 }} /> זמן מדויק
        </button>
        <button type="button" onClick={() => update({ mode: 'flexible' })} style={modeBtn(schedule.mode === 'flexible')}>
          <Zap size={13} style={{ display: 'inline', marginLeft: 4 }} /> גמיש
        </button>
      </div>

      {schedule.mode === 'exact' ? (
        <>
          {/* Date */}
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>תאריך</label>
          <input
            type="date"
            value={schedule.date || ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => update({ date: e.target.value })}
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          {/* Start / End */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שעת התחלה</label>
              <input type="time" value={schedule.start || ''} onChange={(e) => handleStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שעת סיום</label>
              <input type="time" value={schedule.end || ''} onChange={(e) => handleEnd(e.target.value)} style={{ ...inputStyle, borderColor: errors.end ? '#ef4444' : 'var(--border-1)' }} />
            </div>
          </div>
          {errors.end && (
            <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={11} /> {errors.end}
            </div>
          )}

          {/* Duration — quick presets + custom */}
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>משך משוער</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {DURATION_PRESETS.map((p) => {
              const active = duration === p.mins;
              return (
                <button key={p.mins} type="button" onClick={() => handleDuration(p.mins)} style={{
                  padding: '7px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: active ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-1)',
                  background: active ? 'var(--brand-primary-light)' : 'var(--surface-3)',
                  color: active ? 'var(--brand-primary)' : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}>{p.label}</button>
              );
            })}
          </div>
          {duration != null && duration > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>
              משך מחושב: <strong style={{ color: 'var(--text-1)' }}>{formatDuration(duration)}</strong> · שעת הסיום מתעדכנת אוטומטית
            </div>
          )}
        </>
      ) : (
        <>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>תאריך משוער</label>
          <input
            type="date"
            value={schedule.date || ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => update({ date: e.target.value })}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '10px 12px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600, lineHeight: 1.5 }}>
            <Zap size={13} style={{ display: 'inline', marginLeft: 4, color: 'var(--brand-primary)' }} />
            גמיש — העובד יכול לתאם איתך מועד מדויק. מומלץ לציין בתיאור חלון זמן (למשל "בין 16:00 ל-20:00").
          </div>
        </>
      )}

      {/* Recurring — only for relevant categories */}
      {cfg.supportsRecurring && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
          <button type="button" onClick={() => update({ recurring: !schedule.recurring })} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, cursor: 'pointer', textAlign: 'right',
            background: schedule.recurring ? 'rgba(26,111,212,0.06)' : 'var(--surface-3)',
            border: `1.5px solid ${schedule.recurring ? '#bfdbfe' : 'var(--border-1)'}`,
            transition: 'all 0.15s',
          }}>
            <Repeat size={16} color={schedule.recurring ? 'var(--brand-primary)' : 'var(--text-3)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: schedule.recurring ? 'var(--brand-primary)' : 'var(--text-1)' }}>חוזר באופן קבוע</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>שבועי / דו-שבועי — בחר ימים</div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${schedule.recurring ? 'var(--brand-primary)' : 'var(--border-1)'}`, background: schedule.recurring ? 'var(--brand-primary)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {schedule.recurring && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
          </button>

          {schedule.recurring && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WEEKDAYS_HE.map((day, idx) => {
                  const active = (schedule.recurring_days || []).includes(idx);
                  return (
                    <button key={idx} type="button" onClick={() => toggleDay(idx)} style={{
                      padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: active ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-1)',
                      background: active ? 'var(--brand-primary)' : 'var(--surface-2)',
                      color: active ? 'white' : 'var(--text-2)',
                      transition: 'all 0.15s',
                    }}>{day}</button>
                  );
                })}
              </div>
              {errors.recurring_days && (
                <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 6 }}>{errors.recurring_days}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overnight — only for relevant categories */}
      {cfg.supportsOvernight && (
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => update({ overnight: !schedule.overnight })} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, cursor: 'pointer', textAlign: 'right',
            background: schedule.overnight ? 'rgba(124,58,237,0.06)' : 'var(--surface-3)',
            border: `1.5px solid ${schedule.overnight ? '#d8b4fe' : 'var(--border-1)'}`,
            transition: 'all 0.15s',
          }}>
            <Moon size={16} color={schedule.overnight ? '#7c3aed' : 'var(--text-3)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: schedule.overnight ? '#7c3aed' : 'var(--text-1)' }}>לינה / שהיית לילה</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>העבודה כוללת שהייה לילית</div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${schedule.overnight ? '#7c3aed' : 'var(--border-1)'}`, background: schedule.overnight ? '#7c3aed' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {schedule.overnight && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
            </div>
          </button>
        </div>
      )}

      {/* Live mini-summary inside the scheduler */}
      {(schedule.date || (schedule.start && schedule.end)) && (
        <div style={{
          marginTop: 14, background: 'linear-gradient(135deg,#eff6ff,#f0f7ff)',
          border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 12px',
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
          fontSize: 12, fontWeight: 700, color: '#1e40af',
        }}>
          {schedule.date && <span>📅 {formatDateLabel(schedule.date)}</span>}
          {schedule.start && schedule.end && <span>🕒 {schedule.start}–{schedule.end}</span>}
          {duration != null && duration > 0 && <span>⏱ {formatDuration(duration)}</span>}
          {schedule.recurring && schedule.recurring_days?.length > 0 && (
            <span>🔁 {schedule.recurring_days.map((d) => WEEKDAYS_HE[d]).join(', ')}</span>
          )}
          {schedule.overnight && <span>🌙 לינה</span>}
        </div>
      )}
    </div>
  );
}