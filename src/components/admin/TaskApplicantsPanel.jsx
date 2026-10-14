import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Loader2, UserCheck, Users } from 'lucide-react';
import CopyableId from '@/components/CopyableId';

const APP_STATUS = {
  pending: { label: 'ממתין', bg: '#fef9c3', color: '#854d0e' },
  approved: { label: 'אושר', bg: '#dcfce7', color: '#166534' },
  rejected: { label: 'נדחה', bg: '#fee2e2', color: '#991b1b' },
  cancelled: { label: 'בוטל', bg: '#f1f5f9', color: '#64748b' },
};

/**
 * TaskApplicantsPanel — the full application history of one task.
 *
 * Loaded only when the admin expands the task, because the honest answer needs
 * TaskApplication (every status), not the denormalised Task.applicants array.
 */
export default function TaskApplicantsPanel({ task }) {
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['adminTaskApplicants', task.id],
    queryFn: () => base44.entities.TaskApplication.filter({ task_id: task.id }, '-created_date', 200),
    staleTime: 15000,
  });

  const counts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const selected = task.worker_id ? { id: task.worker_id, name: task.worker_name } : null;

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
        background: selected ? '#f0fdf4' : 'var(--surface-3)',
        border: `1px solid ${selected ? '#bbf7d0' : 'var(--border-1)'}`,
      }}>
        <UserCheck size={14} color={selected ? '#16a34a' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>העובד שנבחר</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: selected ? '#166534' : 'var(--text-2)' }}>
            {selected ? (selected.name || 'ללא שם') : 'טרם נבחר עובד'}
          </div>
        </div>
        {selected && <CopyableId id={selected.id} label="עובד" fontSize={9} />}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(APP_STATUS).map(([k, v]) => (
          <span key={k} style={{ fontSize: 10, fontWeight: 800, background: v.bg, color: v.color, padding: '3px 9px', borderRadius: 20 }}>
            {v.label}: {counts[k] || 0}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <Loader2 size={18} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : apps.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={13} /> אף מועמד לא הגיש בקשה למשימה הזו
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {apps.map((a) => {
            const s = APP_STATUS[a.status] || APP_STATUS.pending;
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-3)', borderRadius: 10, padding: '7px 10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.worker_name || 'ללא שם'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                      {a.created_date ? format(new Date(a.created_date), 'dd/MM/yyyy HH:mm') : ''}
                    </span>
                    {a.credits_charged > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#d97706' }}>{a.credits_charged} ג'ובות</span>
                    )}
                    <CopyableId id={a.worker_id} label="" fontSize={9} />
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}