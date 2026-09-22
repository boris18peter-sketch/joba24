import { useLanguage } from '@/lib/LanguageContext';

const AUDIO_RE = /voice_message|\.(webm|mp3|wav|m4a|ogg|oga)$/i;
const VIDEO_RE = /\.(mp4|mov|avi|mkv)$/i;

function MessageMedia({ url }) {
  if (AUDIO_RE.test(url)) {
    return <audio src={url} controls style={{ width: 210, height: 38, outline: 'none' }} />;
  }
  if (VIDEO_RE.test(url)) {
    return <video src={url} controls style={{ width: 200, borderRadius: 12, display: 'block' }} />;
  }
  return (
    <img
      src={url}
      alt=""
      onClick={() => window.open(url, '_blank')}
      style={{ maxWidth: 200, borderRadius: 12, cursor: 'pointer', display: 'block' }}
    />
  );
}

export default function SupportMessageBubble({ msg }) {
  const { isRTL } = useLanguage();
  const isUser = msg.sender_role === 'user';
  const time = msg.created_date
    ? new Date(msg.created_date).toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
          background: isUser ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : 'var(--surface-2)',
          color: isUser ? 'white' : 'var(--text-1)',
          fontSize: 14.5,
          lineHeight: 1.55,
          wordBreak: 'break-word',
          border: isUser ? 'none' : '1px solid var(--border-1)',
          boxShadow: isUser ? '0 3px 12px rgba(26,111,212,0.22)' : 'var(--shadow-xs)',
        }}>
          {msg.content && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>}
          {msg.media_urls?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: msg.content ? 8 : 0 }}>
              {msg.media_urls.map((url, i) => <MessageMedia key={i} url={url} />)}
            </div>
          )}
        </div>
        {time && (
          <span style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>
            {time}
          </span>
        )}
      </div>
    </div>
  );
}