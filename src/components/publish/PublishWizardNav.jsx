import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * PublishWizardNav — the bar under the slider form.
 *
 * It only ever moves between steps. Publishing stays where it has always been:
 * the same button at the end of the form, on the last step — so the slider adds
 * a way through the questions and changes nothing about the act of publishing.
 *
 * In RTL "next" travels left, which is why the arrows point as they do.
 */
export default function PublishWizardNav({ step, total, title, canNext, isLast, onBack, onNext }) {
  return (
    <div
      dir="rtl"
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px',
        paddingBottom: 'max(9px, env(safe-area-inset-bottom))',
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-1)',
        boxShadow: '0 -6px 20px rgba(15,40,107,0.06)',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={step === 0}
        style={{
          height: 44, minWidth: 84, padding: '0 14px', borderRadius: 13, cursor: step === 0 ? 'default' : 'pointer',
          background: 'var(--surface-3)', color: 'var(--text-2)',
          border: '1.5px solid var(--border-1)',
          fontSize: 14, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          opacity: step === 0 ? 0.4 : 1,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ChevronRight size={17} /> חזור
      </button>

      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.2 }}>
          שלב {step + 1} מתוך {total}
        </div>
        <div style={{
          fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        style={{
          height: 44, minWidth: 84, padding: '0 14px', borderRadius: 13,
          cursor: canNext ? 'pointer' : 'not-allowed',
          border: 'none',
          background: canNext
            ? 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))'
            : 'var(--surface-3)',
          color: canNext ? 'var(--brand-btn-primary-text, #ffffff)' : 'var(--text-3)',
          fontSize: 14, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          boxShadow: canNext ? '0 4px 14px rgba(26,111,212,0.28)' : 'none',
          // The last step's action is the publish button itself, so this one
          // stays in place (keeping the counter centred) but retires.
          ...(isLast ? { opacity: 0, pointerEvents: 'none' } : null),
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        הבא <ChevronLeft size={17} />
      </button>
    </div>
  );
}