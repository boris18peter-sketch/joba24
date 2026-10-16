import { Sparkles } from 'lucide-react';

/**
 * The price step — the two things this slide teaches, each large enough to read
 * at a glance: the price you set, and the AI's suggestion.
 *
 * The slide's own line already says the final decision is yours, so the picture
 * carries no second copy of that message and no button — it shows a price being
 * set, not a form waiting to be submitted.
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
        </div>
      </div>
    </>
  );
}