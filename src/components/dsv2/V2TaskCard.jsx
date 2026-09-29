/**
 * Design System V2 — Task card.
 *
 * Only what a worker needs to decide whether to open it:
 * title · location/distance/time · price · 1 attribute · 1 action.
 * No emoji, no badge stack, no per-card stats, no nested boxes.
 */
export default function V2TaskCard({ task }) {
  return (
    <div className="v2-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <h3 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.35, color: 'var(--v2-ink)' }}>
          {task.title}
        </h3>
        <div style={{ flexShrink: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--v2-ink)' }}>
          ₪{task.price}
        </div>
      </div>

      <p className="v2-meta" style={{ marginTop: 6 }}>
        {task.city} · {task.distance} · {task.postedAgo}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span className="v2-meta-2" style={{ whiteSpace: 'nowrap' }}>{task.category}</span>
          {task.urgent ? (
            <span className="v2-chip v2-chip-danger">דחוף</span>
          ) : (
            <span className="v2-meta" style={{ whiteSpace: 'nowrap' }}>· {task.timing}</span>
          )}
        </div>
        <button className="v2-btn v2-btn-primary v2-btn-sm">הגש בקשה</button>
      </div>
    </div>
  );
}