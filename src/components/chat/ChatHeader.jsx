import BackButton from '@/components/BackButton';
import UserVerificationBadge from '@/components/UserVerificationBadge';

/**
 * Conversation header — compact, premium, native.
 *   ←   Avatar   Name + verification            Task context
 * The name is the strongest element; the task context sits under it so the user
 * always knows what the conversation is about.
 *
 * Both actions reuse navigation that already exists in the app (public profile
 * and the task sheet) — no new navigation logic.
 */
export default function ChatHeader({ name, photo, user, isOnline, task, isRTL, t, onOpenProfile, onOpenTask }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      borderBottom: '1px solid var(--border-1)',
      padding: 'max(10px, env(safe-area-inset-top)) 12px 10px',
      display: 'flex', alignItems: 'center', gap: 10,
      flexShrink: 0, zIndex: 40,
    }}>
      <BackButton />

      <button
        onClick={onOpenProfile}
        style={{ position: 'relative', width: 40, height: 40, padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, minHeight: 0, minWidth: 0 }}
        aria-label={name}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
          background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 16,
          boxShadow: '0 2px 8px rgba(15,40,107,0.16)',
        }}>
          {photo
            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{name?.[0] || '?'}</span>}
        </div>
        {isOnline && (
          <span style={{
            position: 'absolute', bottom: -1, insetInlineEnd: -1,
            width: 12, height: 12, borderRadius: '50%',
            background: '#22c55e', border: '2.5px solid var(--surface-2)',
          }} />
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          onClick={onOpenProfile}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', cursor: 'pointer', minHeight: 0, minWidth: 0, maxWidth: '100%' }}
        >
          <span style={{
            fontSize: 15.5, fontWeight: 800, color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          <UserVerificationBadge user={user} size="sm" />
        </button>

        {task?.title && (
          <button
            onClick={onOpenTask}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, padding: 0,
              border: 'none', background: 'none', cursor: 'pointer', minHeight: 0, minWidth: 0, maxWidth: '100%',
            }}
          >
            <span style={{
              fontSize: 11.5, color: 'var(--text-3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {t('chat_regarding')} <span style={{ color: '#1a6fd4', fontWeight: 600 }}>{task.title}</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}