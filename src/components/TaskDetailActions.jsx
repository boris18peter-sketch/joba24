import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, RotateCcw, DoorOpen, Loader2, FileText } from 'lucide-react';
import { buildRepostUrl } from '@/lib/taskUtils';
import { toast } from 'sonner';
import RatingModal from '@/components/RatingModal';
import InvoiceModal from '@/components/InvoiceModal';
import ApplySheet from '@/components/ApplySheet';
import { invalidateTaskCaches } from '@/lib/taskSync';
import { useLanguage } from '@/lib/LanguageContext';

export default function TaskDetailActions({
  task, me, id, isOwner, isWorker,
  canApplyManual, myApp, myReview, applyLoading,
  onApply, onSetShowApplyForm, showApplyForm, onSheetClose,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  // Leaving an active task is irreversible — it always asks for confirmation.
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const cancelTakeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('workerLeaveTask', { taskId: id });
      if (!res.data?.success) throw new Error(res.data?.error || 'שגיאה');
    },
    onSuccess: () => {
      queryClient.setQueryData(['myApp', id, me?.id], null);
      invalidateTaskCaches(queryClient, { taskId: id, meId: me?.id });
      setShowExitConfirm(false);
      toast.success(t('left_task_credits_back'));
      navigate('/');
    },
    onError: () => { setShowExitConfirm(false); toast.error(t('tda_exit_error')); },
  });

  const reopenMutation = useMutation({
    mutationFn: () => base44.entities.Task.update(id, {
      status: 'OPEN', expires_at: null, worker_id: null, worker_name: null,
      worker_status: null, last_boost_at: null, boost_count: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success(t('task_reopened_toast'));
    },
  });

  const isCompleted = task?.status === 'COMPLETED';
  const isParticipant = me?.id === task?.client_id || me?.id === task?.worker_id;

  return (
    <>
      <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Apply sheet portal */}
        {canApplyManual && showApplyForm && createPortal(
          <ApplySheet
            task={task}
            loading={applyLoading}
            onClose={() => onSetShowApplyForm(false)}
            onApply={(msg) => onApply(msg, [])}
          />,
          document.body
        )}

        {/* Invoice button — worker after completion, no location map */}
        {isCompleted && me?.id === task?.worker_id && !(task?.lat && task?.lng) && (
          <button
            onClick={() => setShowInvoice(true)}
            style={{ width: '100%', height: 48, borderRadius: 14, background: task?.requires_invoice ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#faf5ff', border: task?.requires_invoice ? 'none' : '1.5px solid #e9d5ff', color: task?.requires_invoice ? 'white' : '#7c3aed', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: task?.requires_invoice ? '0 4px 14px rgba(124,58,237,0.3)' : 'none' }}>
            <FileText size={16} />
            {task?.requires_invoice ? t('generate_tax_invoice_required') : t('generate_tax_invoice_btn')}
          </button>
        )}

        {/* Rating CTA */}
        {isCompleted && isParticipant && myReview === null && !hasRated && (
          <button
            onClick={() => setShowRating(true)}
            style={{ width: '100%', height: 52, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,var(--brand-accent),var(--brand-accent-dark))', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, boxShadow: '0 4px 14px rgba(251,191,36,0.35)' }}>
            <Star size={16} style={{ fill: 'white' }} /> {t('tda_rate_person', { name: me?.id === task?.client_id ? task?.worker_name : task?.client_name })}
          </button>
        )}
        {isCompleted && isParticipant && myReview && (
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 'var(--r-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 700 }}>
            <Star size={15} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
            {[1,2,3,4,5].slice(0, myReview.rating).map(() => '★').join('')} {t('tda_rating_saved')}
          </div>
        )}

        {/* Repost */}
        {isOwner && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(task?.status) && (
          <button
            onClick={() => { window.dispatchEvent(new CustomEvent('hide_task_sheet')); navigate(buildRepostUrl(task)); }}
            style={{ width: '100%', height: 48, borderRadius: 'var(--r-md)', background: 'var(--brand-primary-light)', border: '1px solid #bfdbfe', color: 'var(--brand-primary)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
            <RotateCcw size={16} /> {t('repost')}
          </button>
        )}

        {/* Exit task */}
        {isWorker && task?.status === 'TAKEN' && task?.worker_status !== 'done' && (
          <button
            onClick={() => setShowExitConfirm(true)}
            disabled={cancelTakeMutation.isPending}
            style={{ width: '100%', height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
            {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> {t('tda_exit_task_btn')}</>}
          </button>
        )}
      </div>

      {showRating && task && me && createPortal(
        <RatingModal task={task} me={me} onClose={() => { setShowRating(false); setHasRated(true); }} />,
        document.body
      )}
      {showInvoice && task && me && createPortal(
        <InvoiceModal task={task} me={me} onClose={() => setShowInvoice(false)} />,
        document.body
      )}

      {/* Exit-task confirmation — shown before any active task is left */}
      {showExitConfirm && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000000, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', touchAction: 'none' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowExitConfirm(false); }}
        >
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🚪</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>{t('exit_task_title')}</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {t('exit_task_body')}<br />
                <strong style={{ color: 'var(--text-1)' }}>{t('exit_task_note')}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary-dark)))', border: 'none', color: 'var(--brand-btn-primary-text, white)', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
                {t('continue_in_task')}
              </button>
              <button
                onClick={() => cancelTakeMutation.mutate()}
                disabled={cancelTakeMutation.isPending}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {cancelTakeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><DoorOpen size={16} strokeWidth={1.8} /> {t('yes_exit_task')}</>}
              </button>
            </div>
            <div style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}