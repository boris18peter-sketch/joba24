/**
 * TaskDetailRow — ONE field of a task's details, in a stacked structure.
 *
 * The field name sits on the first line in a soft grey-blue, and its value
 * directly beneath it in a dark, readable weight. Both are aligned to the SAME
 * edge (the right, in Hebrew), so a value is never stranded at the far side of
 * the card away from the title it belongs to.
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
export default function TaskDetailRow({ label, value, valueColor, compact = false }) {
  const text = value === null || value === undefined ? '' : String(value).trim();

  return (
    <div
      className="j-detail-row"
      style={{
        padding: compact ? '6px 0' : '7px 0',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: compact ? 11.5 : 12.5,
          fontWeight: 600,
          color: 'var(--text-3)',
          lineHeight: 1.45,
          marginBottom: compact ? 2 : 3,
        }}
      >
        {label}
      </div>

      {/* `start` follows the document direction, so the value sits on the same
          edge as its label in Hebrew AND in the LTR languages. */}
      <div
        className="selectable-text"
        style={{
          fontSize: compact ? 12.5 : 13.5,
          fontWeight: 700,
          color: valueColor || 'var(--text-1)',
          lineHeight: 1.5,
          textAlign: 'start',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </div>
    </div>
  );
}