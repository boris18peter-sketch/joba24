import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import MediaLightbox from '@/components/MediaLightbox';
import StatusConfirmSheet from '@/components/StatusConfirmSheet';

/**
 * CompletionApprovalPopup — the worker marked MY task as done, so the approval
 * sheet opens by itself: his proof, the price, and one tap to close the job.
 *
 * It reuses StatusConfirmSheet, the same confirmation sheet the active task card
 * uses, so the automatic popup is the popup the publisher already knows — only
 * the moment it appears is new.
 *
 * ── IT ASKS THE RECORD BEFORE IT OPENS ─────────────────────────────────────
 * The sheet is raised from an alert written at the moment the worker pressed
 * "done". Anything may have happened between that alert and this open:
 *
 *   • the publisher approved from the LOCK SCREEN, without ever seeing the app;
 *   • he approved on another device;
 *   • the task was cancelled.
 *
 * In every one of those cases the alert is history, but it used to open anyway —
 * asking for an approval that had already happened, and failing the moment it was
 * tapped. That is the "I approved on the widget and the popup still came up"
 * complaint, and it is the popup's fault, not the widget's: the widget did its job
 * correctly, and the app never checked.
 *
 * One read of the task on open settles it. A task that is no longer awaiting
 * approval closes this sheet before it is drawn, and the caches are refreshed so
 * the banner and the task lists show the completed job immediately instead of
 * waiting for the next realtime event.
 */
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

export default function CompletionApprovalPopup({ task, onClose }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [freshTask, setFreshTask] = useState(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!task?.id) return undefined;
    let alive = true;

    const refreshCaches = () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['activeClientTask'] });
    };

    base44.entities.Task.get(task.id)
      .then((record) => {
        if (!alive) return;
        const stillAwaiting = record
          && record.worker_status === 'done'
          && !TERMINAL_STATUSES.includes(record.status)
          && record.client_id === task.client_id;
        if (!stillAwaiting) {
          // Already handled (very often: from the Lock Screen). Close silently
          // and let the app catch up, rather than asking a second time.
          refreshCaches();
          onClose();
          return;
        }
        setFreshTask(record);
        setVerified(true);
      })
      // A failed read is never a reason to withhold the sheet: the alert is real
      // evidence on its own, and the approval call re-checks the task anyway.
      .catch(() => { if (alive) setVerified(true); });

    // ── AND IT KEEPS LISTENING WHILE IT IS OPEN ─────────────────────────────
    // The read above covers the sheet that is ABOUT to open. This covers the one
    // already on screen: the publisher can leave it open, approve on the Lock
    // Screen, and be looking at a sheet offering an action that no longer exists.
    // The task record is the truth, so a terminal update closes the sheet here and
    // refreshes the app — rather than letting the tap fail and asking him to
    // figure out why.
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (!alive || event?.id !== task.id) return;
      const next = event.data || {};
      if (!TERMINAL_STATUSES.includes(next.status)) return;
      refreshCaches();
      onClose();
    });

    return () => { alive = false; unsubscribe?.(); };
  }, [task?.id]);

  // The freshest version of the task this sheet may show.
  const current = freshTask || task;

  const proofItems = [
    ...(current?.completion_photos || []).map((url) => ({ type: 'image', url })),
    ...(current?.completion_video_url ? [{ type: 'video', url: current.completion_video_url }] : []),
  ];

  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      const res = await base44.functions.invoke('completeTask', { taskId: current.id });
      // `already_completed` is a SUCCESS, not an error: the job was closed a
      // moment ago (often from the widget) and this tap only had to catch up.
      if (!res.data?.success && res.data?.error !== 'already_completed') {
        throw new Error(res.data?.error || 'שגיאה');
      }
      queryClient.invalidateQueries({ queryKey: ['task', current.id] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['activeClientTask'] });
      toast.success(t('completion_approved_toast') || 'המשימה הושלמה — תודה!');
      // Same hand-off the active task card makes: the rating sheet follows
      // completion, so the publisher rates the worker while it is still fresh.
      window.dispatchEvent(new CustomEvent('show_rating_modal', {
        detail: { task: { ...current, status: 'COMPLETED' } },
      }));
      setApproving(false);
      onClose();
    } catch (err) {
      setApproving(false);
      toast.error(err?.message || t('generic_error') || 'משהו השתבש, נסה שוב');
    }
  };

  // Nothing is drawn until the record agrees — otherwise the alert flashes a
  // sheet that is about to disappear because the job is already closed.
  if (!verified) return null;

  return (
    <>
      <StatusConfirmSheet
        emoji="✅"
        title={t('completion_popup_title') || 'העובד סיים את העבודה'}
        sub={t('completion_popup_sub') || 'אשר את הביצוע כדי לסגור את המשימה ולשחרר את התשלום'}
        confirmLabel={t('completion_approve_btn') || t('confirm_done_work') || 'אשר סיום'}
        confirmColor="linear-gradient(135deg,#059669,#047857)"
        onConfirm={approve}
        onCancel={onClose}
        loading={approving}
      >
        <div style={{
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          borderRadius: 14, padding: '10px 12px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3 }}>
              {current?.title}
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>₪{Math.round(current?.price || 0)}</span>
          </div>

          {proofItems.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-2)', marginBottom: 6 }}>
                <Camera size={12} />
                {t('proof_from_worker') || 'הוכחות מהעובד'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {proofItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(i)}
                    style={{
                      width: 56, height: 56, borderRadius: 10, overflow: 'hidden', padding: 0,
                      border: '1px solid var(--border-1)', cursor: 'pointer', position: 'relative',
                      background: item.type === 'video' ? '#000' : 'var(--surface-2)',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {item.type === 'video' ? (
                      <>
                        <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }} />
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={15} color="#fff" fill="#fff" />
                        </span>
                      </>
                    ) : (
                      <img src={item.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </StatusConfirmSheet>

      {lightbox != null && createPortal(
        <MediaLightbox
          isOpen
          items={proofItems}
          initialIndex={lightbox}
          onClose={() => setLightbox(null)}
        />,
        document.body
      )}
    </>
  );
}