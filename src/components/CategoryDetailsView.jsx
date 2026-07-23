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

export default function CategoryDetailsView({ task, compact = false }) {
  if (!task?.category) return null;

  const config = getCategoryConfig(task.category);
  if (!config) return null;

  const fields = getCategoryExtraFields(task.category);
  if (!fields.length) return null;

  const details = task.category_details || {};

  // Build display rows from structured data
  const rows = [];

  fields.forEach(f => {
    const v = details[f.key];
    if (v === undefined || v === '' || v === null) return;

    if (f.type === 'toggle') {
      if (v) {
        rows.push({ label: f.label, value: null, isToggle: true });
      }
    } else if (f.type === 'schedule') {
      if (Array.isArray(v) && v.length > 0) {
        const slotsText = v.map(s => `${s.date} ${s.start}–${s.end}`).join('; ');
        rows.push({ label: f.label, value: slotsText, isToggle: false });
      }
    } else if (Array.isArray(v)) {
      if (v.length > 0) {
        rows.push({ label: f.label, value: v.join(', '), isToggle: false });
      }
    } else {
      rows.push({ label: f.label, value: String(v), isToggle: false });
    }
  });

  if (rows.length === 0) return null;

  const labelStyle = {
    fontSize: compact ? 10 : 11,
    color: '#94a3b8',
    fontWeight: 600,
    marginBottom: 2,
  };

  const valueStyle = {
    fontSize: compact ? 12 : 13,
    fontWeight: 700,
    color: 'var(--text-1)',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10,
            background: row.isToggle ? '#f0fdf4' : '#f8f9fb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 13,
          }}>
            {row.isToggle ? '✓' : '•'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {row.isToggle ? (
              <div style={{ fontSize: compact ? 12 : 13, fontWeight: 600, color: 'var(--text-1)' }}>{row.label}</div>
            ) : (
              <>
                <div style={labelStyle}>{row.label}</div>
                <div style={valueStyle}>{row.value}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}