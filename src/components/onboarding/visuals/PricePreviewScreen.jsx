import { Check, Sparkles } from 'lucide-react';

/**
 * The price step — the three things this slide teaches, each large enough to
 * read at a glance: the price you set, the AI's suggestion, and the fact that
 * the final decision is yours.
 *
 * Built from the app's own tokens, so it matches the interface in Light and Dark
 * alike. Text always uses the app's text tokens (never the brand blue on a tint)
 * so contrast holds in both modes.
 */
export default function PricePreviewScreen() {
  return (
    <>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>קביעת מחיר</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* The price you set — the headline number */}
        <div className="j-card" style={{ padding: '16px 16px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)' }}>המחיר שאתה קובע</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -1.5, lineHeight: 1.1, marginTop: 4 }}>
            ₪250
          </div>
        </div>

        {/* The AI's suggestion */}
        <div className="j-card" style={{ padding: '14px 14px 16px', border: '1.5px solid var(--brand-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} strokeWidth={2.3} color="var(--brand-primary)" />
            <span style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--text-1)' }}>הצעת המחיר של ה־AI</span>
          </div>
          <div style={{ fontSize: 27, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.8, marginTop: 6 }}>
            ₪220–₪300
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 3 }}>
            לפי סוג העבודה ומחירי השוק
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 11, padding: '8px 14px', borderRadius: 999, background: 'var(--brand-primary)', color: '#ffffff', fontSize: 12.5, fontWeight: 900 }}>
            השתמש בהצעה
          </span>
        </div>

        {/* The point of the whole step */}
        <div className="j-card" style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--color-success-border)' }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={14} strokeWidth={3} color="var(--color-success)" />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)' }}>אתה קובע את המחיר הסופי</span>
        </div>
      </div>
    </>
  );
}