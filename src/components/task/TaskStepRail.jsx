/**
 * TaskStepRail — the compact progress indicator.
 *
 * One hairline track with a brand-coloured fill, and the step names underneath.
 * It replaces the row of oversized circular icons: the same three canonical
 * steps are still read at a glance, but the panel stays quiet and short.
 *
 * The steps and the active index come from the existing task status flow — this
 * component never invents a step, it only draws the ones it is handed.
 */
export default function TaskStepRail({ steps = [], activeIndex = -1, tone = 'brand', style }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const n = steps.length;
  const pct = activeIndex < 0 ? 0 : Math.round(((Math.min(activeIndex, n - 1) + 1) / n) * 100);
  const fill = tone === 'success' ? 'var(--color-success)' : 'var(--brand-primary)';

  return (
    <div style={style}>
      <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', top: 0, bottom: 0,
            insetInlineStart: 0, width: `${pct}%`,
            background: fill, borderRadius: 99,
            transition: 'width 0.45s cubic-bezier(0.32,0.72,0,1)',
          }}
        />
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {steps.map((s, i) => {
          const done = activeIndex >= 0 && i <= activeIndex;
          const active = i === activeIndex;
          return (
            <div
              key={s.key || i}
              style={{
                flex: 1, minWidth: 0, padding: '0 2px', textAlign: 'center',
                fontSize: 10, lineHeight: 1.25,
                fontWeight: active ? 800 : 600,
                color: active ? 'var(--text-1)' : done ? 'var(--text-2)' : 'var(--text-3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}