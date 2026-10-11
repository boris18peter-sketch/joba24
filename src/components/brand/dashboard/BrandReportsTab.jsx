import { format } from 'date-fns';
import { card, Pill } from '@/components/admin/brand/brandUi';

const STATUS = {
  pending: { label: 'ממתין לטיפול', tone: 'red' },
  reviewed: { label: 'נבדק', tone: 'green' },
  dismissed: { label: 'נדחה', tone: 'gray' },
};

/** Reports filed against THIS Brand's tasks. */
export default function BrandReportsTab({ reports = [] }) {
  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏳️</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>אין דיווחים</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          דיווחים על משימות של המותג יופיעו כאן
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{reports.length} דיווחים</div>
      {reports.map((r) => {
        const sc = STATUS[r.status] || STATUS.pending;
        return (
          <div key={r.id} style={{ ...card, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.35 }}>
                  {r.task_title || 'משימה'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  דווח על ידי {r.reporter_name || 'משתמש'}
                  {r.created_date ? ` · ${format(new Date(r.created_date), 'dd/MM/yyyy HH:mm')}` : ''}
                </div>
              </div>
              <Pill tone={sc.tone}>{sc.label}</Pill>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <Pill tone="amber">{r.reason_label}</Pill>
            </div>
            {r.description && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.6 }}>
                {r.description}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}