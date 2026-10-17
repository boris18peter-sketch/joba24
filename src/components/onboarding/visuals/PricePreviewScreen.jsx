import { Wand2, Sparkles } from 'lucide-react';
import { ONBOARDING_TASK } from '@/lib/onboardingDemoTask';

/**
 * The price step, mirroring `/create-task` — and, above all, stating the model.
 *
 * The publisher has to leave this screen understanding the one thing that makes
 * Joba24 different from asking a professional for a quote: HERE you name the
 * price, everyone sees it, and only the people it suits apply. So the strip at
 * the top says exactly that, and the two things below it show how it works in
 * practice — the field where YOU set the number, and the AI card that helps you
 * pick a fair one.
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
            {ONBOARDING_TASK.price}
          </div>
        </div>

        {/* ── The AI recommendation — the app's own suggestion card ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-primary-light), var(--brand-primary-light))',
          border: '1.5px solid var(--border-2)',
          borderRadius: 14,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <Wand2 size={16} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--brand-primary)', fontWeight: 800 }}>המלצת מחיר AI</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
            <div dir="ltr" style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.5, unicodeBidi: 'isolate' }}>
              ₪220–₪300
            </div>
            <div style={{ background: 'var(--brand-primary)', color: '#ffffff', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              השתמש
            </div>
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