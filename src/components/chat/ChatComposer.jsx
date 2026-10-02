import { Image, Loader2, Mic, Send, X } from 'lucide-react';

/**
 * Bottom composer — Attachment | Message input | Send.
 * Multiline input grows to a sensible maximum, stays compact when short, and
 * sits directly above the keyboard (positioning is owned by the chat shell).
 * Attachment / voice functionality is unchanged.
 */
export default function ChatComposer({
  value, onChange, onSend, onFileChange, inputRef, fileRef,
  recording, recordSeconds, uploading, uploadingVoice,
  onStartRecording, onStopRecording, onCancelRecording, formatTime,
  isRTL, t,
}) {
  const canSend = value.trim().length > 0;
  const busy = uploading || recording || uploadingVoice;

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border-1)',
      padding: '9px 10px',
      paddingBottom: 'max(9px, var(--safe-bottom, env(safe-area-inset-bottom)))',
      display: 'flex', alignItems: 'flex-end', gap: 7,
      flexShrink: 0,
    }}>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label="attachment"
        style={{
          width: 38, height: 38, minHeight: 0, minWidth: 0, borderRadius: 12, flexShrink: 0,
          background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {uploading ? <Loader2 size={16} color="var(--brand-btn-primary-bg, var(--brand-primary))" className="animate-spin" /> : <Image size={16} color="var(--text-2)" />}
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" style={{ display: 'none' }} onChange={onFileChange} />

      {recording ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 20, minHeight: 40,
          background: 'var(--color-danger-bg)', border: '1.5px solid var(--color-danger-border)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse-app 1.5s infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace' }}>{formatTime(recordSeconds)}</span>
          <button
            onClick={onCancelRecording}
            style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, minHeight: 0, minWidth: 0, padding: 4 }}
          >
            <X size={14} /> {t('chat_cancel')}
          </button>
        </div>
      ) : (
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          background: 'var(--surface-3)', borderRadius: 20,
          border: '1.5px solid var(--border-1)',
          paddingTop: 2, paddingBottom: 2,
          paddingInlineStart: 12, paddingInlineEnd: 8,
          transition: 'border-color 0.15s ease',
        }}>
          <textarea
            ref={inputRef}
            placeholder={t('chat_type_msg')}
            value={value}
            rows={1}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(value); }
            }}
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 16, lineHeight: 1.45, resize: 'none',
              maxHeight: 120, overflowY: 'auto', padding: '8px 0',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
        </div>
      )}

      {uploadingVoice ? (
        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={16} color="var(--brand-btn-primary-bg, var(--brand-primary))" className="animate-spin" />
        </div>
      ) : recording ? (
        <button
          onClick={onStopRecording}
          className="btn-tap"
          aria-label="send"
          style={{
            width: 40, height: 40, minHeight: 0, minWidth: 0, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
            background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
          }}
        >
          <Send size={16} color="var(--brand-btn-primary-text, white)" />
        </button>
      ) : canSend ? (
        <button
          onClick={() => onSend(value)}
          className="btn-tap"
          aria-label="send"
          style={{
            width: 40, height: 40, minHeight: 0, minWidth: 0, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary)))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(26,111,212,0.32)',
          }}
        >
          <Send size={16} color="var(--brand-btn-primary-text, white)" />
        </button>
      ) : (
        <button
          onClick={onStartRecording}
          disabled={uploading}
          aria-label="record"
          style={{
            width: 40, height: 40, minHeight: 0, minWidth: 0, borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Mic size={16} color="var(--text-2)" />
        </button>
      )}
    </div>
  );
}