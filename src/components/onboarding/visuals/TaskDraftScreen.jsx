import { MapPin } from 'lucide-react';

/**
 * The publish form's description + location, FILLED IN.
 *
 * This mirrors the real `/create-task` section card for section card: the same
 * section label and the same text field styling (`--input-bg`, 1.5px
 * `--border-1`, radius 12) the live form uses, with the same detected-category
 * chip underneath. It shows a COMPLETED task rather than an empty form — an
 * empty form reads as something the visitor is meant to fill in, which is
 * exactly what a preview must never look like.
 *
 * Only the two things this screen teaches are shown: what you wrote and where.
 * No status pills and no buttons.
 */
const DESCRIPTION =
  'צריך להתקין גוף תאורה חדש בתקרת הסלון. יש סולם וכלים בבית.';

function Field({ children, muted }) {
  return (
    <div
      style={{
        background: 'var(--input-bg)',
        border: '1.5px solid var(--border-1)',
        borderRadius: 12,
        padding: '11px 14px',
        fontSize: 13.5,
        fontWeight: muted ? 500 : 700,
        color: muted ? 'var(--text-2)' : 'var(--text-1)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

export default function TaskDraftScreen() {
  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרסם משימה</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── תאור המשימה — the main input ── */}
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            📝 תאר את המשימה *
          </div>

          <div style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border-1)', borderRadius: 12, padding: '11px 14px' }}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-1)' }}>{DESCRIPTION}</p>
          </div>

          {/* The real auto-detected category chip that appears under the field */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>קטגוריה שזוהתה:</span>
            <span style={{
              background: 'var(--brand-primary-light)',
              border: '1px solid var(--border-2)',
              borderRadius: 10, padding: '3px 10px',
              fontSize: 12, fontWeight: 700, color: 'var(--brand-primary)',
            }}>
              🏷️ חשמל
            </span>
          </div>
        </div>

        {/* ── מיקום ── */}
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
            <MapPin size={14} strokeWidth={2.2} color="var(--text-2)" />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)' }}>מיקום *</span>
          </div>

          {/* Street and city ONLY. A task preview must never show a specific
              address — building, floor and apartment stay private until a
              worker is chosen. */}
          <Field>רחוב פלורנטין, תל אביב</Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, margin: '0 0 4px' }}>בניין / מספר בית</p>
              <Field muted>12</Field>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, margin: '0 0 4px' }}>קומה</p>
              <Field muted>3</Field>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}