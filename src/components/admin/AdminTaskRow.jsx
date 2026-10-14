import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import CopyableId from '@/components/CopyableId';
import TaskMetricsStrip from '@/components/admin/TaskMetricsStrip';
import TaskApplicantsPanel from '@/components/admin/TaskApplicantsPanel';

export const STATUS_COLORS = {
  OPEN: { bg: '#dbeafe', text: '#1d4ed8', label: 'פתוח' },
  TAKEN: { bg: '#fef9ec', text: '#92700a', label: 'בעבודה' },
  COMPLETED: { bg: '#dcfce7', text: '#166534', label: 'הושלם' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b', label: 'בוטל' },
  EXPIRED: { bg: '#fef3ea', text: '#8a4a1a', label: 'פג תוקף' },
};

/**
 * AdminTaskRow — one task with its full demand history.
 *
 * `applicantCount` is the authoritative number of applications ever made
 * (server aggregate), while the expanded panel loads the individual
 * applications so the admin can see who applied and who was chosen.
 */
export default function AdminTaskRow({ task, onStatusChange, onDelete, applicantCount }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const sc = STATUS_COLORS[task.status] || STATUS_COLORS.OPEN;

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => { setOpen(v => !v); setConfirmDel(false); }} style={{ padding: '12px 16px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{task.client_name} · {task.created_date ? format(new Date(task.created_date), 'dd/MM/yyyy HH:mm') : ''}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.text, flexShrink: 0 }}>{sc.label}</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#1a6fd4', flexShrink: 0 }}>₪{task.price}</span>
        {open ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
      </div>

      {/* Demand metrics — always visible, so every task can be scanned at a glance */}
      <div style={{ padding: '0 16px 10px' }} onClick={e => e.stopPropagation()}>
        <TaskMetricsStrip task={task} applicantCount={applicantCount} />
      </div>

      {open && (
        <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-2)' }} onClick={e => e.stopPropagation()}>
          {task.description && <div><strong>תיאור:</strong> {task.description}</div>}
          {task.location_name && <div><strong>מיקום:</strong> {task.location_name}</div>}
          {task.category && <div><strong>קטגוריה:</strong> {task.category}</div>}
          {task.expires_at && <div><strong>פג תוקף:</strong> {format(new Date(task.expires_at), 'dd/MM/yyyy HH:mm')}</div>}
          {task.completed_at && <div><strong>הושלם:</strong> {format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm')}</div>}

          {/* Identifiers — each one is click-to-copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--surface-3)', borderRadius: 10, padding: '8px 10px' }}>
            <CopyableId id={task.id} label="מזהה משימה" />
            <CopyableId id={task.client_id} label="מזהה מפרסם" />
            {task.worker_id && <CopyableId id={task.worker_id} label="מזהה עובד" />}
          </div>

          {/* Who applied, and who was chosen */}
          <TaskApplicantsPanel task={task} />

          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>שינוי סטטוס:</span>
            <select
              value={task.status}
              disabled={busy}
              onChange={async (e) => { setBusy(true); await onStatusChange(task, e.target.value); setBusy(false); }}
              style={{ height: 34, borderRadius: 10, border: '1px solid var(--border-1)', padding: '0 10px', fontSize: 12, color: 'var(--text-1)', outline: 'none', background: 'var(--surface-2)' }}
            >
              {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {busy && <Loader2 size={14} className="animate-spin" color="#1a6fd4" />}
          </div>

          {confirmDel ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={async () => { setBusy(true); await onDelete(task); setBusy(false); setConfirmDel(false); }} disabled={busy}
                style={{ flex: 1, height: 36, borderRadius: 10, background: '#dc2626', color: 'white', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={13} /> מחק לצמיתות</>}
              </button>
              <button onClick={() => setConfirmDel(false)} style={{ height: 36, padding: '0 14px', borderRadius: 10, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>ביטול</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              <Trash2 size={13} /> מחיקת משימה
            </button>
          )}
        </div>
      )}
    </div>
  );
}