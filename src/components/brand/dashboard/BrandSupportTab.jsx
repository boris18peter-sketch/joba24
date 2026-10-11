import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { card } from '@/components/admin/brand/brandUi';

/**
 * Support conversations that happened on this Brand's surface.
 *
 * Read-only on purpose: support is ONE shared platform inbox, so replies stay
 * in the platform admin dashboard. This tab shows the Brand what its own users
 * asked about, grouped by person.
 */
export default function BrandSupportTab({ messages = [] }) {
  const [openUser, setOpenUser] = useState(null);

  const conversations = useMemo(() => {
    const byUser = new Map();
    for (const m of messages) {
      if (!byUser.has(m.user_id)) {
        byUser.set(m.user_id, { user_id: m.user_id, user_name: m.user_name || '', messages: [] });
      }
      byUser.get(m.user_id).messages.push(m);
    }
    return [...byUser.values()].map((c) => {
      const sorted = [...c.messages].sort(
        (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0),
      );
      return {
        ...c,
        messages: sorted,
        unread: sorted.filter((m) => m.sender_role === 'user' && !m.read).length,
      };
    });
  }, [messages]);

  if (conversations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎧</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>אין הודעות תמיכה</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          פניות של משתמשי המותג יופיעו כאן
        </div>
      </div>
    );
  }

  const active = conversations.find((c) => c.user_id === openUser);

  if (active) {
    return (
      <div>
        <button
          onClick={() => setOpenUser(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 12, padding: 0 }}
        >
          ← חזרה לרשימה
        </button>

        <div style={{ ...card, padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14,
          }}>
            {(active.user_name || '?')[0]}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 14 }}>
              {active.user_name || 'משתמש'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{active.messages.length} הודעות</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {active.messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_role === 'admin' ? 'flex-start' : 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '8px 12px',
                borderRadius: m.sender_role === 'admin' ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                background: m.sender_role === 'admin' ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-3)',
                color: m.sender_role === 'admin' ? 'white' : 'var(--text-1)',
                fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
              }}>
                {m.content}
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.6 }}>
                  {m.created_date ? format(new Date(m.created_date), 'dd/MM HH:mm') : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {conversations.map((c) => {
        const last = c.messages[c.messages.length - 1];
        return (
          <div
            key={c.user_id}
            onClick={() => setOpenUser(c.user_id)}
            style={{ ...card, padding: '12px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 14,
            }}>
              {(c.user_name || '?')[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 13 }}>
                  {c.user_name || 'משתמש'}
                </span>
                {c.unread > 0 && (
                  <span style={{ background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10 }}>
                    {c.unread}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {last?.sender_role === 'admin' ? 'צוות: ' : ''}{last?.content}
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>
              {last?.created_date ? format(new Date(last.created_date), 'dd/MM HH:mm') : ''}
            </div>
          </div>
        );
      })}
    </>
  );
}