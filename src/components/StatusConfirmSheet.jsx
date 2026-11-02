import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * StatusConfirmSheet — the ONE confirmation sheet for a task step.
 *
 * This is the sheet the app already shows when a worker taps "יצאתי לדרך" (or
 * "הגעתי" / "סיימתי") on the active task card, lifted out of ActiveTaskBanner
 * verbatim: drag handle, the step's emoji, its title, one line of explanation,
 * one primary action and a quiet cancel.
 *
 * It exists so the popups that open BY THEMSELVES (the worker was approved → the
 * departure step; the worker finished → the publisher approves it) are the exact
 * sheet the user already knows, instead of a second design of the same thing.
 * Anything either sheet needs to show (the task, the proof photos) is passed as
 * `children` and sits inside this same surface.
 */
export default function StatusConfirmSheet({
  emoji,
  title,
  sub,
  confirmLabel,
  confirmColor = 'var(--brand-primary)',
  onConfirm,
  onCancel,
  loading = false,
  children,
}) {
  const { t, isRTL } = useLanguage();

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000000,
        background: 'rgba(5,15,40,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'sheetFadeIn 0.2s ease both',
      }}
      onClick={onCancel}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--brand-modal-bg, white)',
          borderRadius: 'var(--brand-modal-radius, 24px) var(--brand-modal-radius, 24px) 0 0',
          width: '100%', maxWidth: 480,
          padding: '20px 20px max(40px, calc(env(safe-area-inset-bottom) + 24px))',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.32,1.2,0.64,1)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1, #dde4ef)', margin: '0 auto 20px' }} />

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {emoji && <div style={{ fontSize: 36, marginBottom: 8 }}>{emoji}</div>}
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>
            {title}
          </div>
          {sub && (
            <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {sub}
            </div>
          )}
        </div>

        {children}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              width: '100%', height: 52, borderRadius: 16,
              background: confirmColor, border: 'none', color: 'white',
              fontWeight: 900, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              opacity: loading ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            style={{
              width: '100%', height: 44, borderRadius: 14,
              background: 'var(--surface-3, #f1f5f9)', border: 'none',
              color: 'var(--text-2)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t('later_btn') || t('cancel_btn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}