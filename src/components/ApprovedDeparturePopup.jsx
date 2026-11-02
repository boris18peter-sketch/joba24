import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { invalidateTaskCaches } from '@/lib/taskSync';
import useTaskStatusFlow from '@/hooks/useTaskStatusFlow';
import StatusConfirmSheet from '@/components/StatusConfirmSheet';

/**
 * ApprovedDeparturePopup — the worker was just approved for a task, so the
 * DEPARTURE sheet opens on its own: the very next thing he needs to do is tell
 * the publisher he has set off, and until now that took finding the task again.
 *
 * ── IT IS THE EXISTING SHEET, ONLY EARLIER ─────────────────────────────────
 * The content (emoji, title, explanation, button label) comes from the task
 * category's own status flow — exactly what the active task card shows when the
 * worker taps "יצאתי לדרך" — and it renders through StatusConfirmSheet, the
 * single confirmation sheet every task step uses. No new design, no second
 * wording: the same popup, raised automatically at the moment it is needed.
 */
export default function ApprovedDeparturePopup({ task, onClose }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const flow = useTaskStatusFlow(task?.category);
  const cta = flow?.cta?.on_the_way || {};

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
      // ── THE STATUS MUST NOT CHANGE HERE ────────────────────────────────────
      // Departure is a WORKER STEP, not a new task status: the canonical flow
      // stores it in `worker_status` ('on_the_way' → 'arrived' → 'done') while
      // the task stays TAKEN until the publisher approves completion. Writing a
      // new `status` here is what made the job vanish from every screen.
      if (task.status !== 'TAKEN') {
        setSaving(false);
        toast.error(t('generic_error') || 'משהו השתבש, נסה שוב');
        onClose();
        return;
      }
      await base44.entities.Task.update(task.id, {
        worker_status: 'on_the_way',
        on_the_way_at: new Date().toISOString(),
        ...(coords ? { worker_lat: coords.lat, worker_lng: coords.lng } : {}),
      });
      invalidateTaskCaches(queryClient, { taskId: task.id });
      toast.success(cta.toast || t('on_way_toast') || 'יצאת לדרך! המפרסם קיבל עדכון');
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
      toast.error(err?.message || t('generic_error') || 'משהו השתבש, נסה שוב');
    }
  };

  return (
    <StatusConfirmSheet
      emoji={cta.emoji || '🚀'}
      title={cta.confirm_title || t('approved_popup_title') || 'יוצא לדרך'}
      sub={cta.confirm_sub || t('approved_popup_sub') || 'המפרסם יקבל עדכון שאתה בדרך'}
      confirmLabel={cta.label || t('leave_now_btn') || 'יצאתי לדרך'}
      confirmColor="var(--brand-primary)"
      onConfirm={departNow}
      onCancel={onClose}
      loading={saving}
    >
      {/* The job this departure belongs to — one quiet line inside the sheet. */}
      {task?.title && (
        <div style={{
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          borderRadius: 14, padding: '10px 12px', marginBottom: 14, textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3 }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
            <span>₪{Math.round(task.price || 0)}</span>
            {task.location_name && (
              <>
                <span>·</span>
                <Navigation size={11} strokeWidth={2} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{task.location_name}</span>
              </>
            )}
          </div>
        </div>
      )}
    </StatusConfirmSheet>
  );
}