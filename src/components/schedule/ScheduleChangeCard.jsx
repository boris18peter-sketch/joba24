import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, ArrowLeft, Check, X, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  hasSchedule,
  pendingChangeRequest,
  findConflicts,
  DEFAULT_OCCURRENCE_MINUTES,
} from '@/lib/scheduling';
import { useMyScheduleTasks } from '@/hooks/useMyScheduleTasks';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { formatWhen } from '@/lib/time';
import ScheduleChangeSheet from '@/components/schedule/ScheduleChangeSheet';

/**
 * ScheduleChangeCard — בקשת שינוי מועד, זמינה לשני הצדדים לאחר שנקבעה עבודה.
 *
 * שני מצבים:
 *   אין בקשה  → כפתור "בקשת שינוי מועד"
 *   יש בקשה   → Old → New. המבקש רואה "ממתין לאישור", הצד השני מקבל אשר / דחה.
 *
 * כל עוד הבקשה ממתינה, המועד המקורי נשאר המועד התקף והיומן לא משתנה.
 */
export default function ScheduleChangeCard({ task, me }) {
  const queryClient = useQueryClient();
  const { tasks: myTasks, meId } = useMyScheduleTasks();
  const { settings } = useJobaSettings();
  const defaultMinutes = Number(settings?.default_occurrence_minutes) || DEFAULT_OCCURRENCE_MINUTES;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(null); // 'accept' | 'decline'

  const request = pendingChangeRequest(task);
  const iAmRequester = !!me?.id && request?.requested_by === me.id;

  const isParticipant = !!me?.id && (task.client_id === me.id || task.worker_id === me.id);

  // The accepting side is warned about THEIR OWN calendar before deciding.
  const conflicts = useMemo(() => {
    if (!request || iAmRequester || !meId) return [];
    const start = request.proposed?.iso ? new Date(request.proposed.iso) : null;
    if (!start) return [];
    const end = request.proposed?.end_iso ? new Date(request.proposed.end_iso) : null;
    return findConflicts({
      tasks: myTasks,
      userId: meId,
      occurrence: { start, end },
      excludeTaskId: task.id,
      defaultMinutes,
    });
  }, [request, iAmRequester, myTasks, meId, task.id, defaultMinutes]);

  const respond = async (action) => {
    if (busy) return;
    setBusy(action);
    try {
      const res = await base44.functions.invoke('rescheduleTask', {
        action,
        taskId: task.id,
      });
      if (res.data?.error) throw new Error(res.data.error);

      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myScheduleTasks'] });
      queryClient.invalidateQueries({ queryKey: ['workerTasksLayout'] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['activeWorkerTask'] });
      queryClient.invalidateQueries({ queryKey: ['activeClientTask'] });

      if (action === 'accept') {
        const n = res.data?.conflicts?.length || 0;
        toast.success('המועד החדש אושר');
        if (n > 0) toast.warning('שים לב: יש לך עבודה אחרת שחופפת למועד החדש');
      } else {
        toast.success('בקשת השינוי נדחתה');
      }
    } catch (e) {
      toast.error(e.message || 'שגיאה');
    } finally {
      setBusy(null);
    }
  };

  // Nothing to reschedule before a job is agreed, or when there is no time at all.
  if (task.status !== 'TAKEN' || !isParticipant) return null;
  if (!request && !hasSchedule(task)) return null;

  /* ── A pending request ─────────────────────────────────────────────── */
  if (request) {
    const oldLabel = request.old?.iso ? formatWhen(new Date(request.old.iso)) : '—';
    const newLabel = request.proposed?.iso ? formatWhen(new Date(request.proposed.iso)) : '—';

    return (
      <div
        dir="rtl"
        style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 16, padding: '14px 14px 12px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <CalendarClock size={15} color="var(--color-warning)" />
          <span style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-1)' }}>
            {iAmRequester ? 'בקשת שינוי מועד ממתינה' : 'בקשה לשינוי מועד'}
          </span>
        </div>

        {/* Old → New */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, background: 'var(--surface-3)', borderRadius: 11, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)' }}>נוכחי</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)', marginTop: 1, textDecoration: 'line-through' }}>{oldLabel}</div>
          </div>
          <ArrowLeft size={15} color="var(--text-3)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)', borderRadius: 11, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--brand-primary)' }}>מוצע</div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--brand-primary)', marginTop: 1 }}>{newLabel}</div>
          </div>
        </div>

        {request.requested_by_name && (
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 10 }}>
            {iAmRequester ? 'שלחת את הבקשה' : `${request.requested_by_name} ביקש/ה את השינוי`}
          </div>
        )}

        {/* The original time is still the effective one until this is accepted */}
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>
          המועד הנוכחי נשאר בתוקף עד לאישור.
        </div>

        {/* Conflict warning for the deciding side — warning only */}
        {!iAmRequester && conflicts.length > 0 && (
          <div style={{
            background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
            borderRadius: 12, padding: '10px 12px', marginBottom: 12,
            display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-warning)' }}>
                {conflicts.length === 1 ? 'יש לך עבודה אחרת במועד המוצע' : `יש לך ${conflicts.length} עבודות אחרות במועד המוצע`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.55 }}>
                {conflicts.map((c) => c.task_title).join(' · ')}
              </div>
            </div>
          </div>
        )}

        {iAmRequester ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'var(--surface-3)', borderRadius: 12, padding: '11px 12px',
            fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)',
          }}>
            <Clock size={14} /> ממתין לאישור הצד השני
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => respond('accept')}
              disabled={!!busy}
              style={{
                flex: 2, height: 46, borderRadius: 13, border: 'none',
                background: 'linear-gradient(135deg,#059669,#047857)', color: 'white',
                fontWeight: 900, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(5,150,105,0.32)',
              }}
            >
              {busy === 'accept' ? <Loader2 size={17} className="animate-spin" /> : <><Check size={16} /> אישור המועד החדש</>}
            </button>
            <button
              onClick={() => respond('decline')}
              disabled={!!busy}
              style={{
                flex: 1, height: 46, borderRadius: 13,
                background: 'var(--surface-2)', border: '1px solid var(--color-danger-border)',
                color: 'var(--color-danger)', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {busy === 'decline' ? <Loader2 size={17} className="animate-spin" /> : <><X size={16} /> דחייה</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── No request yet ────────────────────────────────────────────────── */
  return (
    <>
      <button
        dir="rtl"
        onClick={() => setSheetOpen(true)}
        style={{
          width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
          background: 'var(--brand-card-bg, var(--surface-2))',
          border: '1px solid var(--border-1)',
          color: 'var(--text-2)', fontWeight: 800, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <CalendarClock size={16} /> בקשת שינוי מועד
      </button>

      {sheetOpen && createPortal(
        <ScheduleChangeSheet task={task} onClose={() => setSheetOpen(false)} />,
        document.body,
      )}
    </>
  );
}