/**
 * CategoryDetailsView — Renders ALL filled category-specific fields
 * from the structured `task.category_details` object (not from description text).
 *
 * Used in:
 *   - TaskDetail.jsx (full detail page)
 *   - TaskDetailsRows.jsx (dropdown / card view)
 *
 * This ensures every field the publisher filled is displayed, including
 * textarea fields with newlines, multi-select arrays, toggles, etc.
 */
import { getCategoryConfig, getCategoryExtraFields } from '@/lib/taskFlowConfig';
import { useLanguage } from '@/lib/LanguageContext';
import useTaskFlowI18n from '@/hooks/useTaskFlowI18n';
import TaskDetailRow from '@/components/TaskDetailRow';
import { cleanDetailLabel } from '@/lib/fieldLabels';

export default function CategoryDetailsView({ task, compact = false }) {
  const { lang } = useLanguage();
  const { tTaskFlow } = useTaskFlowI18n();
  if (!task?.category) return null;

  const config = getCategoryConfig(task.category);
  if (!config) return null;

  const fields = getCategoryExtraFields(task.category);
  if (!fields.length) return null;

  const details = task.category_details || {};

  // Build display rows from structured data
  const rows = [];
  const knownKeys = new Set(fields.map(f => f.key));

  fields.forEach(f => {
    const v = details[f.key];
    if (v === undefined || v === '' || v === null) return;

    // The stored label carries the form's filling instruction ("ניתן לבחור יותר
    // מאחד"); the detail view shows the clean title only. Display-only — the
    // field key, the stored label and the saved value are never touched.
    const label = cleanDetailLabel(tTaskFlow(f.label, lang));

    if (f.type === 'toggle') {
      if (v) {
        rows.push({ label, value: null, isToggle: true });
      }
    } else if (f.type === 'schedule') {
      if (Array.isArray(v) && v.length > 0) {
        const slotsText = v.map(s => `${s.date} ${s.start}–${s.end}`).join('; ');
        rows.push({ label, value: slotsText, isToggle: false });
      }
    } else if (Array.isArray(v)) {
      if (v.length > 0) {
        rows.push({ label, value: v.map(opt => tTaskFlow(opt, lang)).join(', '), isToggle: false });
      }
    } else if (typeof v === 'object') {
      rows.push({ label, value: JSON.stringify(v), isToggle: false });
    } else {
      rows.push({ label, value: tTaskFlow(String(v), lang), isToggle: false });
    }
  });

  // Also render any unknown keys in category_details that aren't in the config
  // (ensures no data entered by the publisher is lost)
  // Internal bookkeeping — never publisher-entered content. The category itself
  // is already shown, localised, by the "קטגוריה" row in TaskDetailsRows.
  const skipKeys = new Set(['hourly_rate', 'hours', 'pricing_type', 'schedule', 'brand_category_key']);
  for (const [key, v] of Object.entries(details)) {
    if (knownKeys.has(key) || skipKeys.has(key)) continue;
    // Skip raw coordinate fields stored by address-type fields (e.g. to_address_lat)
    if (key.endsWith('_lat') || key.endsWith('_lng')) continue;
    if (v === undefined || v === '' || v === null) continue;
    if (typeof v === 'boolean') {
      if (v) rows.push({ label: key, value: null, isToggle: true });
    } else if (Array.isArray(v)) {
      if (v.length > 0) rows.push({ label: key, value: v.map(opt => tTaskFlow(opt, lang)).join(', '), isToggle: false });
    } else if (typeof v === 'object') {
      rows.push({ label: key, value: JSON.stringify(v), isToggle: false });
    } else {
      rows.push({ label: key, value: tTaskFlow(String(v), lang), isToggle: false });
    }
  }

  if (rows.length === 0) return null;

  // The category's own fields are the SAME rows as the standard task details —
  // the shared primitive, so the two groups line up as one list. A toggle has no
  // value to show, so its check sits at the far edge, exactly where a value would.
  return (
    <>
      {rows.map((row, i) => (
        <TaskDetailRow
          key={i}
          compact={compact}
          label={row.label}
          value={row.isToggle ? '✓' : row.value}
          valueColor={row.isToggle ? 'var(--brand-primary)' : undefined}
        />
      ))}
    </>
  );
}