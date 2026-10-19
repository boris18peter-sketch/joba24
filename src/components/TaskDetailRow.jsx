/**
 * TaskDetailRow — ONE field of a task's details, on a single line.
 *
 * The field name and its value sit on the SAME line, separated by a colon
 * ("שם השדה: הערך"), so a value is never stranded at the far side of the card
 * away from the title it belongs to. The name is a soft grey-blue and the value
 * a dark, readable weight — the two colours keep the pair scannable even though
 * they share a line.
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
      {/* `start` follows the document direction, so the line is right-aligned in
          Hebrew AND left-aligned in the LTR languages. Long values, full
          descriptions and multi-choice answers simply wrap onto the next line. */}
      <div
        className="selectable-text"
        style={{
          fontSize: compact ? 12.5 : 13.5,
          fontWeight: 700,
          color: valueColor || 'var(--text-1)',
          lineHeight: 1.55,
          textAlign: 'start',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-line',
        }}
      >
        <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{label}:</span>{' '}
        {text}
      </div>
    </div>
  );
}