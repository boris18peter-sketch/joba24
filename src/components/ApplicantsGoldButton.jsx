import { Users } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The publisher's "view applicants" control on their OWN task card.
 *
 * ── ONE CONTROL, ONE LOOK, ON BOTH SURFACES ─────────────────────────────────
 * The task-detail sheet and the task card used to draw this action differently:
 * the sheet showed a single amber bar reading "N מועמדויות · לחץ לצפייה ואישור",
 * the card showed a two-line gold button with a separate count chip beside it.
 * The card now renders the sheet's own bar — the same amber gradient, the same
 * 52px height, the same radius, the same people icon and the same sentence — so
 * a publisher recognises the action from either screen.
 *
 * It is its own component because TWO surfaces render it: the task card (live,
 * tappable) and the first-task-published flow, which shows the publisher what
 * the button will look like once applicants arrive. One definition means the
 * illustration can never drift from the real control.
 *
 * `inert` renders exactly the same control with no handler and out of the tab
 * order, for the illustration only.
 */
export default function ApplicantsGoldButton({ count = 0, onClick, scanning = null, inert = false, fullWidth = false }) {
  const { t } = useLanguage();
  const hasApplicants = count > 0;

  return (
    <button
      type="button"
      onClick={inert ? undefined : onClick}
      tabIndex={inert ? -1 : undefined}
      aria-hidden={inert || undefined}
      style={{
        // On the task card the button IS the action row's whole width, so it
        // lines up with the apply button every other card ends with.
        width: fullWidth ? '100%' : undefined,
        minHeight: hasApplicants ? 52 : 42,
        padding: '0 14px',
        borderRadius: hasApplicants ? 14 : 'var(--r-sm)',
        background: hasApplicants
          ? 'linear-gradient(135deg,#f59e0b,var(--color-warning))'
          : 'var(--brand-primary)',
        border: 'none', color: 'white',
        fontSize: hasApplicants ? 14 : 12,
        fontWeight: hasApplicants ? 900 : 700,
        cursor: inert ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: hasApplicants ? '0 4px 14px rgba(245,158,11,0.3)' : 'var(--shadow-sm)',
        WebkitTapHighlightColor: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {hasApplicants ? (
        <>
          <Users size={16} strokeWidth={2.2} />
          {count} {t('applications')} · {t('click_to_view_approve')}
        </>
      ) : scanning}
    </button>
  );
}