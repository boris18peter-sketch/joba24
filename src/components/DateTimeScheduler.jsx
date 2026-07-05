/**
 * DateTimeScheduler — Professional date & time picker for task creation
 * Features:
 * - Horizontal scrollable date selector (next 14 days)
 * - Time slot grid (morning / afternoon / evening / night + specific hours)
 * - Clear selected state display
 * - Hebrew labels, RTL layout
 */
import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_NAMES_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

// Time slots — grouped by period for intuitive selection
const TIME_SLOTS = [
  { hour: 6,  label: '06:00', period: 'morning' },
  { hour: 7,  label: '07:00', period: 'morning' },
  { hour: 8,  label: '08:00', period: 'morning' },
  { hour: 9,  label: '09:00', period: 'morning' },
  { hour: 10, label: '10:00', period: 'morning' },
  { hour: 11, label: '11:00', period: 'morning' },
  { hour: 12, label: '12:00', period: 'noon' },
  { hour: 13, label: '13:00', period: 'noon' },
  { hour: 14, label: '14:00', period: 'noon' },
  { hour: 15, label: '15:00', period: 'afternoon' },
  { hour: 16, label: '16:00', period: 'afternoon' },
  { hour: 17, label: '17:00', period: 'afternoon' },
  { hour: 18, label: '18:00', period: 'evening' },
  { hour: 19, label: '19:00', period: 'evening' },
  { hour: 20, label: '20:00', period: 'evening' },
  { hour: 21, label: '21:00', period: 'evening' },
];

const PERIOD_LABELS = {
  morning: { label: 'בוקר', emoji: '🌅', color: '#f59e0b' },
  noon: { label: 'צהריים', emoji: '☀️', color: '#ea580c' },
  afternoon: { label: 'אחה"צ', emoji: '🌤️', color: '#0891b2' },
  evening: { label: 'ערב', emoji: '🌙', color: '#7c3aed' },
};

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNext14Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDisplayDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return 'היום';
  if (target.getTime() === tomorrow.getTime()) return 'מחר';
  const dayName = DAY_NAMES[target.getDay()];
  const dayNum = target.getDate();
  const monthName = MONTH_NAMES[target.getMonth()];
  return `${dayName}, ${dayNum} ${monthName}`;
}

export default function DateTimeScheduler({ value, onChange }) {
  // value = ISO string of scheduled date-time, or null
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [selectedHour, setSelectedHour] = useState(value ? new Date(value).getHours() : null);
  const scrollRef = useRef(null);

  const days = getNext14Days();

  // Sync internal state when external value changes (e.g. edit mode)
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setSelectedHour(d.getHours());
    } else {
      setSelectedDate(null);
      setSelectedHour(null);
    }
  }, [value]);

  const handleDateSelect = (date) => {
    const newDate = new Date(date);
    if (selectedHour !== null) {
      newDate.setHours(selectedHour, 0, 0, 0);
    } else {
      newDate.setHours(10, 0, 0, 0); // default to 10:00
    }
    setSelectedDate(newDate);
    if (selectedHour !== null) {
      onChange(newDate.toISOString());
    }
  };

  const handleTimeSelect = (hour) => {
    setSelectedHour(hour);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, 0, 0, 0);
      setSelectedDate(newDate);
      onChange(newDate.toISOString());
    } else {
      // If no date selected, default to today
      const today = new Date();
      today.setHours(hour, 0, 0, 0);
      setSelectedDate(today);
      onChange(today.toISOString());
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
    setSelectedHour(null);
    onChange(null);
  };

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;
  const isFullySelected = selectedDate && selectedHour !== null;

  // Group time slots by period
  const groupedSlots = ['morning', 'noon', 'afternoon', 'evening'].map(period => ({
    period,
    label: PERIOD_LABELS[period].label,
    emoji: PERIOD_LABELS[period].emoji,
    color: PERIOD_LABELS[period].color,
    slots: TIME_SLOTS.filter(s => s.period === period),
  }));

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 20,
      border: '1px solid var(--border-1)',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(26,111,212,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Calendar size={17} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>תאריך ושעה ספציפיים</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, fontWeight: 600 }}>
              {isFullySelected ? (
                <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} strokeWidth={3} /> {formatDisplayDate(selectedDate)} · {String(selectedHour).padStart(2, '0')}:00
                </span>
              ) : (
                'בחר תאריך ושעה — אופציונלי'
              )}
            </div>
          </div>
        </div>
        {isFullySelected && (
          <button
            onClick={handleClear}
            style={{
              width: 30, height: 30, borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={14} color="#dc2626" />
          </button>
        )}
      </div>

      {/* Selected time banner — prominent when selected */}
      {isFullySelected && (
        <div style={{
          margin: '12px 16px 0',
          padding: '12px 16px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1.5px solid #86efac',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: 'linear-gradient(135deg,#059669,#047857)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(5,150,105,0.3)',
          }}>
            <Clock size={20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 2 }}>מועד המשימה המתוכנן</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#166534' }}>
              {formatDisplayDate(selectedDate)} · {String(selectedHour).padStart(2, '0')}:00
            </div>
          </div>
        </div>
      )}

      {/* Date selector — horizontal scroll */}
      <div style={{ padding: '14px 0 6px' }}>
        <div style={{ padding: '0 18px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3 }}>
          בחר תאריך
        </div>
        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
            padding: '4px 16px 8px',
          }}
          className="date-scroll"
        >
          <style>{`.date-scroll::-webkit-scrollbar{display:none}`}</style>
          {days.map((date, i) => {
            const dateKey = formatDateKey(date);
            const isSelected = selectedDateKey === dateKey;
            const dayName = i === 0 ? 'היום' : i === 1 ? 'מחר' : DAY_NAMES_SHORT[date.getDay()];
            const dayNum = date.getDate();
            const monthShort = MONTH_NAMES[date.getMonth()].slice(0, 3);

            return (
              <button
                key={dateKey}
                onClick={() => handleDateSelect(date)}
                style={{
                  flexShrink: 0, width: 62, height: 78,
                  borderRadius: 16, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  border: isSelected ? '2px solid #1a6fd4' : '1.5px solid var(--border-1)',
                  background: isSelected
                    ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)'
                    : i === 0
                      ? '#eff6ff'
                      : 'var(--surface-3)',
                  color: isSelected ? 'white' : i === 0 ? '#1a6fd4' : 'var(--text-2)',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(26,111,212,0.3)' : 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{dayName}</span>
                <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{dayNum}</span>
                <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>{monthShort}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div style={{ padding: '8px 18px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.3, marginBottom: 10 }}>
          בחר שעה
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupedSlots.map(group => (
            <div key={group.period}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>{group.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: group.color }}>{group.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {group.slots.map(slot => {
                  const isSelected = selectedHour === slot.hour;
                  return (
                    <button
                      key={slot.hour}
                      onClick={() => handleTimeSelect(slot.hour)}
                      style={{
                        height: 38, borderRadius: 10, cursor: 'pointer',
                        border: isSelected ? '2px solid #1a6fd4' : '1.5px solid var(--border-1)',
                        background: isSelected ? '#1a6fd4' : 'var(--surface-3)',
                        color: isSelected ? 'white' : 'var(--text-2)',
                        fontSize: 13, fontWeight: 700,
                        transition: 'all 0.12s ease',
                        fontFamily: 'inherit',
                      }}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}