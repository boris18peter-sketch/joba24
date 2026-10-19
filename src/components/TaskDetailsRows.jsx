/**
 * TaskDetailsRows — the task's details, rendered as one clean list.
 *
 * Used in:
 *   - TaskCard dropdown (compact)
 *   - Task detail sheet / page (full)
 *   - Chat TaskInfoPopup
 *
 * Every row is a single line: the field name at the start edge (the right, in
 * Hebrew) and its value at the end edge, separated by hairlines. There are no
 * coloured icon boxes any more — the list reads as one card instead of a stack
 * of blocks, and the same primitive (TaskDetailRow) is used by the category's
 * own dynamic fields, so the two groups are visibly one design.
 */
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import { actionableCategoryKey } from '@/lib/brand/categoryRegistry';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { parseDescription } from '@/lib/descriptionParser';
import { formatHoursLabel, formatScheduleSlots } from '@/lib/priceCalculator';
import { getActiveRequirements } from '@/lib/requirements';
import CategoryDetailsView from '@/components/CategoryDetailsView';
import TaskDetailRow from '@/components/TaskDetailRow';
import { useLanguage } from '@/lib/LanguageContext';
import { formatWhen, isPast } from '@/lib/time';

// Only a genuinely urgent task keeps an emphasis — a quiet red on the value
// itself. No background, no badge, no icon.
function getUrgencyConfig(urgency_tag, t) {
  const configs = {
    immediate: { label: t('tdr_urg_immediate'), color: 'var(--color-danger)' },
    few_hours:  { label: t('tdr_urg_few_hours') },
    evening:    { label: t('tdr_urg_evening') },
    flexible:   { label: t('tdr_urg_flexible') },
  };
  return configs[urgency_tag];
}

export default function TaskDetailsRows({ task, compact = false, showTaskDetailsLabel = true }) {
  const { t, lang } = useLanguage();
  const { map: categoryMap } = useGlobalCategories();
  if (!task) return null;

  // ── "פרטי המשימה" rows ──
  const detailRows = [];

  if (task.expires_at) {
    const expDate = new Date(task.expires_at);
    const expired = expDate <= new Date();
    detailRows.push({
      label: t('tdr_validity'),
      value: expired ? t('tdr_expired') : expDate.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
      valueColor: expired ? 'var(--color-danger)' : undefined,
    });
  }

  if (task.category) {
    const serviceKey = actionableCategoryKey(task);
    detailRows.push({ label: t('tdr_category'), value: localizedCategoryLabel(serviceKey, categoryMap[serviceKey], lang, t) });
  }

  if (task.category_details?.pricing_type === 'hourly' && task.category_details?.hourly_rate && task.category_details?.hours) {
    const hrs = parseFloat(task.category_details.hours);
    const rate = Number(task.category_details.hourly_rate);
    const hrsLabel = formatHoursLabel(hrs);
    const isSubHour = hrs > 0 && hrs < 1;
    detailRows.push({ label: isSubHour ? t('tdr_service_duration') : t('tdr_hourly_rate'), value: isSubHour ? hrsLabel : `₪${rate} · ${hrsLabel}` });
  }

  if (task.payment_method) {
    detailRows.push({ label: t('tdr_payment_method'), value: task.payment_method === 'Cash' ? t('tdr_cash') : task.payment_method });
  }

  const scheduleSlots = formatScheduleSlots(task.category_details?.schedule);
  if (scheduleSlots.length > 0) {
    detailRows.push({
      label: t('tdr_service_slots'),
      value: scheduleSlots.map(s => `${s.dayLabel} · ${s.time}`).join('  ·  '),
      multiline: true,
    });
  }

  if (task.scheduled_time) {
    // One time utility for the whole app — no local date parsing here.
    const when = formatWhen(task.scheduled_time);
    if (when) {
      detailRows.push({ label: t('tdr_fixed_time'), value: when, valueColor: isPast(task.scheduled_time) ? 'var(--text-3)' : undefined });
    }
  }

  if (task.urgency_tag) {
    const tu = getUrgencyConfig(task.urgency_tag, t);
    if (tu) detailRows.push({ label: t('tdr_urgency'), value: tu.label, valueColor: tu.color });
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
    extraRows.push({ label: t('tdr_address'), value: parts.join(' · ') });
  }

  // Full description (the card body shows 1-line clamp; here show full)
  if (task.description) {
    const desc = parseDescription(task.description).mainDescription;
    if (desc) extraRows.push({ label: t('tdr_full_description'), value: desc });
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

  const sectionLabelStyle = { fontSize: 11.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.4 };

  return (
    <div className="j-detail-list" style={{ display: 'flex', flexDirection: 'column' }}>
      {hasDetails && (
        <>
          {/* The host may already print this heading — the task detail sheet has
              its own "פרטי המשימה" row with the copyable id beside it, and two
              identical headings one above the other reads as a bug. */}
          {showTaskDetailsLabel && <div className="j-detail-heading" style={sectionLabelStyle}>{t('tdr_task_details')}</div>}
          {detailRows.map((row, i) => <TaskDetailRow key={`d_${i}`} compact={compact} {...row} />)}
        </>
      )}
      {hasExtras && (
        <>
          <div className="j-detail-heading" style={{ ...sectionLabelStyle, marginTop: hasDetails ? 4 : 0 }}>{t('tdr_extra_details')}</div>
          {extraRows.map((row, i) => <TaskDetailRow key={`e_${i}`} compact={compact} {...row} />)}
          {reqs.length > 0 && <TaskDetailRow compact={compact} label={t('tdr_requirements')} value={reqs.join(' · ')} />}
        </>
      )}
      <CategoryDetailsView task={task} compact={compact} />
    </div>
  );
}