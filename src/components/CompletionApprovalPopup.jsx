import { useState } from 'react';
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
 */
export default function CompletionApprovalPopup({ task, onClose }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const proofItems = [
    ...(task?.completion_photos || []).map((url) => ({ type: 'image', url })),
    ...(task?.completion_video_url ? [{ type: 'video', url: task.completion_video_url }] : []),
  ];

  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      const res = await base44.functions.invoke('completeTask', { taskId: task.id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
      toast.success(t('completion_approved_toast') || 'המשימה הושלמה — תודה!');
      // Same hand-off the active task card makes: the rating sheet follows
      // completion, so the publisher rates the worker while it is still fresh.
      window.dispatchEvent(new CustomEvent('show_rating_modal', {
        detail: { task: { ...task, status: 'COMPLETED' } },
      }));
      setApproving(false);
      onClose();
    } catch (err) {
      setApproving(false);
      toast.error(err?.message || t('generic_error') || 'משהו השתבש, נסה שוב');
    }
  };

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
              {task?.title}
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>₪{Math.round(task?.price || 0)}</span>
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