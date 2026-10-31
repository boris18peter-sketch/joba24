/**
 * TaskSurface — the ONE card surface the task experience is built from.
 *
 * The task card, the active task panel and every block inside the task detail
 * sheet sit on this surface, so the radius, border, background and shadow are
 * a single decision instead of four slightly different ones. A Brand's card
 * tokens still win, exactly as they do everywhere else in the app.
 */
export default function TaskSurface({ children, style, onClick, padded = true, ...rest }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--brand-card-bg, var(--surface-2))',
        border: '1px solid var(--brand-card-border, var(--border-1))',
        borderRadius: 'var(--brand-card-radius, var(--r-lg))',
        boxShadow: 'var(--brand-card-shadow, var(--shadow-xs))',
        padding: padded ? 14 : 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}