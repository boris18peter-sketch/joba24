import { MapPin, Send, Clock, FileText } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { ONBOARDING_TASK } from '@/lib/onboardingDemoTask';

/**
 * The task detail screen, mirroring the real task sheet: the gradient banner
 * with the title, the price and the location, then the detail rows and the
 * apply button exactly as they appear — including the credits line that shows
 * what submitting a request costs.
 *
 * The apply button is the whole point of the screen, so it carries a soft
 * attention pulse and a light sweeping across it. That is what makes the one
 * action obvious at a glance instead of blending into the banner.
 *
 * The banner is the app's own brand gradient, which is dark in Light and Dark
 * Mode alike, so the white-on-banner controls stay legible in both.
 */
export default function TaskDetailScreen() {
  return (
    <>
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרטי המשימה</span>
      </div>

      <div style={{ background: 'var(--surface-1)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── The banner: what the job is, and the one action ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          borderRadius: 20, padding: '16px 16px 14px',
          boxShadow: '0 6px 22px rgba(26,111,212,0.28)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', lineHeight: 1.3 }}>
            {ONBOARDING_TASK.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', letterSpacing: -0.5 }}>{ONBOARDING_TASK.priceLabel}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              <MapPin size={12} /> {ONBOARDING_TASK.location}
            </span>
          </div>

          {/* Apply — the one action this screen teaches, and the reason it
              carries an attention pulse. */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            width: '100%', height: 46, borderRadius: 13, marginTop: 14,
            background: 'rgba(255,255,255,0.22)',
            border: '1.5px solid rgba(255,255,255,0.45)',
            color: '#ffffff', fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            animation: 'onbApplyPulse 1.9s ease-in-out infinite',
          }}>
            <span aria-hidden style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%',
              background: 'linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.5), rgba(255,255,255,0))',
              animation: 'onbApplySheen 2.4s ease-in-out infinite',
            }} />
            <Send size={15} strokeWidth={1.8} />
            הגש מועמדות למשימה — 13 <CreditIcon size={14} />
          </div>

          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>
            💡 הג'ובות חוזרות ליתרה אוטומטית אם הבקשה לא תאושר או המשימה תבוטל
          </div>
        </div>

        {/* ── Detail rows, as the task sheet lists them ── */}
        <div className="j-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5 }}>פרטי המשימה</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
              🔨
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>קטגוריה</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{ONBOARDING_TASK.categoryLabel}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={13} color="var(--color-warning)" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>מועד מדויק</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{ONBOARDING_TASK.time}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={13} color="var(--brand-primary)" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>תיאור</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.5 }}>
                {ONBOARDING_TASK.description}
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes onbApplyPulse {
          0%, 100% { transform: scale(1);     box-shadow: 0 0 0 0 rgba(255,255,255,0.55); }
          50%      { transform: scale(1.028); box-shadow: 0 0 0 7px rgba(255,255,255,0); }
        }
        @keyframes onbApplySheen {
          0%   { transform: translateX(-120%); }
          55%  { transform: translateX(330%); }
          100% { transform: translateX(330%); }
        }
      `}</style>
    </>
  );
}