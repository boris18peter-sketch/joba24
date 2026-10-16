import { MapPin, Sparkles } from 'lucide-react';

/**
 * The publish form, FILLED IN.
 *
 * This is the same design language as the live screen — the app's card and text
 * tokens — but it shows a COMPLETED task rather than an empty form: an
 * illustration of an empty form reads as something the visitor is meant to fill
 * in, which is exactly what a preview must never look like.
 *
 * Only the two things this slide teaches are shown — what you wrote, and where
 * it is. No status pills and no buttons: nothing that would make the picture
 * look like a form waiting to be completed.
 */
// No estimated duration: the publisher describes the WORK, and never dictates
// how long it takes — that is the worker's call.
const DESCRIPTION =
  'צריך להתקין גוף תאורה חדש בתקרת הסלון. יש סולם וכלים בבית.';

export default function TaskDraftScreen() {
  return (
    <>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרסם משימה</span>
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
          {/* Street and city ONLY. A task preview must never show a specific
              address — the exact building, floor and apartment stay private
              until a worker is chosen. */}
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>רחוב פלורנטין, תל אביב</div>
        </div>
      </div>
    </>
  );
}