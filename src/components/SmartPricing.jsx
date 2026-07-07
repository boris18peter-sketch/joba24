import { useEffect, useRef } from 'react';
import { DollarSign, Clock } from 'lucide-react';
import { derivePriceMode, formatDuration, calcDurationMinutes } from '@/lib/taskFormLogic';
import { getCategoryPriceRange } from '@/lib/taskFlowConfig';

const inputStyle = {
  width: '100%', height: 50, borderRadius: 12,
  border: '1.5px solid var(--border-1)', background: 'var(--input-bg)',
  padding: '0 14px', fontSize: 18, fontWeight: 800, color: 'var(--text-1)',
  outline: 'none', boxSizing: 'border-box', textAlign: 'center',
};

/**
 * SmartPricing — pricing UI adapts automatically to the scheduled duration.
 *   < 60 min  → "מחיר לביקור" (fixed)
 *   1–8 hrs   → שכר שעתי + סה"כ מחושב
 *   > 8 hrs   → מחיר יומי + סה"כ
 *   no dur    → מחיר כולל (fixed)
 * Writes total → price; rate → hourly_rate. Both directions stay synced.
 */
export default function SmartPricing({ schedule, price, hourlyRate, onChange, category }) {
  const duration = schedule?.duration_minutes ?? calcDurationMinutes(schedule?.start, schedule?.end);
  const mode = derivePriceMode(duration);
  const range = getCategoryPriceRange(category);

  // Auto-sync total when duration changes (hourly/daily) — both directions stay in sync
  const prevDurRef = useRef(duration);
  useEffect(() => {
    if ((mode === 'hourly' || mode === 'daily') && hourlyRate && duration && prevDurRef.current !== duration) {
      prevDurRef.current = duration;
      if (mode === 'hourly') {
        onChange('price', String(Math.round(Number(hourlyRate) * (duration / 60))));
      } else {
        onChange('price', String(Math.round(Number(hourlyRate) * Math.max(1, Math.round((duration / 60) / 8)))));
      }
    } else {
      prevDurRef.current = duration;
    }
  }, [duration, mode, hourlyRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPrice = (v) => onChange('price', v);
  const setRate = (v) => {
    onChange('hourly_rate', v);
    if (mode === 'hourly' && duration && v) {
      const hours = duration / 60;
      onChange('price', String(Math.round(Number(v) * hours)));
    } else if (mode === 'daily' && duration && v) {
      const days = Math.max(1, Math.round((duration / 60) / 8));
      onChange('price', String(Math.round(Number(v) * days)));
    }
  };

  const cleanNum = (v) => String(v || '').replace(/[^0-9]/g, '');

  const totalLabel = (() => {
    if (mode === 'hourly' && duration) return `סה"כ = ₪${hourlyRate || 0} × ${(duration / 60).toFixed(duration % 60 === 0 ? 0 : 1)} שעות`;
    if (mode === 'daily' && duration) return `סה"כ = ₪${hourlyRate || 0} × ${Math.max(1, Math.round((duration / 60) / 8))} ימים`;
    return null;
  })();

  return (
    <div>
      {/* Mode badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <DollarSign size={16} color="var(--brand-primary)" />
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>מחיר</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99,
          background: mode === 'visit' ? '#fff7ed' : mode === 'hourly' ? '#eff6ff' : mode === 'daily' ? '#f0fdf4' : 'var(--surface-3)',
          color: mode === 'visit' ? '#c2410c' : mode === 'hourly' ? '#1e40af' : mode === 'daily' ? '#166534' : 'var(--text-2)',
          border: `1px solid ${mode === 'visit' ? '#fed7aa' : mode === 'hourly' ? '#bfdbfe' : mode === 'daily' ? '#bbf7d0' : 'var(--border-1)'}`,
        }}>
          {mode === 'visit' && 'מחיר לביקור'}
          {mode === 'hourly' && 'שכר שעתי'}
          {mode === 'daily' && 'מחיר יומי'}
          {mode === 'fixed' && 'מחיר כולל'}
        </span>
      </div>

      {/* Duration context */}
      {duration != null && duration > 0 ? (
        <div style={{
          background: 'var(--surface-3)', borderRadius: 10, padding: '8px 12px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', fontWeight: 600,
        }}>
          <Clock size={13} /> משך המשימה: <strong style={{ color: 'var(--text-1)' }}>{formatDuration(duration)}</strong>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, fontWeight: 600, lineHeight: 1.5 }}>
          💡 בחר תאריך ושעות למעלה כדי שהמחיר יתחשבם אוטומטית. טווח מחירים מקובל בתחום: ₪{range.min}–{range.max}.
        </div>
      )}

      {/* Rate input (hourly/daily) */}
      {(mode === 'hourly' || mode === 'daily') && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
            {mode === 'hourly' ? 'שכר לשעה (₪)' : 'שכר ליום (₪)'}
          </label>
          <input
            type="text" inputMode="numeric" dir="ltr"
            placeholder={mode === 'hourly' ? String(range.min) : '500'}
            value={hourlyRate || ''}
            onChange={(e) => setRate(cleanNum(e.target.value))}
            style={inputStyle}
          />
          {totalLabel && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              {totalLabel}
            </div>
          )}
        </div>
      )}

      {/* Total price */}
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
        {mode === 'visit' ? 'מחיר לביקור (₪)' : mode === 'daily' ? 'סה"כ לתשלום (₪)' : 'סה"כ לתשלום (₪)'}
      </label>
      <input
        type="text" inputMode="numeric" dir="ltr"
        placeholder="100"
        value={price || ''}
        onChange={(e) => setPrice(cleanNum(e.target.value))}
        style={inputStyle}
      />

      {/* Commitment note */}
      <div style={{
        background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12,
        padding: '10px 12px', marginTop: 10, fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.5,
      }}>
        <strong>המחיר שפורסם הוא הסכום הסופי לתשלום לעובד.</strong> שני הצדדים מחויבים לכבדו.
      </div>
    </div>
  );
}