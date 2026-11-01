import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Send, ShieldCheck } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { calculateCurrentPrice, formatHourlySublabel } from '@/lib/priceCalculator';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The single "apply for task" popup used everywhere — the feed card and the
 * task-detail sheet both render exactly this component, so the experience is
 * identical no matter where the worker taps "apply".
 *
 * ── ONE DESIGN WITH THE TASK SHEET ──────────────────────────────────────────
 * This popup opens FROM the task detail sheet, so it is built from the same
 * pieces: the sheet's own page surface behind, one task card carrying the title
 * and the price row, one card for the message, then the sheet's own primary
 * action bar — with the commitment note underneath it, in the same green box
 * the sheet shows. Nothing here is a second, differently-shaped version of
 * something the sheet already renders.
 *
 * The popup owns the message + moderation UX; the actual submission is
 * delegated to `onApply(message, images)` so each caller keeps its own
 * post-apply cache/notification logic.
 */
export default function ApplySheet({ task, onClose, onApply, loading }) {
  const { t, isRTL } = useLanguage();
  const [message, setMessage] = useState('');
  const [msgBlocked, setMsgBlocked] = useState(false);
  const submittedRef = useRef(false);
  // The Joba cost of applying — the same figure the task detail sheet prints on
  // its own apply button, computed the same way.
  const jobaCost = Math.max(1, Math.round((calculateCurrentPrice(task) || 0) * 0.05));

  const handleSubmit = async () => {
    if (loading || submittedRef.current) return;
    if (message.trim().length > 3) {
      const { moderateText } = await import('@/hooks/useModeration');
      const mod = await moderateText(message.trim());
      if (mod.flagged) {
        setMsgBlocked(true);
        setTimeout(() => setMsgBlocked(false), 4000);
        return;
      }
    }
    submittedRef.current = true;
    try {
      await onApply(message.trim(), []);
    } finally {
      submittedRef.current = false;
    }
  };

  return createPortal(
    <div
      style={{
        // Above the task-detail sheet (1000000) — the apply popup is opened FROM
        // inside that sheet, so it must sit on top of it, not behind it.
        position: 'fixed', inset: 0, zIndex: 1000002,
        background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        animation: 'fadeInBackdrop 0.18s ease',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="j-modal-surface"
        onClick={e => e.stopPropagation()}
        style={{
          // The sheet's own surface + CTA contract, so the popup's buttons and
          // text resolve to exactly the same Brand tokens as the sheet behind it.
          background: 'var(--brand-modal-bg, var(--surface-1))',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0',
          '--brand-btn-primary-bg': 'var(--brand-modal-cta-bg)',
          '--brand-btn-primary-text': 'var(--brand-modal-cta-text)',
          width: '100%', maxWidth: 480,
          boxShadow: 'var(--shadow-xl)',
          padding: '12px 16px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '0 auto 18px' }} />

        {/* ── The task, in the sheet's own card ── */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: 14,
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.28, letterSpacing: -0.3 }}>
            {task?.title}
          </div>

          {/* The one number the screen is about — the sheet's price row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1, letterSpacing: -0.8, whiteSpace: 'nowrap' }}>
                ₪{Math.round(calculateCurrentPrice(task) || 0)}
              </span>
              {(() => { const sub = formatHourlySublabel(task); return sub ? <span style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 600 }}>{sub}</span> : null; })()}
            </div>
          </div>
        </div>

        {/* ── The message — one card, one field, like every input in the sheet ── */}
        <div style={{
          background: 'var(--brand-card-bg, var(--surface-2))',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xs)',
          padding: 14,
          marginTop: 10,
        }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.4, margin: '0 0 8px' }}>{t('add_message')}</p>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setMsgBlocked(false); }}
            placeholder={t('message_placeholder')}
            rows={3}
            style={{
              width: '100%',
              borderRadius: 'var(--brand-input-radius, var(--r-md))',
              border: `1px solid ${msgBlocked ? 'var(--color-danger-border)' : 'var(--brand-input-border, var(--border-1))'}`,
              padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: 'var(--text-1)',
              background: 'var(--brand-input-bg, var(--input-bg))',
              boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
          {msgBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 10, padding: '7px 10px' }}>
              <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>{t('message_blocked')}</span>
            </div>
          )}
        </div>

        {/* ── The submission — the sheet's own primary bar: one brand-coloured
            button with the paper plane, the label and the Joba cost pill. ── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={onClose}
            style={{
              height: 52, padding: '0 18px', borderRadius: 14, flexShrink: 0,
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >{t('cancel_btn')}</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
              border: 'none', fontSize: 15.5, fontWeight: 900,
              color: 'var(--brand-btn-primary-text, #ffffff)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 6px 18px rgba(26,111,212,0.26)',
              opacity: loading ? 0.75 : 1,
              transition: 'opacity 0.2s, transform 0.1s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <Send size={16} strokeWidth={2.2} />
                <span>{t('send_application')}</span>
                <span style={{ fontSize: 12, fontWeight: 800, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {jobaCost} <CreditIcon size={11} />
                </span>
              </>
            )}
          </button>
        </div>

        {/* ── The commitment — UNDER the button, in the sheet's own green box,
            worded once and shown identically in both places. ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          borderRadius: 12, padding: '10px 12px', marginTop: 10,
        }}>
          <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, lineHeight: 1.4 }}>
            {t('application_commitment_note')}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>,
    document.body
  );
}