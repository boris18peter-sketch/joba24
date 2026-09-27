import { format } from 'date-fns';
import { Check, CheckCheck, RotateCcw, Loader2 } from 'lucide-react';
import ChatImageBubble from '@/components/chat/ChatImageBubble';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * One message in the thread: avatar, sender name, bubble, timestamp and the
 * delivery state. `_status` is set by useChatThread for locally-created
 * messages: 'sending' while in flight, 'failed' when the write was rejected.
 */
export default function ChatMessageRow({ msg, isMe, isContinuation, otherUserData, onRetry }) {
  const { t } = useLanguage();
  const isImage = msg.content?.startsWith('[img]');
  const isAudio = msg.content?.startsWith('[audio]');
  const imgUrl = isImage ? msg.content.replace('[img]', '') : null;
  const audioUrl = isAudio ? msg.content.replace('[audio]', '') : null;
  const failed = msg._status === 'failed';
  const sending = msg._status === 'sending';

  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: isContinuation ? 2 : 8, alignItems: 'flex-end', gap: 6 }}>
      {!isMe && !isContinuation && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginBottom: 2, color: 'white', fontWeight: 700, overflow: 'hidden' }}>
          {otherUserData?.profile_photo
            ? <img src={otherUserData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : msg.sender_name?.[0] || '?'}
        </div>
      )}
      {!isMe && isContinuation && <div style={{ width: 28, flexShrink: 0 }} />}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', opacity: sending ? 0.6 : 1 }}>
        {!isMe && !isContinuation && (
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 3, paddingRight: 4 }}>{msg.sender_name}</div>
        )}

        {isImage ? (
          <ChatImageBubble url={imgUrl} isMe={isMe} />
        ) : isAudio ? (
          <audio src={audioUrl} controls style={{ maxWidth: 220, height: 36, outline: 'none' }} />
        ) : (
          <div className="selectable-text" style={{
            padding: '9px 13px',
            borderRadius: isMe
              ? (isContinuation ? '14px 14px 14px 4px' : '18px 18px 18px 4px')
              : (isContinuation ? '14px 14px 4px 14px' : '18px 18px 4px 18px'),
            background: isMe ? '#1e293b' : 'var(--surface-2)',
            color: isMe ? 'white' : 'var(--text-1)',
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: isMe ? 'none' : '0 1px 4px rgba(0,0,0,0.07)',
            border: isMe ? 'none' : '1px solid var(--border-1)',
            wordBreak: 'break-word',
          }}>
            {msg.content}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, paddingRight: 4 }}>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
          </span>
          {isMe && (sending
            ? <Loader2 size={11} color="#94a3b8" className="animate-spin" />
            : failed
              ? null
              : (msg.read ? <CheckCheck size={12} color="#3b82f6" /> : <Check size={12} color="#94a3b8" />))}
        </div>

        {isMe && failed && (
          <button
            onClick={() => onRetry?.(msg)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 11, fontWeight: 700 }}
          >
            <RotateCcw size={11} /> {t('chat_send_failed')} · {t('chat_retry')}
          </button>
        )}
      </div>
    </div>
  );
}