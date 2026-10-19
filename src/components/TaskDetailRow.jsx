/**
 * TaskDetailRow — ONE line of a task's details.
 *
 * The field name sits at the start edge (the right, in Hebrew) and its value at
 * the end edge, so a whole list of these reads as one clean, symmetric column
 * instead of a stack of boxes. No coloured backgrounds, no big icons — the
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
 */
export default function TaskDetailRow({ label, value, valueColor, multiline = false, compact = false }) {
  const text = value === null || value === undefined ? '' : String(value);

  // A short value stays on one line and hugs the far edge — that is what makes
  // every row line up. A long one wraps across the space between the label and
  // that edge, so nothing is ever cut off and the layout never breaks. Decided
  // here rather than by each caller, so all three lists behave identically.
  const wraps = multiline || text.length > 24;

  return (
    <div
      className="j-detail-row"
      style={{
        display: 'flex',
        alignItems: wraps ? 'flex-start' : 'center',
        gap: 12,
        padding: compact ? '7px 0' : '9px 0',
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
        className={wraps ? 'selectable-text' : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: compact ? 12.5 : 13.5,
          fontWeight: 700,
          color: valueColor || 'var(--text-1)',
          lineHeight: 1.5,
          textAlign: wraps ? 'start' : 'end',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: wraps ? 'pre-line' : 'nowrap',
          overflow: wraps ? 'visible' : 'hidden',
          textOverflow: wraps ? 'clip' : 'ellipsis',
        }}
      >
        {text}
      </span>
    </div>
  );
}