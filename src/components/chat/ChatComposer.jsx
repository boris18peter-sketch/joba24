import { Camera, Image as ImageIcon, Loader2, Mic, Send, X } from 'lucide-react';

/**
 * Bottom composer — Camera | Attachment | Message input | Send.
 *
 * ── ONE COMPONENT FOR EVERY CONVERSATION ────────────────────────────────────
 * The task chat and the support chat render THIS component, so the field, the
 * buttons around it and their geometry cannot drift apart again. Support used to
 * have its own composer, which is why it looked like a different product.
 *
 * ── EVERY CONTROL IS EXACTLY THE SAME HEIGHT ────────────────────────────────
 * `CONTROL` is the one measurement: the field at rest and all square controls
 * are that exact height, with the same radius. Buttons used to be 38px beside a
 * 43px field, so the row read as slightly crooked at every size. When the field
 * grows (a long message) the controls stay pinned to its bottom edge instead of
 * floating in the middle.
 *
 * ── THE CAMERA ──────────────────────────────────────────────────────────────
 * Android's WebView only offers "take a photo" when the file input carries the
 * `capture` attribute — without it the chooser is gallery-only, which is exactly
 * the "I can't take a picture, only pick one that already exists" report. So the
 * camera gets its own input with `capture="environment"`, and the existing input
 * (gallery, video, PDF) is left exactly as it was. On a desktop browser the
 * camera button is hidden: there is nothing to capture with.
 *
 * Attachment / voice functionality is unchanged.
 */
const CONTROL = 40;

function hasCamera() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints || 0) > 1;
}

const squareButton = (extra = {}) => ({
  width: CONTROL, height: CONTROL, minHeight: 0, minWidth: 0,
  borderRadius: 12, flexShrink: 0, boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  ...extra,
});

export default function ChatComposer({
  value, onChange, onSend, onFileChange, onCameraChange, inputRef, fileRef, cameraRef,
  recording, recordSeconds, uploading, uploadingVoice, sending = false,
  onStartRecording, onStopRecording, onCancelRecording, formatTime,
  isRTL, t,
}) {
  const canSend = value.trim().length > 0;
  const busy = uploading || recording || uploadingVoice || sending;
  const showCamera = hasCamera();

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border-1)',
      padding: '9px 10px',
      paddingBottom: 'max(9px, var(--safe-bottom, env(safe-area-inset-bottom)))',
      display: 'flex', alignItems: 'flex-end', gap: 7,
      flexShrink: 0,
    }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,.pdf"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      {showCamera && (
        <>
          {/* `capture` is what makes Android open the camera instead of the
              gallery — see the note at the top of this file. */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onCameraChange || onFileChange}
          />
          <button
            type="button"
            onClick={() => cameraRef?.current?.click()}
            disabled={busy}
            aria-label={t('chat_take_photo')}
            style={squareButton({
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1,
            })}
          >
            <Camera size={17} color="var(--text-2)" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label="attachment"
        style={squareButton({
          background: 'var(--surface-3)', border: '1px solid var(--border-1)',
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1,
        })}
      >
        {uploading ? <Loader2 size={17} color="var(--brand-btn-primary-bg, var(--brand-primary))" className="animate-spin" /> : <ImageIcon size={17} color="var(--text-2)" />}
      </button>

      {recording ? (
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', borderRadius: 12, height: CONTROL, boxSizing: 'border-box',
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
          background: 'var(--surface-3)', borderRadius: 12, boxSizing: 'border-box',
          border: '1.5px solid var(--border-1)', minHeight: CONTROL,
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
              // 21px line + 8px top and bottom = 37px, so the field's outer box is
              // exactly CONTROL at rest — the same as every button beside it.
              fontSize: 16, lineHeight: '21px', resize: 'none',
              maxHeight: 120, overflowY: 'auto', padding: '8px 0',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
        </div>
      )}

      {uploadingVoice ? (
        <div style={squareButton({ background: 'var(--surface-3)', border: '1px solid var(--border-1)' })}>
          <Loader2 size={17} color="var(--brand-btn-primary-bg, var(--brand-primary))" className="animate-spin" />
        </div>
      ) : recording ? (
        <button
          onClick={onStopRecording}
          className="btn-tap"
          aria-label="send"
          style={squareButton({
            border: 'none', cursor: 'pointer', background: '#dc2626',
            boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
          })}
        >
          <Send size={17} color="var(--brand-btn-primary-text, white)" />
        </button>
      ) : canSend ? (
        <button
          onClick={() => onSend(value)}
          disabled={sending}
          className="btn-tap"
          aria-label="send"
          style={squareButton({
            border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary)))',
            boxShadow: '0 4px 12px rgba(26,111,212,0.32)',
          })}
        >
          {sending ? <Loader2 size={17} color="var(--brand-btn-primary-text, white)" className="animate-spin" /> : <Send size={17} color="var(--brand-btn-primary-text, white)" />}
        </button>
      ) : (
        <button
          onClick={onStartRecording}
          disabled={busy}
          aria-label="record"
          style={squareButton({
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.55 : 1,
          })}
        >
          <Mic size={17} color="var(--text-2)" />
        </button>
      )}
    </div>
  );
}