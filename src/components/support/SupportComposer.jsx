import { useState, useRef } from 'react';
import { Send, Loader2, Image as ImageIcon, Mic, X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function SupportComposer({
  onSend, sending, uploading, onPickFile, fileInputRef,
  recording, recordSeconds, onStartRecording, onStopRecording, onCancelRecording,
}) {
  const { t, isRTL } = useLanguage();
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const submit = async () => {
    const text = value.trim();
    if (!text || sending) return;
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await onSend(text);
  };

  const busy = sending || uploading || recording;

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border-1)',
      padding: '10px 12px',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => onPickFile(e.target.files)}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        aria-label="attach"
        style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0,
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1,
        }}
      >
        {uploading ? <Loader2 size={17} className="animate-spin" color="#1a6fd4" /> : <ImageIcon size={17} color="#64748b" />}
      </button>

      {recording ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', borderRadius: 22, minHeight: 42,
          background: 'var(--color-danger-bg)', border: '1.5px solid var(--color-danger-border)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse-app 1.5s infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(recordSeconds)}
          </span>
          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{t('support_recording')}</span>
          <button
            onClick={onCancelRecording}
            style={{
              marginInlineStart: 'auto', background: 'none', border: 'none', color: 'var(--text-3)',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
              gap: 4, minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <X size={14} /> {t('support_cancel')}
          </button>
        </div>
      ) : (
        <div style={{
          flex: 1, background: 'var(--surface-3)', borderRadius: 22,
          border: '1.5px solid var(--border-1)', display: 'flex', alignItems: 'center',
          padding: '2px 8px 2px 14px', minHeight: 42,
        }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => {
              setValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={t('support_type_msg')}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              lineHeight: 1.5, resize: 'none', maxHeight: 120, overflowY: 'auto',
              padding: '10px 0', direction: isRTL ? 'rtl' : 'ltr', color: 'var(--text-1)',
            }}
          />
        </div>
      )}

      {recording ? (
        <button
          onClick={onStopRecording}
          aria-label="send recording"
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: '#dc2626', border: 'none', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
          }}
        >
          <Send size={16} color="white" />
        </button>
      ) : value.trim() ? (
        <button
          onClick={submit}
          disabled={sending}
          aria-label="send"
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(26,111,212,0.3)',
          }}
        >
          {sending ? <Loader2 size={16} className="animate-spin" color="white" /> : <Send size={16} color="white" />}
        </button>
      ) : (
        <button
          onClick={onStartRecording}
          disabled={busy}
          aria-label="record"
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1,
          }}
        >
          <Mic size={17} color="#64748b" />
        </button>
      )}
    </div>
  );
}