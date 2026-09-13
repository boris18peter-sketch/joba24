import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, UserCheck, Loader2 } from 'lucide-react';

export default function AssignAgentModal({ agents, count, onAssign, onClose }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    return !q ||
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.agent_code?.toLowerCase().includes(q);
  });

  const handleAssign = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onAssign(selected.agent_code, selected.id);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '85dvh', overflow: 'auto', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>
            שיוך לסוכן {count != null && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>({count})</span>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--text-3)" />
          </button>
        </div>
        <div style={{ padding: '12px 16px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש סוכן..."
            autoFocus
            style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 32, paddingLeft: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)' }}
          />
        </div>
        <div style={{ padding: '0 16px 12px', maxHeight: '40dvh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)', fontSize: 13 }}>אין סוכנים</div>
          ) : (
            filtered.map(a => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                  background: selected?.id === a.id ? '#eff6ff' : 'var(--surface-1)',
                  border: `1.5px solid ${selected?.id === a.id ? '#1a6fd4' : 'var(--border-1)'}`,
                  cursor: 'pointer', textAlign: 'right',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                  {a.profile_photo ? <img src={a.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.full_name?.[0] || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name || a.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>קוד: {a.agent_code}</div>
                </div>
                {selected?.id === a.id && <UserCheck size={18} color="#1a6fd4" />}
              </button>
            ))
          )}
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={handleAssign}
            disabled={!selected || loading}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: selected ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
              color: selected ? 'white' : 'var(--text-3)',
              border: 'none', fontWeight: 800, fontSize: 15,
              cursor: selected && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : `שייך ${count != null ? count + ' משתמשים' : 'משתמש'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}