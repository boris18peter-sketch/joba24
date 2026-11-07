import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, Check, ChevronLeft } from 'lucide-react';
import PopupClose from '@/components/ui/PopupClose';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * TaskCompletedCongratsPopup — the warm closing note of the completion flow.
 *
 * ── WHERE IT SITS IN THE SEQUENCE ───────────────────────────────────────────
 * Completion is three moments, in this order, and the order is the point:
 *
 *   1. the task card shows the ✓ — the FACT, on the thing the user was
 *      looking at, before anything takes over the screen;
 *   2. the rating sheet — the ASK, given while the job is still fresh;
 *   3. this — the THANKS, once the ask is behind them.
 *
 * ── WHY IT IS A BOTTOM SHEET ────────────────────────────────────────────────
 * It used to be a small card floating in the middle of the screen, sharing no
 * geometry with anything else in the app. It is now the same sheet as every
 * other popup here: it rises from the bottom, carries the same drag handle and
 * the same close button, and follows the same surface tokens — so it reads as
 * part of the product rather than as a browser dialog.
 *
 * ── ONE POPUP, TWO PEOPLE ───────────────────────────────────────────────────
 * Both sides of the job see it, and neither is told the other's news: a worker
 * is congratulated and sent to their earnings; a publisher is told the job is
 * done and simply closes the note. Its copy is role-aware for exactly that
 * reason, and the keys are their own (never shared with the cancel sheet, which
 * is where the wrong title came from).
 */
export default function TaskCompletedCongratsPopup({ task, role, onClose }) {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const isWorker = role === 'worker';

  const handleContinue = () => {
    onClose?.();
    // Only the worker has somewhere to go. The publisher's button is a plain
    // acknowledgement, so it closes the sheet and leaves them where they were.
    if (isWorker) navigate('/earnings');
  };

  return createPortal(
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="j-modal-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 480,
          maxHeight: '90dvh', overflowY: 'auto',
          overscrollBehavior: 'contain',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          padding: '12px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-xl)',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
        }}
      >
        <div className="j-sheet-handle" style={{ margin: '0 auto 18px' }} />

        <PopupClose onClick={onClose} label={t('close')} />

        {/* Icon — the same green circle the completion uses everywhere else */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4, marginBottom: 16 }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'linear-gradient(135deg,#10b981,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 26px rgba(16,185,129,0.32)',
          }}>
            {isWorker
              ? <PartyPopper size={34} color="white" strokeWidth={1.9} />
              : <Check size={38} color="white" strokeWidth={2.6} />}
          </div>
        </div>

        {/* The headline, and nothing under it: the sheet already said what
            happened on the card the user was looking at, so a paragraph here
            only repeated it. */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="j-modal-title" style={{ fontSize: 21, fontWeight: 900, letterSpacing: -0.4 }}>
            {isWorker ? t('completion_worker_title') : t('completion_client_title')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleContinue}
            style={{
              flex: 1,
              height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
              background: isWorker
                ? 'linear-gradient(135deg, var(--brand-modal-cta-bg, var(--brand-primary)), var(--brand-modal-cta-bg, var(--brand-primary-dark)))'
                : 'var(--surface-3)',
              color: isWorker ? 'var(--brand-modal-cta-text, #ffffff)' : 'var(--text-1)',
              fontSize: 15.5, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isWorker ? '0 4px 16px rgba(26,111,212,0.3)' : 'none',
            }}
          >
            {isWorker
              ? <>{t('completion_worker_cta')} <ChevronLeft size={17} strokeWidth={2.4} /></>
              : <><Check size={17} strokeWidth={2.6} /> {t('completion_client_cta')}</>}
          </button>

          {/* ── AND THE WAY OUT, BESIDE IT ────────────────────────────────────
              The earnings dashboard is an offer, not the only thing a worker can
              want right after a job. Until now the single button was the only
              path out of this note, so someone who simply wanted to close it had
              to go to a screen they had not asked for. A plain second button
              keeps the primary CTA the obvious one and makes "not now" a real,
              one-tap answer. Colour and weight are deliberately quieter than the
              CTA, so nothing competes with it. */}
          {isWorker && (
            <button
              onClick={() => onClose?.()}
              style={{
                flexShrink: 0,
                paddingInline: 18,
                height: 52, borderRadius: 16, cursor: 'pointer',
                background: 'var(--surface-3)',
                border: '1px solid var(--border-1)',
                color: 'var(--text-2)',
                fontSize: 14.5, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {t('completion_worker_skip')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}