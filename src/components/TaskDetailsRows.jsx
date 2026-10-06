/**
 * TaskDetailsRows — shared task detail rows used in:
 *   - TaskCard dropdown (compact)
 *   - Chat TaskInfoPopup
 *
 * Renders clean, uniform rows matching the TaskDetail "Task Details Card" layout:
 * each row = [icon box] + [label (small gray) + value (bold)].
 */
import { getCategoryLabel } from '@/lib/categories';
import { actionableCategoryKey } from '@/lib/brand/categoryRegistry';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { parseDescription } from '@/lib/descriptionParser';
import { formatHoursLabel, formatScheduleSlots } from '@/lib/priceCalculator';
import { getActiveRequirements } from '@/lib/requirements';
import CategoryDetailsView from '@/components/CategoryDetailsView';
import { useLanguage } from '@/lib/LanguageContext';
import { formatWhen, isPast } from '@/lib/time';

function getUrgencyConfig(urgency_tag, t) {
  const configs = {
    immediate: { emoji: '🔴', label: t('tdr_urg_immediate'), color: '#dc2626', bg: '#fff1f2' },
    few_hours:  { emoji: '🟠', label: t('tdr_urg_few_hours'), color: '#d97706', bg: '#fffbeb' },
    evening:    { emoji: '🌙', label: t('tdr_urg_evening'), color: '#7c3aed', bg: '#faf5ff' },
    flexible:   { emoji: '🕐', label: t('tdr_urg_flexible'), color: '#059669', bg: '#f0fdf4' },
  };
  return configs[urgency_tag];
}

export default function TaskDetailsRows({ task, compact = false }) {
  const { t } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();
  if (!task) return null;

  const iconSize = compact ? 28 : 30;
  const labelFs = 11;
  const valueFs = compact ? 12 : 13;
  const rowGap = compact ? 11 : 13;

  // ── "פרטי המשימה" rows (with icon box) ──
  const detailRows = [];

  if (task.expires_at) {
    const expDate = new Date(task.expires_at);
    const expired = expDate <= new Date();
    detailRows.push({
      icon: '🕐', iconBg: '#fff7ed',
      label: t('tdr_validity'),
      value: expired ? t('tdr_expired') : expDate.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
      valueColor: expired ? '#dc2626' : undefined,
    });
  }

  if (task.category) {
    const serviceKey = actionableCategoryKey(task);
    detailRows.push({ icon: '📦', iconBg: '#f8f9fb', label: t('tdr_category'), value: categoryMap[serviceKey]?.label || getCategoryLabel(serviceKey, t) });
  }

  if (task.category_details?.pricing_type === 'hourly' && task.category_details?.hourly_rate && task.category_details?.hours) {
    const hrs = parseFloat(task.category_details.hours);
    const rate = Number(task.category_details.hourly_rate);
    const hrsLabel = formatHoursLabel(hrs);
    const isSubHour = hrs > 0 && hrs < 1;
    detailRows.push({ icon: '💰', iconBg: '#f0fdf4', label: isSubHour ? t('tdr_service_duration') : t('tdr_hourly_rate'), value: isSubHour ? hrsLabel : `₪${rate} · ${hrsLabel}`, valueColor: '#059669' });
  }

  if (task.payment_method) {
    detailRows.push({ icon: '💳', iconBg: '#f0fdf4', label: t('tdr_payment_method'), value: task.payment_method === 'Cash' ? t('tdr_cash') : task.payment_method });
  }

  const scheduleSlots = formatScheduleSlots(task.category_details?.schedule);
  if (scheduleSlots.length > 0) {
    detailRows.push({
      icon: '📅', iconBg: '#eff6ff',
      label: t('tdr_service_slots'),
      value: scheduleSlots.map(s => `${s.dayLabel} · ${s.time}`).join('  ·  '),
      valueColor: 'var(--brand-primary)',
      multiline: true,
    });
  }

  if (task.scheduled_time) {
    // One time utility for the whole app — no local date parsing here.
    const when = formatWhen(task.scheduled_time);
    if (when) {
      const past = isPast(task.scheduled_time);
      detailRows.push({ icon: '📅', iconBg: past ? '#f1f5f9' : '#eff6ff', label: t('tdr_fixed_time'), value: when, valueColor: past ? '#94a3b8' : 'var(--brand-primary)' });
    }
  }

  if (task.urgency_tag) {
    const tu = getUrgencyConfig(task.urgency_tag, t);
    if (tu) detailRows.push({ icon: tu.emoji, iconBg: tu.bg, label: t('tdr_urgency'), value: tu.label, valueColor: tu.color });
  }

  // ── "פרטים נוספים" rows ──
  const extraRows = [];

  // Full address details
  if (task.location_name || task.address_building || task.address_floor || task.address_apartment || task.address_notes) {
    const parts = [
      task.location_name,
      task.address_building && `${t('tdr_building')} ${task.address_building}`,
      task.address_floor && `${t('tdr_floor')} ${task.address_floor}`,
      task.address_apartment && `${t('tdr_apartment')} ${task.address_apartment}`,
      task.address_notes,
    ].filter(Boolean);
    extraRows.push({ icon: '📍', iconBg: '#fff7ed', label: t('tdr_address'), value: parts.join(' · '), multiline: true });
  }

  // Full description (the card body shows 1-line clamp; here show full)
  if (task.description) {
    const desc = parseDescription(task.description).mainDescription;
    if (desc) extraRows.push({ icon: '📝', iconBg: '#f8f9fb', label: t('tdr_full_description'), value: desc, multiline: true });
  }

  // Requirements
  const reqs = getActiveRequirements(task.requirements, task.category, t).map(r =>
    r.value ? `${r.label}: ${r.value}` : r.label
  );
  if (task.requires_invoice) reqs.push(t('tdr_requires_invoice'));
  if (task.verification_required) reqs.push(t('tdr_requires_green'));

  const hasDetails = detailRows.length > 0;
  const hasExtras = extraRows.length > 0 || reqs.length > 0;

  if (!hasDetails && !hasExtras) return null;

  const sectionLabelStyle = { fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5, marginBottom: 9 };

  const Row = ({ icon, iconBg, label, value, valueColor, multiline }) => (
    <div style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 9 }}>
      <div style={{
        width: iconSize, height: iconSize, borderRadius: 9, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontSize: compact ? 12 : 14,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: labelFs, color: '#94a3b8', fontWeight: 600, marginBottom: 1 }}>{label}</div>
        <div
          className={multiline ? 'selectable-text' : undefined}
          style={{
            fontSize: valueFs, fontWeight: 700, color: valueColor || 'var(--text-1)', lineHeight: 1.4,
            overflow: multiline ? 'visible' : 'hidden',
            textOverflow: multiline ? 'clip' : 'ellipsis',
            whiteSpace: multiline ? 'normal' : 'nowrap',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
      {hasDetails && (
        <>
          <div style={sectionLabelStyle}>{t('tdr_task_details')}</div>
          {detailRows.map((row, i) => <Row key={`d_${i}`} {...row} multiline={row.multiline} />)}
        </>
      )}
      {hasExtras && (
        <>
          <div style={{ ...sectionLabelStyle, marginTop: hasDetails ? 2 : 0 }}>{t('tdr_extra_details')}</div>
          {extraRows.map((row, i) => <Row key={`e_${i}`} {...row} multiline />)}
          {reqs.length > 0 && (
            <Row icon="✅" iconBg="#f0fdf4" label={t('tdr_requirements')} value={reqs.join(' · ')} valueColor="#059669" multiline />
          )}
        </>
      )}
      <CategoryDetailsView task={task} compact={compact} />
    </div>
  );
}