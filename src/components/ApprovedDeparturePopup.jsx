import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Rocket, Loader2, Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { invalidateTaskCaches } from '@/lib/taskSync';

/**
 * ApprovedDeparturePopup — the worker was just approved for a task, so the
 * "לצאת לדרך" sheet opens on its own: the very next thing he needs to do is
 * tell the publisher he has set off, and until now that took finding the task
 * again.
 *
 * It is the SAME bottom sheet shape as every other confirmation in the app
 * (drag handle, one card, one primary action) — the departure step is not a
 * new concept, only an unexpected timing.
 */
export default function ApprovedDeparturePopup({ task, onClose }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const departNow = async () => {
    if (saving) return;
    setSaving(true);

    // Best effort, exactly like the banner's own quick action: with a location
    // the publisher already sees the worker on the map; without one the status
    // still moves, so the location is never allowed to block departure.
    const coords = navigator.geolocation
      ? await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(null),
            { timeout: 6000, maximumAge: 60000 }
          );
        })
      : null;

    try {
      await base44.entities.Task.update(task.id, {
        status: 'ON_THE_WAY',
        worker_status: 'on_the_way',
        on_the_way_at: new Date().toISOString(),
        ...(coords ? { worker_lat: coords.lat, worker_lng: coords.lng } : {}),
      });
      invalidateTaskCaches(queryClient, { taskId: task.id });
      toast.success(t('on_way_toast') || 'יצאת לדרך! המפרסם קיבל עדכון');
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
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
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 18px' }} />

        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: '0 auto 10px',
            background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rocket size={26} color="var(--color-success)" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3 }}>
            {t('approved_popup_title') || 'אושרת למשימה!'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 5 }}>
            {t('approved_popup_sub') || 'המפרסם אישר אותך. אפשר לעדכן שיצאת לדרך.'}
          </div>
        </div>

        {/* The task, in the same card the apply sheet uses */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: 14,
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3 }}>
            {task?.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-1)' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-2)' }}>
              ₪{Math.round(task?.price || 0)}
            </span>
            {task?.location_name && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)', minWidth: 0 }}>
                <Navigation size={12} strokeWidth={2} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.location_name}</span>
              </span>
            )}
          </div>
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
            onClick={departNow}
            disabled={saving}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
              border: 'none', fontSize: 15.5, fontWeight: 900,
              color: 'var(--brand-btn-primary-text, #ffffff)',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: saving ? 'none' : '0 6px 18px rgba(26,111,212,0.26)',
              opacity: saving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <Rocket size={16} strokeWidth={2.2} />
                <span>{t('leave_now_btn') || 'יצאתי לדרך'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}