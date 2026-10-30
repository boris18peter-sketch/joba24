import { useMemo, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

/**
 * Users by professional category.
 *
 * The count on each chip is the REAL distribution across every account — it is
 * computed from the accounts themselves, so it always matches what the people
 * actually chose on their profile, and a category with nobody in it is simply
 * not offered. Selecting several categories shows anyone who belongs to ANY of
 * them, which is how a category is actually looked at: "who can do plumbing or
 * electricity".
 */
export default function UserCategoryFilter({ users, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const map = new Map();
    (users || []).forEach(u => {
      (u.preferred_categories || []).forEach(cat => {
        if (!cat) return;
        map.set(cat, (map.get(cat) || 0) + 1);
      });
    });
    return [...map.entries()]
      .map(([key, count]) => ({ key, count, label: getCategoryLabel(key) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'he'));
  }, [users]);

  const covered = counts.reduce((sum, c) => sum + c.count, 0);
  const selectedCount = selected.length;
  const shown = query.trim()
    ? counts.filter(c => c.label.includes(query.trim()) || c.key.includes(query.trim()))
    : counts;

  const toggle = (key) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  if (counts.length === 0) return null;

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'right',
        }}
      >
        <Filter size={13} color="#1a6fd4" />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)' }}>סינון לפי קטגוריה מקצועית</span>
        {selectedCount > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'white', background: '#1a6fd4', borderRadius: 99, padding: '1px 7px' }}>
            {selectedCount}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700 }}>
          {counts.length} קטגוריות · {covered} שיוכים
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4' }}>{open ? 'סגור' : 'בחר'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border-1)' }}>
          {counts.length > 8 && (
            <div style={{ position: 'relative', marginTop: 10 }}>
              <Search size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="חיפוש קטגוריה..."
                style={{
                  width: '100%', height: 34, borderRadius: 10, border: '1px solid var(--border-1)',
                  paddingRight: 30, paddingLeft: 10, fontSize: 12, outline: 'none',
                  boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {shown.map(c => {
              const active = selected.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 99, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700,
                    background: active ? '#1a6fd4' : 'var(--surface-3)',
                    color: active ? 'white' : 'var(--text-2)',
                    border: `1px solid ${active ? '#1a6fd4' : 'var(--border-1)'}`,
                  }}
                >
                  {c.label}
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    color: active ? 'rgba(255,255,255,0.85)' : '#1a6fd4',
                  }}>
                    {c.count}
                  </span>
                </button>
              );
            })}
            {shown.length === 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, padding: '6px 2px' }}>
                אין קטגוריה בשם הזה
              </span>
            )}
          </div>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <X size={11} /> נקה בחירת קטגוריות
            </button>
          )}
        </div>
      )}
    </div>
  );
}