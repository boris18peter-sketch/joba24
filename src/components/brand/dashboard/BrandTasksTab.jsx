import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { card, Pill } from '@/components/admin/brand/brandUi';

const STATUS = {
  OPEN: { label: 'פתוחה', tone: 'blue' },
  TAKEN: { label: 'נתפסה', tone: 'amber' },
  APPROVED_PENDING_DEPARTURE: { label: 'אושרה', tone: 'amber' },
  ON_THE_WAY: { label: 'בדרך', tone: 'amber' },
  ARRIVED: { label: 'הגיע', tone: 'amber' },
  IN_PROGRESS: { label: 'בביצוע', tone: 'amber' },
  COMPLETED: { label: 'הושלמה', tone: 'green' },
  CANCELLED: { label: 'בוטלה', tone: 'red' },
  EXPIRED: { label: 'פגה', tone: 'gray' },
};

/** The Brand's tasks, exactly as they exist — no inferred rows. */
export default function BrandTasksTab({ tasks = [] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (status && t.status !== status) return false;
      if (!needle) return true;
      return (
        t.title.toLowerCase().includes(needle) ||
        (t.client_name || '').toLowerCase().includes(needle) ||
        (t.worker_name || '').toLowerCase().includes(needle) ||
        t.id.toLowerCase().includes(needle)
      );
    });
  }, [tasks, q, status]);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש לפי כותרת, מפרסם, עובד או מזהה..."
            style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 30, paddingLeft: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ height: 36, borderRadius: 10, border: '1px solid var(--border-1)', padding: '0 10px', fontSize: 12, color: 'var(--text-1)', outline: 'none', background: 'var(--surface-2)' }}
        >
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{filtered.length} משימות</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>אין משימות להצגה</div>
        </div>
      ) : filtered.map((t) => {
        const sc = STATUS[t.status] || STATUS.OPEN;
        return (
          <div key={t.id} style={{ ...card, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.35 }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  {t.category_icon} {t.category} · {t.client_name || '—'}
                  {t.created_date ? ` · ${format(new Date(t.created_date), 'dd/MM/yyyy HH:mm')}` : ''}
                </div>
              </div>
              <Pill tone={sc.tone}>{sc.label}</Pill>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <Pill tone="gray">₪{t.price}</Pill>
              <Pill tone={t.applicants > 0 ? 'blue' : 'gray'}>{t.applicants} בקשות</Pill>
              {t.worker_name && <Pill tone="amber">עובד: {t.worker_name}</Pill>}
            </div>
          </div>
        );
      })}
    </>
  );
}