/**
 * TaskChip — the ONE tag/pill used by the task card, the task detail sheet and
 * the active task panel.
 *
 * Every status, urgency, schedule and "for you" marker in the task experience
 * renders through this component, so a tag looks identical wherever it appears:
 * same height, same radius, same type size, same weight. Colours come from the
 * semantic tokens, never a hard-coded hex, so Light/Dark and a Brand's theme
 * apply to all three surfaces at once.
 */
const TONES = {
  brand:   { bg: 'var(--brand-primary-light)', fg: 'var(--brand-primary)',  bd: 'var(--border-2)' },
  success: { bg: 'var(--color-success-bg)',    fg: 'var(--color-success)',  bd: 'var(--color-success-border)' },
  warning: { bg: 'var(--color-warning-bg)',    fg: 'var(--color-warning)',  bd: 'var(--color-warning-border)' },
  danger:  { bg: 'var(--color-danger-bg)',     fg: 'var(--color-danger)',   bd: 'var(--color-danger-border)' },
  neutral: { bg: 'var(--surface-3)',           fg: 'var(--text-2)',         bd: 'var(--border-1)' },
};

export default function TaskChip({ tone = 'neutral', icon = null, children, style }) {
  const c = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 22, padding: '0 9px',
        borderRadius: 'var(--r-full)',
        background: c.bg, color: c.fg,
        border: `1px solid ${c.bd}`,
        fontSize: 10.5, fontWeight: 800, lineHeight: 1,
        letterSpacing: 0.1, whiteSpace: 'nowrap',
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}