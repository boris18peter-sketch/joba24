import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, X } from 'lucide-react';
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
 * Asking for a rating and then thanking them is a conversation. Thanking them
 * and then asking is a transaction. This component exists so the thank-you
 * comes last, where it lands.
 *
 * It carries the same destination the completion notification used to: a worker
 * to their earnings, a publisher back to their task. That is why it replaced
 * that notification rather than being added next to it — one message, one
 * action, no second banner saying the same thing underneath.
 */
export default function TaskCompletedCongratsPopup({ task, role, onClose }) {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const handleContinue = () => {
    onClose?.();
    if (role === 'worker') navigate('/earnings');
    else if (task?.id) navigate(`/task/${task.id}`);
  };

  return createPortal(
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="j-modal-surface"
        style={{
          position: 'relative',
          width: '100%', maxWidth: 380,
          borderRadius: 26,
          padding: '26px 22px 20px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-xl)',
          animation: 'successPop 0.32s cubic-bezier(0.34,1.4,0.64,1) both',
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('close')}
          className="j-icon-btn"
          style={{
            position: 'absolute', top: 12, insetInlineEnd: 12,
            width: 30, height: 30, borderRadius: 10,
            background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} color="var(--text-3)" />
        </button>

        <div style={{
          width: 68, height: 68, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 26px rgba(16,185,129,0.32)',
        }}>
          <PartyPopper size={32} color="white" strokeWidth={1.9} />
        </div>

        <div className="j-modal-title" style={{ fontSize: 21, fontWeight: 900, letterSpacing: -0.4, marginBottom: 8 }}>
          {t('tcc_title')}
        </div>
        <div className="j-modal-text" style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 22 }}>
          {t('tcc_body')}
        </div>

        <button
          onClick={handleContinue}
          style={{
            width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--brand-modal-cta-bg, var(--brand-primary)), var(--brand-modal-cta-bg, var(--brand-primary-dark)))',
            color: 'var(--brand-modal-cta-text, #ffffff)',
            fontSize: 15.5, fontWeight: 900,
            boxShadow: '0 4px 16px rgba(26,111,212,0.3)',
          }}
        >
          {role === 'worker' ? t('tcc_cta_worker') : t('tcc_cta_client')}
        </button>
      </div>
    </div>,
    document.body
  );
}