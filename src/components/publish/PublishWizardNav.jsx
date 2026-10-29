import { ChevronLeft, AlertCircle } from 'lucide-react';

/**
 * PublishWizardNav — the one action bar of the slider form.
 *
 * The same shape as the Welcome flow's footer: one full-width primary button
 * and a quiet way back underneath it. Two equal buttons side by side made the
 * eye choose on every step; here the way forward is unambiguous and the way
 * back is there without competing for the tap.
 *
 * On the LAST step it renders nothing at all: the publish button lives at the
 * end of that step's content and is the only action that finishes the form.
 * Keeping a second "next" there would have meant two buttons that do almost,
 * but not exactly, the same thing.
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

      <button
        type="button"
        className="j-onb-cta"
        onClick={onNext}
        disabled={!canNext}
        style={{
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

      {step > 0 && (
        <button type="button" className="j-onb-switch" onClick={onBack}>
          חזרה לשלב הקודם
        </button>
      )}
    </div>
  );
}