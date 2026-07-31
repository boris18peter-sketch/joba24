import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Lock, Loader2, RotateCcw } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import TaskCard from '@/components/TaskCard';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';

/**
 * LockedCreditsPopup — shows pending applications (jobas held in commitment).
 * Renders the REAL TaskCard for each pending task so the popup matches the feed
 * exactly. The TaskCard's built-in pending banner already shows the status and
 * a cancel button, so cancellation works identically to the feed.
 */
export default function LockedCreditsPopup({ applications, lockedTotal, onClose }) {
  const { isRTL } = useLanguage();
  const { user: me } = useAuth();
  const [cancellingId, setCancellingId] = useState(null);

  const pendingApps = (applications || []).filter(a => a.status === 'pending');

  // Fetch the full task data for each pending application so we can render the
  // real TaskCard (the application record only carries a denormalized task_title).
  const taskIds = useMemo(
    () => [...new Set(pendingApps.map(a => a.task_id).filter(Boolean))].sort(),
    [pendingApps]
  );
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['lockedPopupTasks', taskIds],
    queryFn: () => base44.entities.Task.filter({ id: { $in: taskIds } }, '-created_date', 50),
    enabled: taskIds.length > 0,
    staleTime: 30000,
  });

  // Fallback cancel — only used when the full task can't be loaded (e.g. deleted).
  // The TaskCard handles its own cancel for loaded tasks.
  const handleCancelFallback = async (app) => {
    if (cancellingId) return;
    setCancellingId(app.id);
    try {
      const res = await base44.functions.invoke('cancelMyApplication', {
        applicationId: app.id,
        taskId: app.task_id,
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
      // The AuthContext TaskApplication subscription invalidates the locked-balance
      // queries automatically, so the card will disappear once the parent refetches.
    } catch {
      // keep item
    } finally {
      setCancellingId(null);
    }
  };

  return createPortal(
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        touchAction: 'manipulation',
      }}
    >
      <div
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '88dvh', overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.34,1.4,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 18px' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <X size={16} color="var(--text-2)" />
        </button>

        {/* Header */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock size={20} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>ג'ובות בהתחייבות</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>
                ג'ובות שהוקפאו עבור בקשות שממתינות לאישור
              </div>
            </div>
          </div>

          {/* Total locked badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>סה"כ בהתחייבות</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 20, fontWeight: 900, color: '#b45309' }}>
              {lockedTotal}
              <CreditIcon size={18} />
            </span>
          </div>
        </div>

        {/* Compact explanation — one clean line */}
        <div style={{ padding: '12px 20px 4px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
          <Lock size={12} color="#d97706" style={{ flexShrink: 0 }} />
          <span>חוזרות אוטומטית ליתרה אם הבקשה נדחית, פגה או נבחר עובד אחר.</span>
        </div>

        {/* Applications list — real TaskCards for full visual consistency with the feed */}
        <div style={{ padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pendingApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: 14 }}>
              <Lock size={36} color="var(--border-2)" style={{ margin: '0 auto 12px', display: 'block' }} />
              אין כרגע ג'ובות בהתחייבות
            </div>
          ) : tasksLoading && tasks.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={26} className="animate-spin" color="var(--brand-primary)" />
            </div>
          ) : (
            pendingApps.map((app) => {
              const task = tasks.find(t => t.id === app.task_id);
              return (
                <div key={app.id}>
                  {/* Per-card locked amount — the card itself shows the pending status */}
                  <div style={{ padding: '0 4px 6px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={11} strokeWidth={2.5} /> {app.credits_charged || 0}
                      <CreditIcon size={12} /> בהתחייבות
                    </span>
                  </div>
                  {task ? (
                    <TaskCard task={task} myApp={app} currentUserId={me?.id} workerName={me?.full_name} />
                  ) : (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.task_title || 'משימה'}
                      </div>
                      <button
                        onClick={() => handleCancelFallback(app)}
                        disabled={cancellingId === app.id}
                        style={{ height: 38, padding: '0 14px', borderRadius: 10, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        {cancellingId === app.id ? <Loader2 size={14} className="animate-spin" /> : <><RotateCcw size={13} /> בטל בקשה</>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}