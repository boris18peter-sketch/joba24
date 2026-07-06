import { useState } from 'react';
import { Calendar, Clock, Plus, X } from 'lucide-react';

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const weekday = WEEKDAYS[d.getDay()];
  const datePart = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  if (isToday) return `היום (${weekday})`;
  if (isTomorrow) return `מחר (${weekday})`;
  return `${weekday}, ${datePart}`;
}

/**
 * SchedulePicker — lets the publisher pick specific dates + start/end times.
 * Value: array of { date: 'YYYY-MM-DD', start: 'HH:MM', end: 'HH:MM' }
 */
export default function SchedulePicker({ value = [], onChange }) {
  const slots = Array.isArray(value) ? value : [];
  const [showForm, setShowForm] = useState(slots.length === 0);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const addSlot = () => {
    if (!date || !startTime || !endTime || startTime >= endTime) return;
    const newSlot = { date, start: startTime, end: endTime };
    const sorted = [...slots, newSlot].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start.localeCompare(b.start);
    });
    onChange(sorted);
    setDate('');
    setStartTime('');
    setEndTime('');
    setShowForm(false);
  };

  const removeSlot = (idx) => {
    onChange(slots.filter((_, i) => i !== idx));
  };

  const canAdd = date && startTime && endTime && startTime < endTime;

  const inputStyle = {
    width: '100%', height: 44, borderRadius: 10,
    border: '1.5px solid var(--border-1)', background: 'var(--surface-2)',
    padding: '0 12px', fontSize: 15, color: 'var(--text-1)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div>
      {/* Existing slots */}
      {slots.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {slots.map((slot, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-3)', borderRadius: 12,
              padding: '10px 12px', border: '1px solid var(--border-1)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                border: '1px solid #bfdbfe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={17} color="#1a6fd4" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>
                  {formatDateLabel(slot.date)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={11} /> {slot.start} – {slot.end}
                </div>
              </div>
              <button type="button" onClick={() => removeSlot(idx)} style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={14} color="#dc2626" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add slot form */}
      {showForm ? (
        <div style={{
          background: 'var(--surface-3)', borderRadius: 14,
          padding: 14, border: '1.5px dashed var(--border-2)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
            בחר תאריך ושעות מדויקות
          </div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>תאריך</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ ...inputStyle, marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שעת התחלה</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שעת סיום</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
            </div>
          </div>
          {startTime && endTime && startTime >= endTime && (
            <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>שעת הסיום חייבת להיות אחרי שעת ההתחלה</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addSlot} disabled={!canAdd} style={{
              flex: 1, height: 44, borderRadius: 11, border: 'none',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              background: canAdd ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--border-1)',
              color: canAdd ? 'white' : 'var(--text-3)', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Plus size={15} /> אישור מועד
            </button>
            {slots.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)} style={{
                height: 44, padding: '0 16px', borderRadius: 11,
                border: '1px solid var(--border-1)', background: 'var(--surface-2)',
                color: 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>ביטול</button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} style={{
          width: '100%', height: 48, borderRadius: 12,
          border: '1.5px dashed var(--border-2)', background: 'var(--surface-3)',
          color: '#1a6fd4', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Plus size={16} /> הוסף מועד נוסף
        </button>
      )}

      {slots.length === 0 && !showForm && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>לחץ להוספת תאריך ושעות מדויקות</p>
      )}
    </div>
  );
}