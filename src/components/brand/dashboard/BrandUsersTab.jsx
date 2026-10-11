import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { card, Pill } from '@/components/admin/brand/brandUi';

/**
 * The people who actually joined this Brand — with the details that identify
 * them. A membership row only exists after a real action, so this is a roster,
 * not a visitor list.
 */
export default function BrandUsersTab({ users = [] }) {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState('all');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (only === 'posters' && u.tasks_posted === 0) return false;
      if (only === 'workers' && u.tasks_completed === 0) return false;
      if (only === 'admins' && u.role !== 'brand_admin') return false;
      if (!needle) return true;
      return (
        (u.name || '').toLowerCase().includes(needle) ||
        (u.email || '').toLowerCase().includes(needle) ||
        (u.phone || '').includes(needle)
      );
    });
  }, [users, q, only]);

  const FILTERS = [
    ['all', 'הכל'],
    ['posters', 'פרסמו משימה'],
    ['workers', 'ביצעו עבודה'],
    ['admins', 'בעלי גישה'],
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 30, paddingLeft: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setOnly(key)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: only === key ? '#0f2b6b' : 'var(--surface-2)',
              color: only === key ? 'white' : 'var(--text-2)',
              border: `1px solid ${only === key ? '#0f2b6b' : 'var(--border-1)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{filtered.length} משתמשים</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>אין משתמשים להצגה</div>
        </div>
      ) : filtered.map((u) => (
        <div key={u.user_id} style={{ ...card, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 15,
            }}>
              {(u.name || '?')[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.name || 'משתמש'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.email || '—'}
              </div>
            </div>
            {u.role === 'brand_admin' && <Pill tone="amber">בעל גישה</Pill>}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            {u.phone && <Pill tone="gray">📱 {u.phone}</Pill>}
            <Pill tone="blue">{u.first_action_label}</Pill>
            {u.tasks_posted > 0 && <Pill tone="blue">{u.tasks_posted} משימות שפרסם</Pill>}
            {u.tasks_completed > 0 && <Pill tone="green">{u.tasks_completed} עבודות שביצע</Pill>}
            {u.rating > 0 && <Pill tone="amber">⭐ {Number(u.rating).toFixed(1)}</Pill>}
            {u.is_verified && <Pill tone="green">מאומת</Pill>}
            {u.is_approved === false && <Pill tone="red">ממתין לאישור</Pill>}
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 8 }}>
            הצטרף ב-{u.joined_at ? format(new Date(u.joined_at), 'dd/MM/yyyy') : '—'}
          </div>
        </div>
      ))}
    </>
  );
}