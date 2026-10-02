import { format, isToday, isYesterday } from 'date-fns';
import { CheckCheck, ClipboardList } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { chatMessagePreview } from '@/lib/chatPreview';

/**
 * One conversation in the inbox.
 *
 * Reading order is deliberate: who → what was said last → which task.
 * Unread rows get a tinted surface and a heavier name; read rows stay quiet.
 * No cards, no boxes — a single hairline divider and spacing do the work.
 */
const GRADIENTS = [
  'linear-gradient(135deg,var(--brand-primary),#3b82f6)',
  'linear-gradient(135deg,#0ea5e9,#0284c7)',
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
];
const gradientFor = (id = '') => {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return GRADIENTS[sum % GRADIENTS.length];
};

function stamp(date, t) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return t('chat_yesterday');
  return format(d, 'd/M');
}

export default function ConversationRow({ conv, meId, t }) {
  const isMyTask = conv.task.client_id === meId;
  const name = conv.otherName
    || (isMyTask ? (conv.task.worker_name || t('chat_worker_default')) : (conv.task.client_name || t('chat_client_default')));
  const verified = isMyTask ? conv.task.worker_verified : conv.task.client_verified;
  const unread = conv.unread || 0;
  const last = conv.lastMsg;
  const fromMe = last?.sender_id === meId;

  return (
    <div
      className="chat-row-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: unread > 0 ? 'rgba(26,111,212,0.055)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        background: gradientFor(conv.otherId || name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, color: '#fff', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,40,107,0.14)',
      }}>
        {name.charAt(0)}
      </div>

      {/* Name → latest message → task */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{
            fontSize: 15,
            fontWeight: unread > 0 ? 800 : 650,
            color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          {verified && <VerifiedBadge size="sm" />}
          <span style={{ marginInlineStart: 'auto', fontSize: 11, color: unread > 0 ? 'var(--brand-primary)' : 'var(--text-3)', fontWeight: unread > 0 ? 700 : 500, flexShrink: 0 }}>
            {stamp(last?.created_date || conv.task.updated_date, t)}
          </span>
        </div>

        <div style={{
          fontSize: 13.5,
          color: unread > 0 ? 'var(--text-1)' : 'var(--text-2)',
          fontWeight: unread > 0 ? 600 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {fromMe && <CheckCheck size={13} color={last?.read ? '#3b82f6' : 'var(--text-3)'} style={{ flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {last ? chatMessagePreview(last.content, t) : t('chat_start_conv')}
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
          fontSize: 11.5, color: 'var(--text-3)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <ClipboardList size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.task.title}</span>
        </div>
      </div>

      {/* Unread count */}
      {unread > 0 && (
        <div className="j-badge-pop" style={{
          minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, flexShrink: 0,
          background: 'linear-gradient(135deg,var(--brand-primary),#3b82f6)',
          color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(26,111,212,0.35)',
        }}>
          {unread > 9 ? '9+' : unread}
        </div>
      )}
    </div>
  );
}