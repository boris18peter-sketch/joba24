import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, X, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { invalidateTaskCaches } from '@/lib/taskSync';

/**
 * TaskOwnerMenu — the publisher's "..." sheet: עריכה / ביטול / מחיקה.
 *
 * This is the ONE copy of that menu. It is opened from the task screen's header
 * button and from the task card's details, so the two can never drift apart in
 * look, wording or behaviour: the same rows, the same icons, the same delete
 * confirmation, the same server call.
 */
export default function TaskOwnerMenu({ open, onClose, task, onCancel, meId }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!open && !confirmDelete) return null;
  if (!task) return null;

  const handleCancel = () => {
    onClose();
    const workerIsActive = ['on_the_way', 'delayed', 'parking', 'arrived', 'starting', 'finishing', 'done'].includes(task.worker_status);
    if (task.status === 'TAKEN' && workerIsActive) {
      window.dispatchEvent(new CustomEvent('show_cancel_warning', { detail: { task } }));
    } else {
      onCancel?.();
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      // SERVER-AUTHORITATIVE: releasing every applicant's committed jobas and
      // removing the task happen together, so a delete can never strand credits.
      const res = await base44.functions.invoke('deleteTask', { taskId: task.id });
      if (!res.data?.success) throw new Error(res.data?.error || 'delete_failed');
      invalidateTaskCaches(queryClient, { taskId: task.id, meId });
      toast.success(t('task_deleted_toast') || 'המשימה נמחקה');
      setConfirmDelete(false);
      onClose();
      window.dispatchEvent(new CustomEvent('close_task_sheet'));
    } catch (err) {
      const code = err?.response?.data?.error || err?.data?.error;
      if (code === 'work_in_progress_not_deletable') {
        toast.error(t('delete_blocked_in_progress') || 'העבודה כבר החלה — יש לבטל את המשימה במקום למחוק אותה');
      } else {
        toast.error(t('delete_error_toast') || 'שגיאה במחיקה');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000001, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', marginBottom: 12, paddingRight: 4, letterSpacing: 0.3 }}>{t('task_actions_title')}</div>
            {(task.status === 'OPEN' || task.status === 'EXPIRED') &&
              <div onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('hide_task_sheet')); navigate(`/create-task?editId=${task.id}`); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', borderBottom: '1px solid #f0f4fa', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Pencil size={17} color="var(--brand-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{t('edit_task_title')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t('edit_task_sub')}</div>
                  </div>
                </div>
              </div>
            }
            <div onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={17} color="var(--color-danger)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>{t('cancel_task_title')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t('cancel_task_sub')}</div>
              </div>
            </div>
            <div onClick={() => { onClose(); setConfirmDelete(true); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 6px', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={17} color="var(--color-danger)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>{t('delete_task_title') || 'מחיקת משימה'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{t('delete_task_sub') || 'מחיקה סופית — לא ניתן לשחזר'}</div>
              </div>
            </div>
            <div style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
          </div>
        </div>,
        document.body
      )}

      {confirmDelete && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000002, background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>{t('delete_task_title') || 'מחיקת משימה'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>{t('delete_task_confirm') || 'המשימה תימחק לצמיתות. לא ניתן לשחזר פעולה זו.'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting}
                style={{ width: '100%', height: 48, borderRadius: 14, background: 'var(--color-danger)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={16} /> {t('delete_task_btn') || 'מחק משימה'}</>}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ width: '100%', height: 44, borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {t('cancel')}
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