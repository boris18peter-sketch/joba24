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
          background: 'var(--sheet-bg)',
          border: '1px solid var(--brand-modal-border, var(--border-1))',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: 'var(--shadow-xl)',
          padding: '12px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 18px' }} />

        {/* Task + commitment header */}
        <div style={{ background: 'linear-gradient(135deg, var(--brand-modal-title, #0f2b6b), var(--brand-modal-cta-bg, var(--brand-primary)))', borderRadius: 16, padding: '14px 16px', marginBottom: 16, color: 'var(--brand-modal-cta-text, white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            <span>{t('application_fee')}</span>
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
              {jobaCost} <CreditIcon size={12} /> {t('credits')}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 2 }}>{task?.title}</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>₪{Math.round(calculateCurrentPrice(task) || 0)}</div>
          {(() => { const sub = formatHourlySublabel(task); return sub ? <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{sub}</div> : null; })()}
        </div>

        {/* Commitment reassurance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
          <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.4 }}>
            {t('application_commitment_note')}
          </span>
        </div>

        {/* Message */}
        <div style={{ background: 'var(--brand-primary-light)', borderRadius: 16, padding: 14, border: '1px solid var(--border-2)', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-modal-title, #0f2b6b)', margin: '0 0 8px' }}>{t('add_message')}</p>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setMsgBlocked(false); }}
            placeholder={t('message_placeholder')}
            rows={3}
            style={{
              width: '100%', borderRadius: 10, border: `1px solid ${msgBlocked ? '#fca5a5' : 'var(--border-2)'}`,
              padding: '10px 12px', fontSize: 16, fontFamily: 'inherit', resize: 'none',
              outline: 'none', color: '#1a2540', background: 'white', boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          {msgBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>🛡️</span>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{t('message_blocked')}</span>
            </div>
          )}
        </div>

        {/* Actions — the SAME submission button the task detail sheet uses:
            one brand-coloured bar with the paper plane, the label and the Joba
            cost pill. It used to be a second, differently-shaped button, so the
            same action looked like two different actions. */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ height: 52, padding: '0 18px', borderRadius: 14, background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-2)', fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}
          >{t('cancel_btn')}</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 52, borderRadius: 14,
              background: 'var(--brand-btn-primary-bg, var(--brand-primary))',
              border: 'none', fontSize: 15.5, fontWeight: 900,
              color: 'var(--brand-modal-cta-text, #ffffff)',
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
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>,
    document.body
  );
}