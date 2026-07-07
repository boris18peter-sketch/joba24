/**
 * TaskDetailsRows — shared task detail rows used in:
 *   - TaskCard dropdown
 *   - TaskDetail info section  
 *   - Chat TaskInfoPopup
 * 
 * Renders two sections: "פרטי המשימה" (icon rows) + "פרטים נוספים" (text rows + requirements)
 */
import { getCategoryLabel } from '@/lib/categories';
import { parseDescription } from '@/lib/descriptionParser';
import { formatHoursLabel, formatScheduleSlots } from '@/lib/priceCalculator';

const URGENCY_TAG_CONFIG = {
  immediate: { emoji: '🔴', label: 'דחוף עכשיו', color: '#dc2626', bg: '#fff1f2', border: '#fca5a5' },
  few_hours:  { emoji: '🟠', label: 'בשעות הקרובות', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  evening:    { emoji: '🌙', label: 'הערב', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  flexible:   { emoji: '🕐', label: 'גמיש', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0' },
};

export default function TaskDetailsRows({ task, compact = false }) {
  if (!task) return null;

  // "פרטי המשימה" rows (icon rows)
  const detailRows = [];

  if (task.expires_at) {
    const expDate = new Date(task.expires_at);
    const expired = expDate <= new Date();
    detailRows.push({
      icon: '🕐', iconBg: '#fff7ed',
      label: 'תוקף המשימה',
      value: expired ? 'פג תוקף' : expDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
      valueColor: expired ? '#dc2626' : undefined,
    });
  }

  if (task.category) {
    detailRows.push({ icon: '📦', iconBg: '#f8f9fb', label: 'קטגוריה', value: getCategoryLabel(task.category) });
  }

  // Hourly pricing breakdown — show rate and duration when task uses hourly pricing
  if (task.category_details?.pricing_type === 'hourly' && task.category_details?.hourly_rate && task.category_details?.hours) {
    const hrs = parseFloat(task.category_details.hours);
    const rate = Number(task.category_details.hourly_rate);
    const hrsLabel = formatHoursLabel(hrs);
    const isSubHour = hrs > 0 && hrs < 1;
    detailRows.push({ icon: '💰', iconBg: '#f0fdf4', label: isSubHour ? 'משך השירות' : 'מחיר לשעה', value: isSubHour ? hrsLabel : `₪${rate} · ${hrsLabel}`, valueColor: '#059669' });
  }

  if (task.payment_method) {
    detailRows.push({ icon: '💳', iconBg: '#f0fdf4', label: 'אמצעי תשלום', value: task.payment_method === 'Cash' ? 'מזומן' : task.payment_method });
  }

  // Schedule slots — prominent display of selected service times
  const scheduleSlots = formatScheduleSlots(task.category_details?.schedule);
  if (scheduleSlots.length > 0) {
    scheduleSlots.forEach((slot, i) => {
      detailRows.push({ icon: '📅', iconBg: '#eff6ff', label: i === 0 ? 'מועדי השירות' : '', value: `${slot.dayLabel} · ${slot.time}`, valueColor: '#1a6fd4' });
    });
  }

  if (task.scheduled_time) {
    const sDate = new Date(task.scheduled_time.includes('T') && !task.scheduled_time.endsWith('Z') && !task.scheduled_time.includes('+') ? task.scheduled_time + 'Z' : task.scheduled_time);
    if (!isNaN(sDate.getTime())) {
      const now = new Date();
      const isToday = sDate.toDateString() === now.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = sDate.toDateString() === tomorrow.toDateString();
      const timeStr = sDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      let dateLabel;
      if (isToday) dateLabel = `היום, ${timeStr}`;
      else if (isTomorrow) dateLabel = `מחר, ${timeStr}`;
      else dateLabel = sDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const isPast = sDate < now;
      detailRows.push({ icon: '📅', iconBg: isPast ? '#f1f5f9' : '#eff6ff', label: 'מועד קבוע', value: dateLabel, valueColor: isPast ? '#94a3b8' : '#1a6fd4' });
    }
  }

  if (task.urgency_tag && URGENCY_TAG_CONFIG[task.urgency_tag]) {
    const t = URGENCY_TAG_CONFIG[task.urgency_tag];
    detailRows.push({ icon: t.emoji, iconBg: t.bg, label: 'דחיפות', value: t.label, valueColor: t.color });
  }

  // "פרטים נוספים" rows
  const extraRows = [];
  if (task.location_name) extraRows.push({ label: 'כתובת יעד', value: task.location_name });
  if (task.address_floor) extraRows.push({ label: 'קומה', value: task.address_floor });
  if (task.address_building) extraRows.push({ label: 'בניין', value: task.address_building });
  if (task.address_apartment) extraRows.push({ label: 'דירה', value: task.address_apartment });
  if (task.address_notes) extraRows.push({ label: 'הערות כתובת', value: task.address_notes });
  if (task.description) {
    extraRows.push({ label: 'תיאור', value: parseDescription(task.description).mainDescription });
  }

  // Requirements
  const reqChecks = [];
  if (task.requirements) {
    if (task.requirements.vehicle) reqChecks.push('נדרש רכב');
    if (task.requirements.vehicle_commercial) reqChecks.push('רכב מסחרי');
    if (task.requirements.truck) reqChecks.push('טנדר / משאית');
    if (task.requirements.motorcycle) reqChecks.push('קטנוע');
    if (task.requirements.two_people) reqChecks.push('יש מעלית במוצא');
    if (task.requirements.three_people) reqChecks.push('יש מעלית ביעד');
    if (task.requirements.four_plus_people) reqChecks.push('4+ אנשים');
    if (task.requirements.experience) reqChecks.push('דרושה משאית');
    if (task.requirements.certified) reqChecks.push('הסמכה / רישיון');
    if (task.requirements.heavy_lifting) reqChecks.push('נשיאת משאות כבדים');
    if (typeof task.requirements.custom === 'string' && task.requirements.custom) reqChecks.push(task.requirements.custom);
  }

  const hasDetails = detailRows.length > 0;
  const hasExtras = extraRows.length > 0 || reqChecks.length > 0;

  if (!hasDetails && !hasExtras) return null;

  const labelStyle = { fontSize: compact ? 9 : 11, color: '#b0bac8', fontWeight: 700, letterSpacing: 0.3, marginBottom: 4, paddingRight: 2 };
  const rowContainerStyle = { display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid #f0f2f7' };
  const rowStyle = (last) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: compact ? '6px 10px' : '9px 12px', background: 'var(--surface-2)', borderBottom: last ? 'none' : '1px solid #f4f6f9' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {hasDetails && (
        <>
          <div style={labelStyle}>פרטי המשימה</div>
          <div style={rowContainerStyle}>
            {detailRows.map((row, i) => (
              <div key={i} style={rowStyle(i === detailRows.length - 1)}>
                <div style={{ fontSize: compact ? 10 : 12, color: '#94a3b8', fontWeight: 500 }}>{row.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: compact ? 11 : 13, color: row.valueColor || 'var(--text-1)' }}>{row.value}</div>
                  <div style={{ width: compact ? 22 : 26, height: compact ? 22 : 26, borderRadius: '50%', background: row.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 11 : 13, flexShrink: 0 }}>{row.icon}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hasExtras && (
        <>
          <div style={{ ...labelStyle, marginTop: hasDetails ? 10 : 0 }}>פרטים נוספים</div>
          <div style={rowContainerStyle}>
            {extraRows.map((row, i) => (
              <div key={i} style={rowStyle(i === extraRows.length - 1 && reqChecks.length === 0)}>
                <div style={{ fontSize: compact ? 10 : 12, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>{row.label}</div>
                <div style={{ fontWeight: 600, fontSize: compact ? 11 : 13, color: 'var(--text-1)', textAlign: 'left', maxWidth: compact ? 150 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
              </div>
            ))}
            {reqChecks.map((req, i) => (
              <div key={`req_${i}`} style={rowStyle(i === reqChecks.length - 1)}>
                <div style={{ fontWeight: 600, fontSize: compact ? 11 : 13, color: 'var(--text-1)' }}>{req}</div>
                <div style={{ fontSize: compact ? 11 : 13, color: '#16a34a', fontWeight: 900 }}>✓</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}