import { Play, SkipForward, Square, RefreshCw, Trash2, CircleAlert, CircleCheck } from 'lucide-react';

const CARD = { padding: 14, display: 'flex', flexDirection: 'column', gap: 12 };

/**
 * Everything the operator can press, plus the honest result of the last press.
 * The buttons never assume an outcome: each one reports what iOS answered.
 */
export default function TestStageControls({
  role,
  stages,
  stage,
  onRole,
  onStage,
  onStart,
  onAdvance,
  onEnd,
  onEndAll,
  onRefresh,
  busy,
  feedback,
  startable,
  running,
}) {
  return (
    <div className="j-card" style={CARD}>
      {/* Role — the two sides of one task, exactly as the app splits them. */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ key: 'publisher', label: 'תצוגת מפרסם' }, { key: 'worker', label: 'תצוגת עובד' }].map((option) => {
          const active = role === option.key;
          return (
            <button
              key={option.key}
              onClick={() => onRole(option.key)}
              aria-pressed={active}
              style={{
                flex: 1, height: 40, borderRadius: 11, cursor: 'pointer',
                border: `1.5px solid ${active ? 'var(--brand-primary)' : 'var(--border-1)'}`,
                background: active ? 'var(--brand-primary-light)' : 'var(--surface-2)',
                color: active ? 'var(--brand-primary-dark, var(--brand-primary))' : 'var(--text-2)',
                fontSize: 13, fontWeight: 800,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Stage — the canonical lifecycle, never a new one. */}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-3)', marginBottom: 7 }}>שלב לבדיקה</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stages.map((option) => {
            const active = stage === option.key;
            return (
              <button
                key={option.key}
                onClick={() => onStage(option.key)}
                aria-pressed={active}
                style={{
                  height: 34, padding: '0 12px', borderRadius: 99, cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--brand-primary)' : 'var(--border-1)'}`,
                  background: active ? 'var(--brand-primary)' : 'var(--surface-2)',
                  color: active ? '#ffffff' : 'var(--text-2)',
                  fontSize: 11.5, fontWeight: 800,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions. One dominant action per state: start, then advance, then end. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onStart}
          disabled={busy || !startable}
          className="j-btn j-btn-primary"
          style={{ width: '100%', height: 48, fontSize: 15 }}
        >
          <Play size={16} /> התחל פעילות
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAdvance} disabled={busy || !running} className="j-btn j-btn-secondary" style={{ flex: 1, height: 44 }}>
            <SkipForward size={15} /> עדכן שלב
          </button>
          <button onClick={onEnd} disabled={busy} className="j-btn j-btn-danger" style={{ flex: 1, height: 44 }}>
            <Square size={14} /> סיים פעילות
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRefresh} disabled={busy} className="j-btn j-btn-ghost" style={{ flex: 1, height: 40, fontSize: 12.5 }}>
            <RefreshCw size={14} /> רענן רשימה
          </button>
          <button onClick={onEndAll} disabled={busy} className="j-btn j-btn-ghost" style={{ flex: 1, height: 40, fontSize: 12.5 }}>
            <Trash2 size={14} /> סיים הכול
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            padding: '10px 12px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.45,
            fontWeight: 700,
            color: feedback.ok ? 'var(--color-success)' : 'var(--color-danger)',
            background: feedback.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${feedback.ok ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
          }}
        >
          {feedback.ok ? <CircleCheck size={15} style={{ flexShrink: 0, marginTop: 1 }} /> : <CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}