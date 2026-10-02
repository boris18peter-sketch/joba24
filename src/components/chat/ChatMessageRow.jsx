import { format } from 'date-fns';
import { Check, CheckCheck, RotateCcw } from 'lucide-react';
import ChatImageBubble from '@/components/chat/ChatImageBubble';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * One message in the thread.
 *
 * Consecutive messages from the same sender group together: the avatar, the
 * sender name and the meta row appear only on the last bubble of the group,
 * and the tail corner is rounded only there. `_status` is set by
 * useChatThread — 'sending' while in flight, 'failed' when the write was
 * rejected (the bubble stays put so nothing the user wrote is lost).
 */
const RECENT_MS = 5000; // only freshly-arrived messages animate in

export default function ChatMessageRow({ msg, isMe, isContinuation, isLastInGroup, otherUserData, onRetry }) {
  const { t, isRTL } = useLanguage();
  const isImage = msg.content?.startsWith('[img]');
  const isAudio = msg.content?.startsWith('[audio]');
  const imgUrl = isImage ? msg.content.replace('[img]', '') : null;
  const audioUrl = isAudio ? msg.content.replace('[audio]', '') : null;
  const failed = msg._status === 'failed';
  const sending = msg._status === 'sending';
  const isNew = msg.created_date ? Date.now() - new Date(msg.created_date).getTime() < RECENT_MS : false;

  // The tail corner sits on the outer bottom edge, so it flips with direction.
  const tail = isRTL
    ? (isMe ? '6px 18px 18px 18px' : '18px 6px 18px 18px')
    : (isMe ? '18px 18px 6px 18px' : '18px 18px 18px 6px');

  return (
    <div
      className={isNew ? 'chat-msg-in' : undefined}
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 6,
        marginBottom: isLastInGroup ? 12 : 2,
      }}
    >
      {!isMe && !isLastInGroup && <div style={{ width: 28, flexShrink: 0 }} />}
      {!isMe && isLastInGroup && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, #3b82f6))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden',
        }}>
          {otherUserData?.profile_photo
            ? <img src={otherUserData.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : msg.sender_name?.[0] || '?'}
        </div>
      )}

      <div style={{
        maxWidth: '76%',
        display: 'flex', flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        opacity: sending ? 0.55 : 1,
        transition: 'opacity 0.15s ease',
      }}>
        {!isMe && !isContinuation && (
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, marginBottom: 4, paddingInline: 4 }}>
            {msg.sender_name}
          </div>
        )}

        {isImage ? (
          <ChatImageBubble url={imgUrl} isMe={isMe} />
        ) : isAudio ? (
          <audio src={audioUrl} controls style={{ maxWidth: 220, height: 36, outline: 'none' }} />
        ) : (
          <div
            className="selectable-text"
            style={{
              padding: '9px 14px',
              borderRadius: tail,
              background: isMe ? 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, #3b82f6))' : 'var(--surface-2)',
              color: isMe ? '#fff' : 'var(--text-1)',
              fontSize: 14.5,
              lineHeight: 1.5,
              boxShadow: isMe ? 'none' : '0 1px 3px rgba(15,40,107,0.06)',
              border: failed ? '1.5px solid #fca5a5' : (isMe ? 'none' : '1px solid var(--border-1)'),
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        )}

        {/* Meta — timestamp + delivery state, only on the last bubble of a group */}
        {isLastInGroup && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3, marginTop: 3,
            paddingInline: 4,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
            </span>
            {isMe && !failed && (
              sending
                ? <Check size={12} color="var(--text-3)" />
                : (msg.read ? <CheckCheck size={12} color="var(--brand-btn-primary-bg, #3b82f6)" /> : <Check size={12} color="var(--text-3)" />)
            )}
          </div>
        )}

        {isMe && failed && isLastInGroup && (
          <button
            onClick={() => onRetry?.(msg)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              marginTop: 5, padding: '5px 11px', minHeight: 0,
              borderRadius: 999, cursor: 'pointer',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)', fontSize: 11.5, fontWeight: 700,
            }}
          >
            <RotateCcw size={12} /> {t('chat_retry')}
          </button>
        )}
      </div>
    </div>
  );
}