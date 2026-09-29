import { ChevronRight, Star, CheckCircle2, Briefcase, Lock, MessageCircle, X, Check } from 'lucide-react';
import UserVerificationBadge from '@/components/UserVerificationBadge';
import { DEMO_APPLICANTS, DEMO_TASKS } from '@/lib/storekit/demoData';

const task = DEMO_TASKS[2];

/**
 * FRAME 05 — "אתם בוחרים מי מתאים לכם"
 * The real applicants experience: every row is the same row TaskApplicants
 * renders — avatar, rating, verification badge, completed-task count, the
 * applicant's message, and the owner's Approve / Decline controls.
 */
export default function ChooseHelperScreen() {
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.title}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>
            ₪{task.price} · {task.city}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: '12px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3, marginBottom: 10 }}>
          {DEMO_APPLICANTS.length + 2} בקשות
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DEMO_APPLICANTS.map(app => (
            <div
              key={app.id}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 900,
                    color: '#ffffff',
                    flexShrink: 0,
                    border: app.verified ? `2px solid ${app.social ? '#fbbf24' : '#16a34a'}` : '2px solid transparent',
                  }}
                >
                  {app.worker_name[0]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{app.worker_name}</span>
                    <UserVerificationBadge
                      user={{ kyc_status: app.verified ? 'approved' : 'none', instagram_verified: app.social }}
                      size="sm"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                      <Star size={11} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                      {app.rating.toFixed(1)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
                      <Briefcase size={10} /> {app.tasks_completed} משימות
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>
                    <Lock size={9} color="#d97706" /> הטלפון נחשף לאחר אישור
                  </div>
                </div>

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MessageCircle size={16} color="#1a6fd4" />
                </div>
              </div>

              {app.message && (
                <div style={{ padding: '0 14px 8px' }}>
                  <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    {app.message}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-1)', padding: '8px 14px', display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 11,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-1)',
                    color: 'var(--text-2)',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <X size={15} /> דחייה
                </div>
                <div
                  style={{
                    flex: 1.5,
                    height: 40,
                    borderRadius: 11,
                    background: 'linear-gradient(135deg,#059669,#047857)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 2px 10px rgba(5,150,105,0.3)',
                  }}
                >
                  <CheckCircle2 size={15} /> בחירת העובד
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>
          <Check size={12} /> אתם מחליטים את מי לבחור
        </div>
      </div>
    </>
  );
}