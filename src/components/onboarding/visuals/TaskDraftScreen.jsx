import { MapPin, Sparkles } from 'lucide-react';

/**
 * The publish form, FILLED IN.
 *
 * This is the same design language as the live screen — the app's card, chip and
 * text tokens — but it shows a COMPLETED task rather than an empty form: an
 * illustration of an empty form reads as something the visitor is meant to fill
 * in, which is exactly what a preview must never look like.
 */
const DESCRIPTION =
  'צריך להתקין גוף תאורה חדש בתקרת הסלון. יש סולם וכלים בבית, העבודה צפויה לקחת כשעה.';

export default function TaskDraftScreen() {
  return (
    <>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרסם משימה</span>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)' }}>
          חינם
        </span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)', marginBottom: 9 }}>תאר את המשימה</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-1)' }}>{DESCRIPTION}</p>

          <div style={{ marginTop: 11, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '9px 12px' }}>
            <Sparkles size={14} strokeWidth={2.3} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>כותרת נוצרה: התקנת מנורה תקרה</span>
          </div>
        </div>

        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
            <MapPin size={14} strokeWidth={2.3} color="var(--brand-primary)" />
            <span style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)' }}>מיקום</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>פלורנטין, תל אביב</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>קומה 3 · דירה 5 · יש מעלית</div>
        </div>
      </div>
    </>
  );
}