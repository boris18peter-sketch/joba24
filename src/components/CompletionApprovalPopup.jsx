import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import MediaLightbox from '@/components/MediaLightbox';

/**
 * CompletionApprovalPopup — the worker marked MY task as done, so the approval
 * sheet opens by itself: his proof, the price, and one tap to close the job.
 *
 * It is the automatic half of the "אשר סיום" button that already lives on the
 * active task card (and calls the same `completeTask`), because the publisher
 * has no reason to know that the worker's update arrived.
 */
export default function CompletionApprovalPopup({ task, onClose }) {
  const { t, isRTL } = useLanguage();
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

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--brand-modal-bg, var(--surface-1))',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: 'var(--shadow-xl)',
          padding: '12px 16px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 18px' }} />

        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: '0 auto 10px',
            background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={27} color="var(--color-success)" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3 }}>
            {t('completion_popup_title') || 'העובד סיים את העבודה'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 5 }}>
            {t('completion_popup_sub') || 'אשר את הביצוע כדי לסגור את המשימה ולשחרר את התשלום'}
          </div>
        </div>

        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3 }}>
              {task?.title}
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>₪{Math.round(task?.price || 0)}</span>
          </div>
          {task?.worker_name && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700, marginTop: 5 }}>
              {task.worker_name}
            </div>
          )}

          {proofItems.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 7 }}>
                <Camera size={12} />
                {t('proof_from_worker_title') || 'הוכחות מהעובד'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {proofItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(i)}
                    style={{
                      width: 62, height: 62, borderRadius: 10, overflow: 'hidden', padding: 0,
                      border: '1px solid var(--border-1)', cursor: 'pointer', position: 'relative',
                      background: item.type === 'video' ? '#000' : 'var(--surface-3)',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {item.type === 'video' ? (
                      <>
                        <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }} />
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera size={17} color="#fff" />
                        </span>
                      </>
                    ) : (
                      <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              height: 52, padding: '0 18px', borderRadius: 14, flexShrink: 0,
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t('later_btn') || 'אחר כך'}
          </button>
          <button
            onClick={approve}
            disabled={approving}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg,#059669,#047857)',
              border: 'none', fontSize: 15.5, fontWeight: 900, color: '#ffffff',
              cursor: approving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: approving ? 'none' : '0 6px 18px rgba(5,150,105,0.3)',
              opacity: approving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {approving ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <CheckCircle2 size={17} strokeWidth={2.4} />
                <span>{t('completion_approve_btn') || 'אשר סיום'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <MediaLightbox
        isOpen={lightbox != null}
        items={proofItems}
        initialIndex={lightbox || 0}
        onClose={() => setLightbox(null)}
      />
    </div>,
    document.body
  );
}