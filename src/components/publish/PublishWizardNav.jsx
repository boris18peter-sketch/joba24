import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

/**
 * PublishWizardNav — the one action bar of the slider form.
 *
 * ONE row: the way forward is the full-width primary button, and the way back
 * is a real button sitting beside it, in the same row.
 *
 * The way back used to be a plain grey line of text underneath, which read as a
 * caption rather than something you can press — and on the first step it was
 * there and did nothing at all. It is now a button with a border and an arrow,
 * in the row where actions live, and it is simply absent on the first step.
 *
 * On the LAST step it renders nothing: the publish button lives at the end of
 * that step's content and is the only action that finishes the form.
 *
 * When the step still needs something, the button stays disabled AND the bar
 * says what is missing — a greyed button with no reason is the fastest way to
 * make someone think the app is broken.
 */
export default function PublishWizardNav({ step, total, canNext, missing, isLast, onBack, onNext }) {
  if (isLast) return null;

  return (
    <div className="j-onb-foot" dir="rtl">
      {!canNext && missing && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
        }}>
          <AlertCircle size={13} color="var(--text-3)" />
          כדי להמשיך צריך: {missing}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {step > 0 && (
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה"
            style={{
              width: 54, height: 54, flexShrink: 0, cursor: 'pointer',
              borderRadius: 16,
              background: 'var(--surface-2)',
              border: '1.5px solid var(--border-2)',
              color: 'var(--text-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronRight size={22} strokeWidth={2.6} />
          </button>
        )}

        <button
          type="button"
          className="j-onb-cta"
          onClick={onNext}
          disabled={!canNext}
          style={{
            flex: 1,
            // A disabled CTA keeps its place so the bar never jumps, but stops
            // looking like the thing to press.
            background: canNext
              ? 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))'
              : 'var(--surface-3)',
            color: canNext ? 'var(--brand-btn-primary-text, #ffffff)' : 'var(--text-3)',
            boxShadow: canNext ? '0 8px 24px rgba(26,111,212,0.28)' : 'none',
            cursor: canNext ? 'pointer' : 'not-allowed',
          }}
        >
          {step === 0 ? 'בואו נתחיל' : 'לשלב הבא'} <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}