import { formatDateLabel, formatDuration, calcDurationMinutes, derivePriceMode } from '@/lib/taskFormLogic';
import { Calendar, Clock, Timer, DollarSign, Repeat, Moon } from 'lucide-react';
import { WEEKDAYS_HE } from '@/lib/taskFormLogic';

/**
 * LiveSummary — sticky live preview at the bottom of the form.
 * Everything updates instantly as the user edits schedule/price.
 */
export default function LiveSummary({ schedule, price, category }) {
  if (!schedule) return null;
  const duration = schedule.duration_minutes ?? calcDurationMinutes(schedule.start, schedule.end);
  const mode = derivePriceMode(duration);
  const hasAnything = schedule.date || (schedule.start && schedule.end) || price;

  if (!hasAnything) return null;

  const rows = [];
  if (schedule.date) rows.push({ icon: Calendar, text: formatDateLabel(schedule.date), color: '#1a6fd4' });
  if (schedule.start && schedule.end) rows.push({ icon: Clock, text: `${schedule.start} – ${schedule.end}`, color: '#7c3aed' });
  if (duration != null && duration > 0) rows.push({ icon: Timer, text: formatDuration(duration), color: '#059669' });
  if (schedule.recurring && schedule.recurring_days?.length > 0) {
    rows.push({ icon: Repeat, text: schedule.recurring_days.map((d) => WEEKDAYS_HE[d]).join(', '), color: '#d97706' });
  }
  if (schedule.overnight) rows.push({ icon: Moon, text: 'כולל לינה', color: '#7c3aed' });
  if (price) {
    const priceText = mode === 'hourly' && duration ? `₪${price} · ₪${price && duration ? Math.round(Number(price) / (duration / 60)) : 0}/שעה` : `₪${price}`;
    rows.push({ icon: DollarSign, text: priceText, color: '#059669' });
  }

  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 20,
      background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
      borderRadius: 16, padding: '12px 14px', margin: '4px 0',
      boxShadow: '0 -4px 20px rgba(15,43,107,0.25)',
      display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
    }} dir="rtl">
      {rows.map((r, i) => {
        const Icon = r.icon;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'white', fontSize: 13, fontWeight: 700 }}>
            <Icon size={14} style={{ color: 'rgba(255,255,255,0.85)' }} />
            {r.text}
          </div>
        );
      })}
    </div>
  );
}