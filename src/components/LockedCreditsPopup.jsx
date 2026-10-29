import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchPublicTasks } from '@/lib/publicTasks';
import { Lock, Loader2, RotateCcw } from 'lucide-react';
import PopupClose from '@/components/ui/PopupClose';
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
  const { t, isRTL } = useLanguage();
  const { user: me } = useAuth();
  const [cancellingId, setCancellingId] = useState(null);

  const pendingApps = (applications || []).filter(a => a.status === 'pending');

  // ── The popup lives and dies with what it shows ──────────────────────────
  // Cancelling the LAST commitment left the sheet open on an empty state with
  // nothing to act on, so the visitor had to dismiss a popup that no longer had
  // a reason to exist. Once there is nothing held any more, it closes itself.
  // The short delay absorbs the refetch that follows a cancel (a list that is
  // momentarily empty between two renders must not shut the sheet).
  const hadItemsRef = useRef(false);
  const countRef = useRef(pendingApps.length);
  countRef.current = pendingApps.length;
  useEffect(() => {
    if (pendingApps.length > 0) { hadItemsRef.current = true; return; }
    if (!hadItemsRef.current) return;
    const timer = setTimeout(() => { if (countRef.current === 0) onClose?.(); }, 400);
    return () => clearTimeout(timer);
  }, [pendingApps.length, onClose]);

  // Fetch the full task data for each pending application so we can render the
  // real TaskCard (the application record only carries a denormalized task_title).
  const taskIds = useMemo(
    () => [...new Set(pendingApps.map(a => a.task_id).filter(Boolean))].sort(),
    [pendingApps]
  );
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['lockedPopupTasks', taskIds],
    queryFn: () => fetchPublicTasks({ mode: 'byIds', taskIds }),
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
          // `relative` is what keeps the close button INSIDE the sheet — without
          // it the absolutely-positioned X anchored to the full-screen overlay
          // and appeared in the corner of the screen, detached from the popup.
          position: 'relative',
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

        <PopupClose onClick={onClose} label={t('close')} />

        {/* Header */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 42 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock size={20} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{t('locked_title')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>
                {t('locked_sub')}
              </div>
            </div>
          </div>

          {/* Total locked badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 14, padding: '12px 16px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{t('locked_total')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 20, fontWeight: 900, color: '#b45309' }}>
              {lockedTotal}
              <CreditIcon size={18} />
            </span>
          </div>
        </div>

        {/* Compact explanation — one clean line */}
        <div style={{ padding: '12px 20px 4px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
          <Lock size={12} color="#d97706" style={{ flexShrink: 0 }} />
          <span>{t('locked_note')}</span>
        </div>

        {/* Applications list — real TaskCards for full visual consistency with the feed */}
        <div style={{ padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pendingApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)', fontSize: 14 }}>
              <Lock size={36} color="var(--border-2)" style={{ margin: '0 auto 12px', display: 'block' }} />
              {t('locked_empty')}
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
                      <CreditIcon size={12} /> {t('locked_in_commitment')}
                    </span>
                  </div>
                  {task ? (
                    <TaskCard task={task} myApp={app} currentUserId={me?.id} workerName={me?.full_name} />
                  ) : (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.task_title || t('locked_task_fallback')}
                      </div>
                      <button
                        onClick={() => handleCancelFallback(app)}
                        disabled={cancellingId === app.id}
                        style={{ height: 38, padding: '0 14px', borderRadius: 10, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        {cancellingId === app.id ? <Loader2 size={14} className="animate-spin" /> : <><RotateCcw size={13} /> {t('locked_cancel_app')}</>}
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