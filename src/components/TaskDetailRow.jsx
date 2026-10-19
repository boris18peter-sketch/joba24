/**
 * TaskDetailRow — ONE line of a task's details.
 *
 * The field name sits at the start edge (the right, in Hebrew) and its value at
 * the end edge (the left), so a whole list of these reads as one clean, symmetric
 * column instead of a stack of boxes. No coloured backgrounds, no big icons — the
 * emphasis is carried by type weight alone.
 *
 * This is the single primitive behind the task card's expanded details, the task
 * detail sheet and the category's own dynamic fields, so the three can never
 * drift apart again.
 *
 * Hairline dividers come from `.j-detail-row` in index.css and are drawn between
 * ADJACENT rows only, so a section heading between two groups ends the line by
 * itself and a list can be assembled from more than one component without any of
 * them having to know whether it is last.
 *
 * The value column is `flex: 1`, so its left edge is the SAME line on every row.
 * A short value rests on that line; a long one wraps across the column and its
 * left edge stays on the very same line, so a two-line value and a one-word value
 * still line up. Nothing is ever truncated.
 */
export default function TaskDetailRow({ label, value, valueColor, compact = false }) {
  const text = value === null || value === undefined ? '' : String(value).trim();

  return (
    <div
      className="j-detail-row"
      style={{
        display: 'flex',
        // Baseline, so the label sits level with the FIRST line of a wrapped
        // value instead of floating in the middle of it.
        alignItems: 'baseline',
        gap: 12,
        padding: compact ? '7px 0' : '8px 0',
        minWidth: 0,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontSize: compact ? 11.5 : 12.5,
          fontWeight: 600,
          color: 'var(--text-3)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>

      <span
        className="selectable-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: compact ? 12.5 : 13.5,
          fontWeight: 700,
          color: valueColor || 'var(--text-1)',
          lineHeight: 1.5,
          textAlign: 'end',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </span>
    </div>
  );
}