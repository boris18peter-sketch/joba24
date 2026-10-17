import { Sparkles } from 'lucide-react';
import { ONBOARDING_TASK } from '@/lib/onboardingDemoTask';

/**
 * The price step, mirroring `/create-task` — and, above all, stating the model.
 *
 * Two things have to land here:
 *
 *   1. HERE you name the price, everyone sees it, and only the people it suits
 *      apply. That is the strip at the top.
 *   2. The AI picks a fair number FOR you, from the description you just wrote.
 *      That is the card below, and it is built to read as the new thing on the
 *      screen: a living gradient border, a soft sheen, an "AI" pill and a
 *      "new in Joba24" tag — unmistakably the highlight, not one more card.
 *
 * Colours are the app's own tokens rather than the live component's hardcoded
 * light values, so the whole screen reads correctly in Dark Mode too.
 */
export default function PricePreviewScreen() {
  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>קביעת מחיר</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── The model, in one card: you name the price, they come to you ── */}
        <div style={{
          background: 'var(--brand-primary-light)',
          border: '1.5px solid var(--border-2)',
          borderRadius: 14,
          padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0, fontSize: 15,
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--brand-primary)' }}>
              אתם קובעים את המחיר
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 3 }}>
              העובדים רואים בדיוק את המחיר שכתבתם, ורק מי שהמחיר מתאים לו מגיש מועמדות. כך מקבלים פניות אמיתיות — בלי משא ומתן ובלי הפתעות.
            </div>
          </div>
        </div>

        {/* The price you set */}
        <div className="j-card" style={{ padding: '14px 14px 16px' }}>
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
            {ONBOARDING_TASK.price}
          </div>
        </div>

        {/* ── The AI recommendation — the element that has to read as NEW ── */}
        <div className="j-ai-card">
          <div className="j-ai-inner">
            <span className="j-ai-sheen" aria-hidden />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
              <span className="j-ai-pill"><Sparkles size={10} /> AI</span>
              <span className="j-ai-new">חדש ב-Joba24</span>
            </div>

            <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--text-1)', marginTop: 9, lineHeight: 1.3, position: 'relative' }}>
              ה־AI ממליץ על המחיר המתאים
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5, position: 'relative' }}>
              לפי תיאור המשימה ומחירי השוק
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 11, position: 'relative' }}>
              <div dir="ltr" style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.5, unicodeBidi: 'isolate' }}>
                ₪220–₪300
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#6366f1,var(--brand-primary))',
                color: '#ffffff', borderRadius: 11, padding: '8px 15px',
                fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}>
                השתמש בהמלצה
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}