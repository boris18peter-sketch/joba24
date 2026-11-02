import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Star, Check, User, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { invalidateTaskCaches } from '@/lib/taskSync';

/**
 * NewApplicantPopup — a candidate just applied to one of MY tasks, so he is
 * offered right here: photo, rating and one tap to approve, instead of the
 * publisher having to open the task, find the applicants panel and pick him.
 *
 * It carries exactly the facts that decide an approval — who he is, how he is
 * rated, and what he wrote — and nothing else.
 */
export default function NewApplicantPopup({ task, application, onClose }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['applicantProfile', application?.worker_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPublicUserProfile', {
        userId: application.worker_id,
        taskId: task.id,
      });
      return res.data?.user || null;
    },
    enabled: !!application?.worker_id,
    staleTime: 120000,
  });

  const name = profile?.full_name || application?.worker_name || '';
  const rating = Number(profile?.rating || 0);

  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      await base44.functions.invoke('approveWorker', {
        taskId: task.id,
        applicationId: application.id,
        workerId: application.worker_id,
        workerName: name || application.worker_name,
      });
      invalidateTaskCaches(queryClient, { taskId: task.id });
      queryClient.invalidateQueries({ queryKey: ['applications', task.id] });
      toast.success(t('applicant_approved_toast') || 'המועמד אושר');
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
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 16px' }} />

        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-2)', marginBottom: 10 }}>
          {t('applicant_popup_title') || 'מועמד חדש למשימה שלך'}
        </div>

        {/* The candidate — photo, name, rating, message */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profile?.profile_photo ? (
                <img src={profile.profile_photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={22} color="var(--text-3)" />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={13}
                    strokeWidth={1.6}
                    style={{ fill: n <= Math.round(rating) ? '#fbbf24' : 'transparent', color: n <= Math.round(rating) ? '#fbbf24' : 'var(--border-2)' }}
                  />
                ))}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', marginInlineStart: 4 }}>
                  {rating > 0 ? rating.toFixed(1) : (t('applicant_no_rating') || 'מועמד חדש')}
                </span>
              </div>
            </div>
          </div>

          {application?.message && (
            <div style={{
              display: 'flex', gap: 7, marginTop: 10, paddingTop: 10,
              borderTop: '1px solid var(--border-1)',
            }}>
              <MessageCircle size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-3)' }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>{application.message}</span>
            </div>
          )}
        </div>

        {/* Which task he applied to */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task?.title}</span>
          <span style={{ fontWeight: 800, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>₪{Math.round(task?.price || 0)}</span>
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
              background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
              border: 'none', fontSize: 15.5, fontWeight: 900,
              color: 'var(--brand-btn-primary-text, #ffffff)',
              cursor: approving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: approving ? 'none' : '0 6px 18px rgba(26,111,212,0.26)',
              opacity: approving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {approving ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <Check size={17} strokeWidth={2.6} />
                <span>{t('applicant_popup_approve') || 'אישור מיידי'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}