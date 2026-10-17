import { Wand2, Sparkles } from 'lucide-react';

/**
 * The price step, mirroring `/create-task` exactly.
 *
 * It carries all four things this screen teaches, in the order the live form
 * puts them:
 *   · the field where YOU set the price (that is how you choose a different one)
 *   · the note that explains when you can still change it
 *   · the AI recommendation card, in the app's own gradient + border + "השתמש"
 *     pill, so accepting it is obviously a single tap
 *
 * Colours are the app's own tokens rather than the live component's hardcoded
 * light values, so the card reads correctly in Dark Mode too.
 */
export default function PricePreviewScreen() {
  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>קביעת מחיר</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
          {/* The price you set */}
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            מחיר (₪) *
          </div>
          <div style={{
            background: 'var(--input-bg)',
            border: '1.5px solid var(--border-1)',
            borderRadius: 12,
            height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            padding: '0 14px',
            fontSize: 18, fontWeight: 800, color: 'var(--text-1)',
            direction: 'ltr',
          }}>
            250
          </div>

          {/* The real note the form shows under the field */}
          <div style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 12, padding: '10px 12px', marginTop: 10,
            fontSize: 12, color: 'var(--color-warning)', fontWeight: 600, lineHeight: 1.5,
          }}>
            שני הצדדים צריכים לכבד את המחיר שסוכם.
          </div>
        </div>

        {/* ── The AI recommendation — the app's own suggestion card ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-primary-light), var(--brand-primary-light))',
          border: '1.5px solid var(--border-2)',
          borderRadius: 14,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <Wand2 size={16} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--brand-primary)', fontWeight: 800 }}>המלצת מחיר AI</span>
            </div>
            <span style={{
              fontSize: 10, color: 'var(--brand-primary)', fontWeight: 700,
              background: 'var(--surface-2)', borderRadius: 6, padding: '2px 6px',
              whiteSpace: 'nowrap', border: '1px solid var(--border-2)',
            }}>
              לפי תיאור המשימה
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
            <div dir="ltr" style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.5, unicodeBidi: 'isolate' }}>
              ₪220–₪300
            </div>
            <div style={{ background: 'var(--brand-primary)', color: '#ffffff', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              השתמש
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'var(--color-success-bg)', color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 999, padding: '2px 8px',
            }}>
              רמת ביטחון: גבוהה
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'var(--surface-2)', color: 'var(--text-2)',
              border: '1px solid var(--border-1)',
              borderRadius: 999, padding: '2px 8px',
            }}>
              מבוסס על 18 משימות דומות
            </span>
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={11} style={{ flexShrink: 0 }} />
            מבוסס על מחירי שוק עדכניים ועבודות דומות
          </div>
        </div>

      </div>
    </>
  );
}