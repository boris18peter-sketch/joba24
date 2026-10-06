import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Loader2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { occurrencesOf, findConflicts, DEFAULT_OCCURRENCE_MINUTES, formatOccurrence } from '@/lib/scheduling';
import { useMyScheduleTasks } from '@/hooks/useMyScheduleTasks';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { combineDateTime, formatWhen } from '@/lib/time';

/**
 * ScheduleChangeSheet — בקשת שינוי מועד.
 *
 * בוחרים איזה מועד מזיזים (למשימה עם כמה מועדים לכל אחד מהם מזהה משלו),
 * מציעים תאריך ושעות חדשים, ורואים אזהרת חפיפה עם עבודות אחרות של המציע.
 * החפיפה היא אזהרה בלבד — אפשר להמשיך.
 */
export default function ScheduleChangeSheet({ task, onClose }) {
  const queryClient = useQueryClient();
  const { tasks: myTasks, meId } = useMyScheduleTasks();
  const { settings } = useJobaSettings();
  const defaultMinutes = Number(settings?.default_occurrence_minutes) || DEFAULT_OCCURRENCE_MINUTES;

  // Only occurrences still ahead can be moved — a past slot is history.
  const occurrences = useMemo(
    () => occurrencesOf(task).filter((o) => o.start.getTime() > Date.now()),
    [task],
  );

  const [occurrenceKey, setOccurrenceKey] = useState(() => occurrences[0]?.key || '');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Prefill from the addressed occurrence — the user edits, not retypes.
  useEffect(() => {
    const occ = occurrences.find((o) => o.key === occurrenceKey);
    if (!occ) return;
    setDate(occ.date || '');
    setStart(occ.startClock || '');
    setEnd(occ.endClock || '');
  }, [occurrenceKey, occurrences]);

  const proposedOccurrence = useMemo(() => {
    const s = combineDateTime(date, start);
    if (!s) return null;
    return { start: s, end: combineDateTime(date, end) };
  }, [date, start, end]);

  // Conflict = warning only. Computed live, for the person making the request.
  const conflicts = useMemo(() => {
    if (!proposedOccurrence || !meId) return [];
    return findConflicts({
      tasks: myTasks,
      userId: meId,
      occurrence: proposedOccurrence,
      excludeTaskId: task.id,
      defaultMinutes,
    });
  }, [proposedOccurrence, myTasks, meId, task.id, defaultMinutes]);

  const canSubmit = !!occurrenceKey && !!date && !!start && !!end && start < end && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('rescheduleTask', {
        action: 'request',
        taskId: task.id,
        occurrence_key: occurrenceKey,
        proposed: { date, start, end },
      });
      if (res.data?.error) throw new Error(res.data.error);

      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['myScheduleTasks'] });
      toast.success('בקשת שינוי המועד נשלחה');
      onClose();
    } catch (e) {
      toast.error(e.message || 'שגיאה בשליחת הבקשה');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', height: 44, borderRadius: 10,
    border: '1.5px solid var(--border-1)', background: 'var(--surface-2)',
    padding: '0 12px', fontSize: 15, color: 'var(--text-1)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'var(--overlay-bg)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--brand-modal-bg, var(--surface-1))',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          width: '100%', maxWidth: 480,
          padding: '0 20px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-xl)',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1) both',
          maxHeight: '92dvh', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--brand-modal-title, var(--text-1))', margin: 0 }}>
            בקשת שינוי מועד
          </h2>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="var(--text-2)" />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--brand-modal-text, var(--text-2))', margin: '0 0 16px', lineHeight: 1.6 }}>
          הצד השני יראה את המועד הישן מול החדש ויאשר או ידחה. המועד הנוכחי נשאר בתוקף עד לאישור.
        </p>

        {/* Which occurrence — a task with several slots moves ONE of them */}
        {occurrences.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', marginBottom: 6 }}>איזה מועד לשנות?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {occurrences.map((occ) => {
                const active = occ.key === occurrenceKey;
                return (
                  <button
                    key={occ.key}
                    onClick={() => setOccurrenceKey(occ.key)}
                    style={{
                      padding: '7px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--brand-primary)' : 'var(--border-1)'}`,
                      background: active ? 'var(--brand-primary-light)' : 'var(--surface-2)',
                      color: active ? 'var(--brand-primary)' : 'var(--text-2)',
                    }}
                  >
                    {formatOccurrence(occ)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Old → New */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          background: 'var(--surface-3)', borderRadius: 14, padding: '12px 14px',
          border: '1px solid var(--border-1)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)' }}>המועד הנוכחי</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>
              {occurrences.find((o) => o.key === occurrenceKey) ? formatOccurrence(occurrences.find((o) => o.key === occurrenceKey)) : '—'}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--brand-primary)' }}>המועד המוצע</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>
              {proposedOccurrence ? formatWhen(proposedOccurrence.start) : '—'}
            </div>
          </div>
        </div>

        {/* New time */}
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>תאריך חדש</label>
        <input
          type="date" value={date} min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שעת התחלה</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>שעת סיום</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {start && end && start >= end && (
          <div style={{ fontSize: 11.5, color: 'var(--color-danger)', fontWeight: 700, marginBottom: 10 }}>
            שעת הסיום חייבת להיות אחרי שעת ההתחלה
          </div>
        )}

        {/* Conflict — a clear warning that never blocks */}
        {conflicts.length > 0 && (
          <div style={{
            background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
            borderRadius: 14, padding: '12px 14px', marginBottom: 14,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={17} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-warning)' }}>
                {conflicts.length === 1 ? 'יש לך עבודה אחרת במועד הזה' : `יש לך ${conflicts.length} עבודות אחרות במועד הזה`}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6 }}>
                {conflicts.map((c) => `${c.task_title} (${c.role === 'client' ? 'מפרסם' : 'עובד'})`).join(' · ')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, fontWeight: 700 }}>
                זו אזהרה בלבד — אפשר להמשיך אם זה מתאים לך.
              </div>
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--r-md)', border: 'none',
            background: canSubmit ? 'linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))' : 'var(--surface-3)',
            color: canSubmit ? 'white' : 'var(--text-3)',
            fontWeight: 900, fontSize: 15,
            cursor: canSubmit ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: canSubmit ? 'var(--shadow-md)' : 'none',
          }}
        >
          {saving ? <Loader2 size={19} className="animate-spin" /> : <><Calendar size={17} /> שליחת בקשה</>}
        </button>

        <style>{`@keyframes sheetSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    </div>,
    document.body,
  );
}