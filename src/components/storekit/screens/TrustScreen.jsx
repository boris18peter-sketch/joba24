import { ChevronRight, Star, ShieldCheck, BadgeCheck, Clock, Repeat, Briefcase, Sparkles } from 'lucide-react';
import UserVerificationBadge from '@/components/UserVerificationBadge';
import { DEMO_PROFILE, DEMO_REVIEWS } from '@/lib/storekit/demoData';

const VERIFIED_USER = { kyc_status: 'approved', instagram_verified: true };

/**
 * FRAME 07 — "אנשים אמיתיים. פרופילים אמיתיים."
 * Only what Joba24 actually implements: identity verification (KYC), the
 * verification badge, star ratings from completed tasks, on-time rate and
 * repeat hires. Nothing is claimed that the product does not do.
 */
export default function TrustScreen() {
  return (
    <>
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          background: 'var(--surface-2)',
          boxShadow: '0 1px 0 var(--border-1)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color="var(--text-2)" />
        </div>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרופיל</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: 14 }}>
        {/* Hero */}
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 18,
            padding: 16,
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 900,
                color: '#ffffff',
                flexShrink: 0,
                border: '2px solid #fbbf24',
              }}
            >
              {DEMO_PROFILE.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{DEMO_PROFILE.name}</span>
                <UserVerificationBadge user={VERIFIED_USER} size="md" />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600, marginTop: 2 }}>
                {DEMO_PROFILE.profession}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <Star key={i} size={13} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                ))}
                <span style={{ fontSize: 12, fontWeight: 800, color: '#b45309', marginInlineStart: 3 }}>
                  {DEMO_PROFILE.rating}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
                  ({DEMO_PROFILE.rating_count} דירוגים)
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
            {[
              { icon: <Briefcase size={15} color="#1a6fd4" />, value: DEMO_PROFILE.tasks_completed, label: 'משימות' },
              { icon: <Clock size={15} color="#1a6fd4" />, value: `${DEMO_PROFILE.on_time_rate}%`, label: 'בזמן' },
              { icon: <Repeat size={15} color="#1a6fd4" />, value: DEMO_PROFILE.repeat_hires, label: 'חזרו אליה' },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  borderInlineEnd: i < 2 ? '1px solid var(--border-1)' : 'none',
                }}
              >
                {s.icon}
                <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>{s.value}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verification — real features only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 14,
              padding: '11px 14px',
            }}
          >
            <BadgeCheck size={19} color="#059669" strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#14532d' }}>אימות זהות</span>
            <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 800, color: '#059669' }}>
              אושר
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 14,
              padding: '11px 14px',
            }}
          >
            <ShieldCheck size={19} color="#d97706" strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>רשת חברתית מקושרת</span>
            <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 800, color: '#b45309' }}>
              מאומת
            </span>
          </div>
        </div>

        {/* Reviews */}
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3, marginBottom: 8 }}>
          ביקורות אחרונות
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DEMO_REVIEWS.map(r => (
            <div
              key={r.id}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 14,
                padding: '11px 13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)' }}>{r.name}</span>
                <span style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} size={10} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                  ))}
                </span>
                <span
                  style={{
                    marginInlineStart: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#059669',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: 999,
                    padding: '2px 7px',
                  }}
                >
                  <Sparkles size={9} /> משימה שהושלמה
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{r.text}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}