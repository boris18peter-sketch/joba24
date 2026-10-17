import AppTopBar from '@/components/storekit/AppTopBar';
import TaskCard from '@/components/TaskCard';
import { DEMO_TASKS } from '@/lib/storekit/demoData';

/**
 * The real task feed, plus the real task notification the app raises for a
 * matching job. This is the screen that teaches the TWO ways to find work: an
 * alert that comes to you, and browsing the feed yourself.
 *
 * The card is the app's own TaskCard, so its price, its location and its layout
 * are the live ones. Every colour is a design token, so the illustration matches
 * the interface in Light and Dark alike. The feed is inert — it is an
 * illustration.
 */
export default function FeedScreen() {
  return (
    <>
      <AppTopBar />

      <div style={{ position: 'relative', background: 'var(--surface-1)' }}>
        <div style={{ display: 'flex', gap: 7, padding: '10px 12px 8px', background: 'var(--surface-2)', boxShadow: '0 1px 0 var(--border-1)' }}>
          {['חשמל', 'ניקיון', 'הובלה', 'הנדימן'].map(label => (
            <span key={label} style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
          <TaskCard task={{ ...DEMO_TASKS[0], _isFirstCard: true }} currentUserId="onboarding-viewer" />
        </div>

        {/* The app's own new-task alert, arriving over the feed exactly as it
            does in the live app. */}
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, padding: '0 12px', animation: 'onbNotifIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both' }}>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ height: 3, background: 'var(--border-1)' }}>
              <div style={{ height: '100%', width: '58%', background: 'var(--brand-primary)' }} />
            </div>
            <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                ⚡
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 3, lineHeight: 1.25 }}>
                  משימה חדשה באזור שלך
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  התקנת מנורה תקרה בסלון · ₪180
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onbNotifIn {
          from { opacity: 0; transform: translateY(24px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}